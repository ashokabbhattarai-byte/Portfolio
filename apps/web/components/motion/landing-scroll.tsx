'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { travels, watchFlow } from './flow';

gsap.registerPlugin(ScrollTrigger);

/** Re-entering from either edge replays the reveal; portraits track the scroll. */
export function LandingScroll() {
  useEffect(() => {
    const media = gsap.matchMedia();
    let disposed = false;
    const arm = () => {
      media.revert();
      if (!travels()) return;
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const cleanups: (() => void)[] = [];
        const mobile = window.matchMedia('(max-width: 760px)').matches;
        const selectors = [
          '#approach > div:first-child > div',
          '#approach aside',
          '#approach ol > li',
          '.stats-ribbon > .stat',
          '#projects .section-heading',
          '#projects .project-entry',
          '#writing .section-heading',
          '#writing .blog-card',
          '#writing .section-heading + div:not(.blog-featured-grid)',
          '#projects .more-work, #writing .more-work',
          '[data-landing-reveal]',
          '.contact-footer .contact-heading',
          '.contact-footer .contact-actions',
          '.contact-footer .footer-nav',
          '.contact-footer .footer-bottom',
        ];
        gsap.utils
          .toArray<HTMLElement>(selectors.join(','))
          .forEach((element) => {
            if (!element.offsetHeight) return;
            // Never hide a focused link while someone navigates with a keyboard.
            const animation = gsap.fromTo(
              element,
              { y: mobile ? 24 : 48, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.85,
                ease: 'power3.out',
                paused: true,
              },
            );
            const play = () => {
              animation.restart();
            };
            const reset = () => {
              if (!element.contains(document.activeElement)) animation.pause(0);
            };
            ScrollTrigger.create({
              trigger: element,
              start: 'top 96%',
              end: 'bottom top',
              onEnter: play,
              onEnterBack: play,
              onLeave: reset,
              onLeaveBack: reset,
            });
            const focus = () => {
              animation.progress(1).pause();
            };
            element.addEventListener('focusin', focus);
            // Context cleanup also removes listeners on route and motion changes.
            cleanups.push(() => element.removeEventListener('focusin', focus));
          });
        gsap.utils
          .toArray<HTMLElement>('.stats-ribbon .stat-value')
          .forEach((node) => {
            const match = node.textContent?.match(/\d+/);
            if (!match) return;
            const target = Number(match[0]);
            const counter = { value: 0 };
            const count = () =>
              gsap.to(counter, {
                value: target,
                duration: 1.4,
                ease: 'expo.out',
                onUpdate: () => {
                  node.firstChild!.textContent = String(
                    Math.round(counter.value),
                  );
                },
              });
            ScrollTrigger.create({
              trigger: node,
              start: 'top 86%',
              onEnter: count,
              onEnterBack: count,
            });
          });
        gsap.utils
          .toArray<HTMLElement>('.grid .project-entry, .blog-card')
          .forEach((card) => {
            const art = card.querySelector<HTMLElement>(
              '.project-art, .blog-cover',
            );
            if (!art) return;
            card.addEventListener('pointermove', (event) => {
              if (event.pointerType !== 'mouse') return;
              const box = card.getBoundingClientRect();
              const x = (event.clientX - box.left) / box.width - 0.5;
              const y = (event.clientY - box.top) / box.height - 0.5;
              gsap.to(card, {
                rotationY: x * 4,
                rotationX: -y * 4,
                transformPerspective: 900,
                duration: 0.5,
                ease: 'power3.out',
                overwrite: true,
              });
              gsap.to(art, {
                x: x * 8,
                y: y * 8,
                duration: 0.7,
                ease: 'power3.out',
                overwrite: true,
              });
            });
            card.addEventListener('pointerleave', () => {
              gsap.to(card, {
                rotationY: 0,
                rotationX: 0,
                duration: 0.7,
                ease: 'elastic.out(1, .45)',
              });
              gsap.to(art, { x: 0, y: 0, duration: 0.7, ease: 'power3.out' });
            });
          });
        gsap.utils
          .toArray<HTMLElement>('[data-portrait-window]')
          .forEach((frame) => {
            const portrait = frame.querySelector('[data-portrait-drift]');
            if (!portrait) return;
            gsap.fromTo(
              portrait,
              { yPercent: -5, scale: 1.08 },
              {
                yPercent: 5,
                scale: 1,
                ease: 'none',
                scrollTrigger: {
                  trigger: frame,
                  start: 'top bottom',
                  end: 'bottom top',
                  scrub: 0.65,
                },
              },
            );
          });
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
