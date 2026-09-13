'use client';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { TrackPageView } from '@portfolio/types';

import { visitorId } from '@/lib/visitor-identity';
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
      visitorId: visitorId(),
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
        const response = await fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
          keepalive: true,
        });
        if (!response.ok) {
          if (response.status >= 500 || response.status === 429)
            throw new Error('Retry tracking');
          return;
        }
        void qc.invalidateQueries({ queryKey: ['public-views', canonical] });
        void qc.invalidateQueries({ queryKey: ['blog-counts'] });
      } catch {
        if (!stopped && attempt < 2)
          timer = setTimeout(
            () => void send(attempt + 1),
            1000 * (attempt + 1),
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
