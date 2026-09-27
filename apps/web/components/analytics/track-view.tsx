'use client';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TrackPageView } from '@portfolio/types';

import { recordPageView, TrackingError } from '@/lib/track-page-view';
import { updateEngagementCache } from '@/lib/engagement-queries';
import { trackingVisitorId } from '@/lib/visitor-identity';
let previousPath: string | undefined;
export function TrackView({
  path,
}: {
  path: string;
  blogId?: string | null;
  projectId?: string | null;
}) {
  const visit = useRef<{ path: string; eventId: string } | null>(null);
  const qc = useQueryClient();
  const canonical = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  useEffect(() => {
    if (
      navigator.doNotTrack === '1' ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl
    )
      return;
    if (visit.current?.path !== canonical)
      visit.current = { path: canonical, eventId: crypto.randomUUID() };
    const payload: TrackPageView = {
      path: canonical,
      eventId: visit.current.eventId,
      referer: previousPath
        ? `${location.origin}${previousPath}`
        : document.referrer || null,
    };
    let stopped = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout>;
    async function send(attempt = 0) {
      if (stopped) return;
      if (attempt === 0) previousPath = canonical;
      try {
        payload.visitorId ??= await trackingVisitorId();
        if (stopped) return;
        const result = await recordPageView(payload);
        if (result.path && typeof result.views === 'number')
          await updateEngagementCache(qc, {
            path: result.path,
            views: result.views,
          });
      } catch (error) {
        if (
          !stopped &&
          attempt < 2 &&
          error instanceof TrackingError &&
          error.retryable
        )
          timer = setTimeout(
            () => void send(attempt + 1),
            2000 * 2 ** attempt + Math.random() * 1000,
          );
      }
    }
    function visible() {
      if (document.visibilityState !== 'visible' || started) return;
      started = true;

      // Deferring makes Strict Mode's setup/cleanup cycle harmless.
      timer = setTimeout(() => void send(), 0);
    }
    visible();
    document.addEventListener('visibilitychange', visible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [canonical, qc]);
  return null;
}
