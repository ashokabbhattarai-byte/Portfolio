'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { revealLines, travels, watchFlow } from './flow';
gsap.registerPlugin(ScrollTrigger);
export function Reveal({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let context: gsap.Context | undefined;
    const arm = () => {
      context?.revert();
      context = gsap.context(() => {
        const node = ref.current;
        if (!node) return;
        const full = travels();
        const heading = node.querySelector('h2, h3');
        /* Large lines climb out of a clip; supporting copy just settles in
           behind them. Both hang off one trigger so they stay in step. */
        ScrollTrigger.create({
          trigger: node,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            if (heading) revealLines(heading);
            gsap.from(node.querySelectorAll(':scope > :not(h2):not(h3)'), {
              y: full ? 28 : 0,
              opacity: 0,
              duration: full ? 0.9 : 0.45,
              stagger: full ? 0.08 : 0.04,
              delay: heading ? 0.12 : 0,
              ease: full ? 'rise' : 'none',
            });
          },
        });
      }, ref);
    };
    /* Arming behind the curtain would burn a `once` trigger on a section the
       visitor cannot see yet — short viewports lose the reveal entirely. */
    window.addEventListener('portfolio:ready', arm);
    const stop = watchFlow(arm);
    if (document.documentElement.dataset.motion === 'ready') arm();
    return () => {
      window.removeEventListener('portfolio:ready', arm);
      stop();
      context?.revert();
    };
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
