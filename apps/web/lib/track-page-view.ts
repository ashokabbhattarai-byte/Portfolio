import type { TrackPageView } from '@portfolio/types';

export type TrackResult = {
  ok?: boolean;
  recorded?: boolean;
  path?: string;
  views?: number;
};
export class TrackingError extends Error {
  constructor(public readonly retryable: boolean) {
    super('Tracking unavailable');
  }
}
const pending = new Map<string, Promise<TrackResult>>();
const recent = new Map<string, { at: number; result: TrackResult }>();
const cooldown = 10_000;

/** Coalesce rapid remounts/reloads; database uniqueness remains authoritative. */
export function recordPageView(payload: TrackPageView): Promise<TrackResult> {
  const key = `portfolio-view:${payload.visitorId ?? 'unknown'}:${payload.path}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const send = async () => {
    let previous = recent.get(key);
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) previous = JSON.parse(stored);
    } catch {
      /* Storage is optional. */
    }
    const age = previous ? Date.now() - previous.at : Infinity;
    if (previous && age >= 0 && age < cooldown) return previous.result;
    let response: Response;
    try {
      response = await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
        keepalive: true,
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      throw new TrackingError(true);
    }
    // Never immediately retry a 429; the next real navigation can try again.
    if (!response.ok) throw new TrackingError(response.status >= 500);
    const result: TrackResult = await response.json();
    const entry = { at: Date.now(), result };
    if (recent.size >= 100) recent.delete(recent.keys().next().value!);
    recent.set(key, entry);
    try {
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      /* Optional. */
    }
    return result;
  };
  const request = send().finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}
