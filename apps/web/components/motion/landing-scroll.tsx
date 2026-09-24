'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { travels, watchFlow } from './flow';

gsap.registerPlugin(ScrollTrigger);

/** Scroll choreographs the page; embedded Remotion compositions own their frames. */
export function LandingScroll() {
  useEffect(() => {
    const media = gsap.matchMedia();
    let disposed = false;
    const arm = () => {
      media.revert();
      if (!travels()) return;
      // flow already resolves system defaults and the visitor's explicit choice.
      media.add('(min-width: 0px)', () => {
        const cleanups: (() => void)[] = [];
        const compact = window.matchMedia('(max-width: 760px)').matches;
        const selectors =
          '#approach h2, #approach .section-label, #approach [data-intro-reveal], #approach [data-stage], #approach [data-intro-film], #approach aside, .stats-ribbon, .stats-ribbon .stat, #projects .section-heading, [data-project-card], #writing .section-heading, [data-writing-entry], [data-landing-reveal]';
        gsap.utils.toArray<HTMLElement>(selectors).forEach((element) => {
          const tween = gsap.from(element, {
            y: compact ? 18 : 34,
            opacity: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 94%', once: true },
          });
          const reveal = () => {
            tween.progress(1);
          };
          element.addEventListener('focusin', reveal);
          cleanups.push(() => element.removeEventListener('focusin', reveal));
        });
        gsap.utils
          .toArray<HTMLElement>('[data-craft-frame]')
          .forEach((element, index) => {
            gsap.fromTo(
              element,
              { rotation: compact ? 0 : index % 2 ? 2 : -2, y: 22 },
              {
                rotation: 0,
                y: -12,
                ease: 'none',
                scrollTrigger: {
                  trigger: element.parentElement,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 1,
                },
              },
            );
          });
        gsap.utils
          .toArray<HTMLElement>('[data-portrait-window]')
          .forEach((element) => {
            const image = element.querySelector('img');
            if (!image) return;
            gsap.fromTo(
              image,
              { scale: 1.14, yPercent: -3 },
              {
                scale: 1.14,
                yPercent: 3,
                ease: 'none',
                scrollTrigger: {
                  trigger: element,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 1,
                },
              },
            );
          });
        gsap.utils
          .toArray<HTMLElement>('[data-project-art]')
          .forEach((element, index) => {
            gsap.fromTo(
              element,
              { rotation: compact ? 0 : index % 2 ? 1.5 : -1.5, scale: 0.98 },
              {
                rotation: 0,
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 95%',
                  end: 'top 30%',
                  scrub: 1,
                },
              },
            );
          });
        const interlude = document.querySelector('[data-interlude]');
        const portrait = interlude?.querySelector('[data-portrait-window]');
        if (interlude && portrait && !compact) {
          gsap.fromTo(
            portrait,
            { rotation: -3, y: 28 },
            {
              rotation: 2,
              y: -28,
              ease: 'none',
              scrollTrigger: {
                trigger: interlude,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 1.2,
              },
            },
          );
        }
        const progress = document.createElement('div');
        progress.setAttribute('aria-hidden', 'true');
        Object.assign(progress.style, {
          position: 'fixed',
          top: '0',
          left: '0',
          width: '100%',
          height: '2px',
          background: 'linear-gradient(90deg, #527747, #a8bf82 60%, #c7dca8)',
          transformOrigin: 'left',
          zIndex: '60',
          pointerEvents: 'none',
        });
        document.body.appendChild(progress);
        gsap.fromTo(
          progress,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
            },
          },
        );
        cleanups.push(() => progress.remove());
        return () => cleanups.forEach((cleanup) => cleanup());
      });
      ScrollTrigger.refresh();
    };
    arm();
    const stop = watchFlow(arm);
    void document.fonts.ready.then(() => {
      if (!disposed) ScrollTrigger.refresh();
    });
    return () => {
      disposed = true;
      stop();
      media.revert();
    };
  }, []);
  return null;
}
