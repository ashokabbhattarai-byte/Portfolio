'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { revealLines, travels, watchFlow } from './flow';
export function PageEntrance() {
  const pathname = usePathname();
  useEffect(() => {
    let context: gsap.Context | undefined;
    const enter = () => {
      context?.revert();
      const heading = document.querySelector('.page-heading');
      if (!heading) return;
      context = gsap.context(() => {
        const full = travels();
        const title = heading.querySelector('h1');
        if (title) revealLines(title, { stagger: 0.11 });
        gsap.from(heading.querySelectorAll(':scope > :not(h1)'), {
          y: full ? 32 : 0,
          opacity: 0,
          stagger: full ? 0.075 : 0.045,
          duration: full ? 0.85 : 0.4,
          delay: title ? 0.16 : 0,
          ease: full ? 'rise' : 'none',
          clearProps: 'all',
        });
      }, heading);
    };
    window.addEventListener('portfolio:ready', enter);
    const stop = watchFlow(enter);
    return () => {
      window.removeEventListener('portfolio:ready', enter);
      stop();
      context?.revert();
    };
  }, [pathname]);
  return null;
}
