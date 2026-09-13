'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { travels, watchFlow } from './flow';
gsap.registerPlugin(ScrollTrigger);
export function SectionCurve() {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    let context: gsap.Context | undefined;
    const arm = () => {
      context?.revert();
      if (!travels() || !ref.current) return;
      context = gsap.context(() => {
        gsap.to(ref.current, {
          attr: { d: 'M0 12 Q50 10 100 12 Z' },
          ease: 'none',
          scrollTrigger: {
            trigger: ref.current?.closest('footer'),
            start: 'top bottom',
            end: 'top 35%',
            scrub: 1,
          },
        });
      });
    };
    arm();
    const stop = watchFlow(arm);
    return () => {
      stop();
      context?.revert();
    };
  }, []);
  return (
    <svg
      className="section-curve"
      viewBox="0 0 100 12"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path ref={ref} d="M0 12 Q50 -10 100 12 Z" />
    </svg>
  );
}
