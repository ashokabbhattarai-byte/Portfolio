'use client';

import { useEffect, useRef } from 'react';
import { Easing, interpolate } from 'remotion';

/**
 * Fixed 2px lime reading-progress bar for article pages.
 * Mirrors the stats-count pattern: Remotion `interpolate` +
 * `Easing.bezier(0.16, 1, 0.3, 1)` drives the fill from scroll position.
 * Reduced motion / calm flow skips easing and sets the raw value directly.
 */
export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const calm = document.documentElement.dataset.flow === 'calm';
    const direct = reduce || calm;
    let raf = 0;
    let queued = false;

    const render = () => {
      queued = false;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const raw =
        scrollable > 0
          ? Math.min(1, Math.max(0, window.scrollY / scrollable))
          : 0;
      const eased = direct
        ? raw
        : interpolate(raw, [0, 1], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
      node.style.transform = `scaleX(${eased})`;
    };
    const schedule = () => {
      if (queued) return;
      queued = true;
      raf = requestAnimationFrame(render);
    };

    render();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      <div
        ref={ref}
        style={{
          height: '100%',
          width: '100%',
          background:
            'linear-gradient(90deg, #527747, #a8bf82 60%, #c7dca8)',
          transform: 'scaleX(0)',
          transformOrigin: 'left',
        }}
      />
    </div>
  );
}
