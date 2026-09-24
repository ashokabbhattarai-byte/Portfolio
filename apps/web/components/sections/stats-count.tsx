'use client';

import { useEffect, useRef } from 'react';
import { Easing, interpolate } from 'remotion';

/**
 * Remotion-driven count-up for the stats band.
 * Uses Remotion `interpolate` + `Easing.bezier(0.16,1,0.3,1)` — the same
 * Premium motion language as the CraftFilm compositions — driven by
 * IntersectionObserver so each figure counts once when scrolled into view.
 * Reduced motion / calm flow renders the final value with no animation.
 */
export function StatsCount({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const calm = document.documentElement.dataset.flow === 'calm';
    if (reduce || calm || value <= 0) {
      node.textContent = String(value);
      return;
    }
    let raf = 0;
    let started = false;
    const run = () => {
      const t0 = performance.now();
      const duration = 1400;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - t0) / duration);
        const eased = interpolate(progress, [0, 1], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        node.textContent = String(
          Math.round(interpolate(eased, [0, 1], [0, value])),
        );
        if (progress < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          // Re-enter from below restarts the count for a live feel.
          run();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [value]);

  return (
    <span ref={ref} data-stat-num={value} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </span>
  );
}
