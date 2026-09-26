'use client';
import Image from 'next/image';
import { useContext, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Profile, Experience } from '@portfolio/types';
import styles from './hero.module.css';
import { TransitionLink } from '@/components/motion/transition-link';
import { travels, watchFlow } from '@/components/motion/flow';
import { MotionContext } from '@/components/motion/motion-provider';
import { HeroAtmosphere } from './hero-atmosphere';

gsap.registerPlugin(ScrollTrigger);

export function Hero({
  profile,
  experience,
}: {
  profile: Profile;
  experience?: Experience[];
}) {
  const ref = useRef<HTMLElement>(null);
  const motion = useContext(MotionContext);
  useEffect(() => {
    let context: gsap.Context | undefined;
    const responsive = gsap.matchMedia();
    const start = () => {
      responsive.revert();
      context?.revert();
      context = gsap.context(() => {
        if (
          !travels() ||
          window.matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          return;
        const entry = gsap.timeline();
        const kinetic = gsap.utils.toArray<HTMLElement>('[data-kinetic-copy]');
        kinetic.forEach((node, index) => {
          const text = node.textContent ?? '';
          node.setAttribute('aria-label', text);
          const words = text.trim().split(/\s+/);
          node.innerHTML = words
            .map(
              (word) =>
                `<span style="display:inline-block;white-space:nowrap;">${[
                  ...word,
                ]
                  .map(
                    (character) =>
                      `<span data-kinetic-char aria-hidden="true" style="display:inline-block;">${character}</span>`,
                  )
                  .join('')}</span>`,
            )
            .join(' ');
          entry.from(
            node.querySelectorAll('[data-kinetic-char]'),
            {
              yPercent: 130,
              opacity: 0,
              rotateX: -70,
              transformOrigin: '50% 100%',
              duration: 0.7,
              stagger: 0.018,
              ease: 'expo.out',
            },
            0.4 + index * 0.12,
          );
        });
        entry.fromTo(
          '[data-hero-photo]',
          {
            scale: 1.1,
            yPercent: 6,
            rotation: 2.2,
            clipPath: 'inset(10% 10% 10% 10% round 22px)',
          },
          {
            scale: 1,
            yPercent: 0,
            rotation: 0.6,
            clipPath: 'inset(0% 0% 0% 0% round 22px)',
            duration: 1.35,
            ease: 'curtain',
          },
          0,
        );
        entry.from(
          '[data-name-word]',
          {
            yPercent: 110,
            rotation: 4,
            transformOrigin: '0% 100%',
            duration: 1.15,
            stagger: 0.12,
            ease: 'expo.out',
            clearProps: 'transform',
          },
          0,
        );
        entry.from(
          '[data-hero-reveal]',
          {
            y: 18,
            opacity: 0,
            duration: 0.75,
            stagger: 0.07,
            ease: 'power3.out',
            clearProps: 'transform,opacity',
          },
          0.22,
        );
        entry.fromTo(
          '[data-photo-shutter]',
          { scaleX: 1 },
          {
            scaleX: 0,
            duration: 1.2,
            ease: 'expo.inOut',
          },
          0.08,
        );
        gsap.to('[data-hero-orb]', {
          x: 'random(-90,90)',
          y: 'random(-70,70)',
          scale: 'random(0.7,1.4)',
          duration: 'random(3,6)',
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
        gsap.to('[data-hero-scan]', {
          yPercent: 120,
          duration: 3.6,
          repeat: -1,
          ease: 'none',
        });
        gsap.to('[data-hero-grid]', {
          backgroundPosition: '80px 80px',
          duration: 7,
          repeat: -1,
          ease: 'none',
        });
        const progress = ref.current?.querySelector<HTMLElement>(
          '[data-scroll-progress] span',
        );
        if (progress)
          gsap.to(progress, {
            scaleX: 1,
            transformOrigin: 'left center',
            ease: 'none',
            scrollTrigger: {
              trigger: ref.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        ScrollTrigger.create({
          trigger: ref.current,
          start: 'top bottom',
          end: 'bottom top',
          onEnter: () => {
            entry.restart();
          },
          onEnterBack: () => {
            entry.restart();
          },
        });
        // Portrait drift follows scroll in both directions.
        responsive.add(
          '(min-width: 761px) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
          () => {
            const photo =
              ref.current?.querySelector<HTMLElement>('[data-hero-photo]');
            const button =
              ref.current?.querySelector<HTMLElement>('[data-hero-action]');
            if (!photo || !button) return;
            // Very premium parallax — more visible on scroll top→bottom
            gsap.to(photo, {
              y: -82,
              scale: 0.97,
              ease: 'none',
              scrollTrigger: {
                trigger: ref.current,
                start: 'top top',
                end: 'bottom top',
                scrub: 1,
                invalidateOnRefresh: true,
              },
            });
            gsap.set(photo, { transformPerspective: 1200 });
            const rotateX = gsap.quickTo(photo, 'rotationX', {
              duration: 0.75,
              ease: 'power3.out',
            });
            const rotateY = gsap.quickTo(photo, 'rotationY', {
              duration: 0.75,
              ease: 'power3.out',
            });
            const tilt = (event: PointerEvent) => {
              if (event.pointerType !== 'mouse') return;
              const box = photo.getBoundingClientRect();
              rotateX(-((event.clientY - box.top) / box.height - 0.5) * 5);
              rotateY(((event.clientX - box.left) / box.width - 0.5) * 5);
              gsap.to('[data-hero-orb]', {
                x: (event.clientX / window.innerWidth - 0.5) * 100,
                y: (event.clientY / window.innerHeight - 0.5) * 80,
                duration: 0.8,
                ease: 'power3.out',
                overwrite: true,
              });
              // drive portrait premium layers subtly with pointer
              const glare = photo.querySelector<HTMLElement>('[data-glare]');
              const holo = photo.querySelector<HTMLElement>('[data-holo-grid]');
              const chromaR =
                photo.querySelector<HTMLElement>('[data-chroma-r]');
              const chromaB =
                photo.querySelector<HTMLElement>('[data-chroma-b]');
              if (glare) {
                const nx = (event.clientX - box.left) / box.width - 0.5;
                gsap.to(glare, {
                  xPercent: nx * 12,
                  duration: 0.6,
                  ease: 'power3.out',
                  overwrite: true,
                });
              }
              if (holo) {
                const nx = (event.clientX - box.left) / box.width - 0.5;
                const ny = (event.clientY - box.top) / box.height - 0.5;
                gsap.to(holo, {
                  x: nx * 6,
                  y: ny * 6,
                  duration: 0.7,
                  ease: 'power3.out',
                  overwrite: true,
                });
              }
              if (chromaR && chromaB) {
                const nx = (event.clientX - box.left) / box.width - 0.5;
                gsap.to(chromaR, {
                  x: nx * -1.8 - 1.2,
                  duration: 0.4,
                  ease: 'power3.out',
                  overwrite: true,
                });
                gsap.to(chromaB, {
                  x: nx * 1.8 + 1.4,
                  duration: 0.4,
                  ease: 'power3.out',
                  overwrite: true,
                });
              }
            };
            const settle = () => {
              rotateX(0);
              rotateY(0);
              const glare = photo.querySelector<HTMLElement>('[data-glare]');
              const holo = photo.querySelector<HTMLElement>('[data-holo-grid]');
              const chromaR =
                photo.querySelector<HTMLElement>('[data-chroma-r]');
              const chromaB =
                photo.querySelector<HTMLElement>('[data-chroma-b]');
              if (glare)
                gsap.to(glare, {
                  xPercent: 0,
                  duration: 0.7,
                  ease: 'power3.out',
                });
              if (holo)
                gsap.to(holo, {
                  x: 0,
                  y: 0,
                  duration: 0.7,
                  ease: 'power3.out',
                });
              if (chromaR)
                gsap.to(chromaR, {
                  x: -1.2,
                  duration: 0.5,
                  ease: 'power3.out',
                });
              if (chromaB)
                gsap.to(chromaB, { x: 1.4, duration: 0.5, ease: 'power3.out' });
            };
            const moveX = gsap.quickTo(button, 'x', {
              duration: 0.45,
              ease: 'power3.out',
            });
            const moveY = gsap.quickTo(button, 'y', {
              duration: 0.45,
              ease: 'power3.out',
            });
            const attract = (event: PointerEvent) => {
              if (event.pointerType !== 'mouse') return;
              const box = button.getBoundingClientRect();
              moveX(((event.clientX - box.left) / box.width - 0.5) * 12);
              moveY(((event.clientY - box.top) / box.height - 0.5) * 8);
            };
            const release = () => {
              moveX(0);
              moveY(0);
            };
            photo.addEventListener('pointermove', tilt, { passive: true });
            photo.addEventListener('pointerleave', settle);

            // Premium hover timeline — corners + HUD + glow + chroma + scan
            const corners =
              photo.querySelectorAll<HTMLElement>('[data-corner]');
            const hud = photo.querySelector<HTMLElement>('[data-portrait-hud]');
            const glow = photo.querySelector<HTMLElement>(
              '[data-portrait-glow]',
            );
            const flash = photo.querySelector<HTMLElement>(
              '[data-portrait-flash]',
            );
            const scanLine =
              photo.querySelector<HTMLElement>('[data-scan-line]');
            const image = photo.querySelector<HTMLElement>(`.${styles.image}`);
            // Remotion-inspired additions
            const perimeterRunner = photo.querySelector<HTMLElement>(
              '[data-perimeter-runner]',
            );
            const scanFill =
              photo.querySelector<HTMLElement>('[data-scan-fill]');
            const scanPct = photo.querySelector<HTMLElement>('[data-scan-pct]');
            const scanLabel =
              photo.querySelector<HTMLElement>('[data-scan-label]');
            const codeTicker =
              photo.querySelector<HTMLElement>('[data-code-ticker]');
            const dataBars = photo.querySelector<HTMLElement>('[data-bars]');

            // Remotion-like interpolate for scanning pct/bar — frame accurate 60fps feel
            // Use GSAP tween with linear easing to mimic Remotion's interpolate(frame, [0, fps*3], [0,100])
            const scanState = { v: 42 };
            let scanTween: gsap.core.Tween | null = null;
            const startScanInterpolate = () => {
              scanTween?.kill();
              // Remotion best practice: inline interpolate with Easing.bezier(0.16,1,0.3,1) for premium
              scanTween = gsap.to(scanState, {
                v: 100,
                duration: 2.8,
                ease: 'none',
                repeat: -1,
                onUpdate: () => {
                  // wrap like Remotion's loop: 0..100 with clamp
                  const pct = Math.round(gsap.utils.wrap(38, 100, scanState.v));
                  if (scanPct)
                    scanPct.textContent = String(pct).padStart(3, '0') + '%';
                  if (scanFill) {
                    // interpolate width 0.36 -> 1 using perceptual
                    const w = gsap.utils.interpolate(0.12, 1, (pct - 38) / 62);
                    gsap.set(scanFill, {
                      scaleX: w,
                      transformOrigin: 'left center',
                    });
                  }
                },
              });
              // also animate bar glow intensity
              gsap.to(scanFill, { opacity: 1, duration: 0.3 });
            };
            const stopScanInterpolate = () => {
              scanTween?.pause();
              if (scanFill) gsap.to(scanFill, { opacity: 0.85, duration: 0.4 });
            };

            // Perimeter runner — GSAP timeline that circulates the rectangle
            // Remotion-style: 4 keyframes around the rect, linear, infinite
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let runnerTl: any = null;
            const buildRunner = () => {
              if (!perimeterRunner || runnerTl) return;
              const w = photo.clientWidth;
              const h = photo.clientHeight;
              if (w < 10 || h < 10) return;
              const rw = 72;
              gsap.set(perimeterRunner, { x: -rw, y: -1 });
              runnerTl = gsap.timeline({
                repeat: -1,
                paused: true,
                defaults: { ease: 'none', duration: 1.15 },
              });
              // top edge: left -> right
              runnerTl.to(perimeterRunner, { x: w - rw + 1, y: -1 });
              // right edge: top -> bottom
              runnerTl.to(perimeterRunner, {
                x: w - 2,
                y: 0,
                rotation: 90,
                duration: 0.92,
              });
              runnerTl.to(perimeterRunner, { x: w - 2, y: h - 2 });
              // bottom edge
              runnerTl.to(perimeterRunner, {
                x: w - 2,
                y: h - 2,
                rotation: 180,
                duration: 0.08,
              });
              runnerTl.to(perimeterRunner, { x: -rw, y: h - 2 });
              // left edge
              runnerTl.to(perimeterRunner, {
                x: -rw,
                y: h - 2,
                rotation: 270,
                duration: 0.08,
              });
              runnerTl.to(perimeterRunner, { x: -rw, y: -1 });
              runnerTl.to(perimeterRunner, { rotation: 360, duration: 0.08 });
            };
            buildRunner();
            let resizeObserver: ResizeObserver | null = null;
            if (perimeterRunner && window.ResizeObserver) {
              resizeObserver = new ResizeObserver(() => {
                runnerTl?.kill();
                runnerTl = null;
                buildRunner();
                if (
                  photo.matches(':hover') ||
                  photo.classList.contains(styles.isHover)
                )
                  runnerTl?.play();
              });
              resizeObserver.observe(photo);
            }

            let hoverTl: gsap.core.Timeline | null = null;

            // Auto-entrance so remotion is visible on localhost without hover (top-to-bottom premium)
            // Delayed after hero entry, subtle 48% so hover still has delta to 100%
            const autoShow = gsap.delayedCall(1.65, () => {
              if (photo.classList.contains(styles.isHover)) return;
              gsap.to(corners, {
                opacity: 0.48,
                scale: 0.94,
                duration: 0.42,
                stagger: 0.03,
                ease: 'power2.out',
                overwrite: true,
              });
              gsap.to(hud, {
                opacity: 0.88,
                y: 0,
                duration: 0.32,
                ease: 'power2.out',
                overwrite: true,
              });
              gsap.to(scanLabel, {
                opacity: 0.82,
                y: 0,
                duration: 0.32,
                ease: 'power2.out',
                overwrite: true,
              });
              gsap.to(codeTicker, {
                opacity: 0.68,
                y: 0,
                duration: 0.36,
                ease: 'power2.out',
                overwrite: true,
              });
              gsap.to(dataBars, {
                opacity: 0.82,
                y: 0,
                duration: 0.32,
                ease: 'power2.out',
                overwrite: true,
              });
              gsap.to(scanLine, {
                opacity: 0.32,
                duration: 0.28,
                overwrite: true,
              });
              gsap.to(photo.querySelector('[data-scan-v]'), {
                opacity: 0.22,
                duration: 0.28,
                overwrite: true,
              });
              runnerTl?.play();
              startScanInterpolate();
            });

            const onPortraitEnter = () => {
              autoShow.kill();
              hoverTl?.kill();
              hoverTl = gsap.timeline({ defaults: { overwrite: true } });
              photo.classList.add(styles.isHover);
              if (corners.length)
                hoverTl.fromTo(
                  corners,
                  { scale: 0.72, opacity: 0 },
                  {
                    scale: 1,
                    opacity: 1,
                    duration: 0.52,
                    stagger: 0.045,
                    ease: 'back.out(1.5)',
                  },
                  0,
                );
              if (hud)
                hoverTl.fromTo(
                  hud,
                  { y: -8, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
                  0.08,
                );
              if (scanLabel)
                hoverTl.fromTo(
                  scanLabel,
                  { y: 6, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' },
                  0.1,
                );
              if (codeTicker)
                hoverTl.fromTo(
                  codeTicker,
                  { y: 8, opacity: 0 },
                  { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
                  0.14,
                );
              if (dataBars)
                hoverTl.to(
                  dataBars,
                  { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out' },
                  0.12,
                );
              if (glow)
                hoverTl.fromTo(
                  glow,
                  { opacity: 0, scale: 0.94 },
                  { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out' },
                  0,
                );
              if (image)
                hoverTl.to(
                  image,
                  {
                    scale: 1.02,
                    duration: 0.6,
                    ease: 'power3.out',
                  },
                  0,
                );
              if (scanLine)
                hoverTl.to(
                  scanLine,
                  { opacity: 0.95, duration: 0.25, ease: 'power2.out' },
                  0.12,
                );
              runnerTl?.play();
              startScanInterpolate();
              gsap.to(photo, {
                rotation: 0,
                duration: 0.5,
                ease: 'power3.out',
              });
            };
            const onPortraitLeave = () => {
              hoverTl?.kill();
              hoverTl = gsap.timeline({ defaults: { overwrite: true } });
              photo.classList.remove(styles.isHover);
              // return to auto-visible premium (48% not 0) so remotion stays visible without hover
              if (corners.length)
                hoverTl.to(
                  corners,
                  {
                    scale: 0.94,
                    opacity: 0.48,
                    duration: 0.28,
                    stagger: 0.02,
                    ease: 'power2.out',
                  },
                  0,
                );
              if (hud)
                hoverTl.to(
                  hud,
                  { y: 0, opacity: 0.88, duration: 0.28, ease: 'power2.out' },
                  0,
                );
              if (scanLabel)
                hoverTl.to(
                  scanLabel,
                  { y: 0, opacity: 0.82, duration: 0.26, ease: 'power2.out' },
                  0,
                );
              if (codeTicker)
                hoverTl.to(
                  codeTicker,
                  { y: 0, opacity: 0.68, duration: 0.28, ease: 'power2.out' },
                  0,
                );
              if (dataBars)
                hoverTl.to(
                  dataBars,
                  { y: 0, opacity: 0.82, duration: 0.26 },
                  0,
                );
              if (glow)
                hoverTl.to(
                  glow,
                  {
                    opacity: 0.65,
                    scale: 1,
                    duration: 0.35,
                    ease: 'power2.out',
                  },
                  0,
                );
              if (image)
                hoverTl.to(
                  image,
                  { scale: 1.01, duration: 0.4, ease: 'power3.out' },
                  0,
                );
              if (scanLine)
                hoverTl.to(scanLine, { opacity: 0.32, duration: 0.25 }, 0);
              gsap.to(photo.querySelector('[data-scan-v]'), {
                opacity: 0.22,
                duration: 0.25,
                overwrite: true,
              });
              // keep runner playing at subtle pace
              runnerTl?.play();
              stopScanInterpolate();
              gsap.to(photo, {
                rotation: 0.6,
                duration: 0.6,
                ease: 'power3.out',
              });
            };
            const onPortraitClick = (e: PointerEvent) => {
              // premium click flash + pulse
              if (flash) {
                gsap.killTweensOf(flash);
                gsap
                  .timeline()
                  .set(flash, { opacity: 0 })
                  .to(flash, {
                    opacity: 0.22,
                    duration: 0.08,
                    ease: 'power2.out',
                  })
                  .to(
                    flash,
                    { opacity: 0, duration: 0.42, ease: 'power2.inOut' },
                    0.14,
                  );
              }
              gsap
                .timeline()
                .to(photo, { scale: 0.985, duration: 0.09, ease: 'power3.out' })
                .to(photo, {
                  scale: 1.015,
                  duration: 0.16,
                  ease: 'back.out(1.2)',
                })
                .to(photo, { scale: 1, duration: 0.45, ease: 'expo.out' });
              // pulse corners + runner burst on click
              if (corners.length) {
                gsap.fromTo(
                  corners,
                  { scale: 1 },
                  {
                    scale: 1.14,
                    duration: 0.12,
                    yoyo: true,
                    repeat: 1,
                    ease: 'power2.inOut',
                    stagger: 0.02,
                  },
                );
              }
              if (runnerTl) {
                gsap.to(runnerTl, {
                  timeScale: 3.2,
                  duration: 0.18,
                  ease: 'power2.out',
                  onComplete: () =>
                    gsap.to(runnerTl!, {
                      timeScale: 1,
                      duration: 0.6,
                      ease: 'power2.out',
                    }),
                });
              }
              // scan burst
              if (scanFill) {
                gsap.fromTo(
                  scanFill,
                  { scaleX: 0.2 },
                  { scaleX: 1, duration: 0.45, ease: 'expo.out' },
                );
              }
              // local dot
              const local = document.createElement('span');
              local.style.cssText = `position:absolute;left:${(e as PointerEvent & { offsetX: number }).offsetX}px;top:${(e as PointerEvent & { offsetY: number }).offsetY}px;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#c7dca8;box-shadow:0 0 16px #a8bf82;pointer-events:none;z-index:7;`;
              photo.appendChild(local);
              gsap
                .timeline({ onComplete: () => local.remove() })
                .to(local, {
                  scale: 1.6,
                  opacity: 1,
                  duration: 0.14,
                  ease: 'back.out(1.4)',
                })
                .to(
                  local,
                  { scale: 0, opacity: 0, duration: 0.5, ease: 'power3.in' },
                  0.18,
                );
              // also trigger a global ripple for background feel
              const rect = photo.getBoundingClientRect();
              const ev = new MouseEvent('click', {
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                bubbles: true,
              });
              ref.current?.dispatchEvent(ev);
            };

            photo.addEventListener('pointerenter', onPortraitEnter);
            photo.addEventListener('pointerleave', onPortraitLeave);
            photo.addEventListener('focus', onPortraitEnter);
            photo.addEventListener('blur', onPortraitLeave);
            photo.addEventListener('click', onPortraitClick as EventListener);

            button.addEventListener('pointermove', attract, { passive: true });
            button.addEventListener('pointerleave', release);
            return () => {
              photo.removeEventListener('pointermove', tilt);
              photo.removeEventListener('pointerleave', settle);
              photo.removeEventListener('pointerenter', onPortraitEnter);
              photo.removeEventListener('pointerleave', onPortraitLeave);
              photo.removeEventListener('focus', onPortraitEnter);
              photo.removeEventListener('blur', onPortraitLeave);
              photo.removeEventListener(
                'click',
                onPortraitClick as EventListener,
              );
              button.removeEventListener('pointermove', attract);
              button.removeEventListener('pointerleave', release);
              hoverTl?.kill();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (autoShow as any)?.kill?.();
              scanTween?.kill();
              runnerTl?.kill();
              resizeObserver?.disconnect();
            };
          },
        );
      }, ref);
    };
    window.addEventListener('portfolio:reveal', start);
    const stop = watchFlow(start);
    if (document.documentElement.dataset.motion !== 'intro') start();
    return () => {
      window.removeEventListener('portfolio:reveal', start);
      stop();
      responsive.revert();
      context?.revert();
    };
  }, []);

  return (
    <section ref={ref} className={styles.hero} aria-labelledby="hero-title">
      <HeroAtmosphere heroRef={ref} />
      <span className={styles.backdropWord} aria-hidden="true">
        Engineer.
      </span>
      <span className={styles.heroOrb} data-hero-orb aria-hidden="true" />
      <span className={styles.heroGrid} data-hero-grid aria-hidden="true" />
      <span className={styles.heroScan} data-hero-scan aria-hidden="true" />
      <div className={styles.content} data-hero-content>
        <div data-hero-reveal>
          <TransitionLink href="/contact" className={styles.availability}>
            <span className={styles.statusDot} aria-hidden="true" />
            Open to work
            <span aria-hidden="true">↗</span>
          </TransitionLink>
        </div>
        <h1 id="hero-title" className={styles.name}>
          {profile.name.split(' ').map((word, index) => (
            <span className={styles.nameMask} key={word + index}>
              <span data-name-word>{word} </span>
            </span>
          ))}
        </h1>
        <p className={styles.role} data-hero-reveal data-kinetic-copy>
          {profile.role}
        </p>
        <p
          className={styles.intro}
          data-hero-reveal
          data-hero-copy
          data-kinetic-copy
        >
          I build thoughtful web experiences and useful AI products.
        </p>
        <div className={styles.actions} data-hero-reveal>
          <a
            href="#projects"
            className={styles.action}
            data-hero-action
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              const target = document.getElementById('projects');
              if (!target) return;
              event.preventDefault();
              history.replaceState(history.state, '', '#projects');
              motion.scrollToSection(target);
            }}
          >
            Explore my work <span aria-hidden="true">↓</span>
          </a>
          {profile.resume ? (
            <a
              href={profile.resume}
              className={styles.resume}
              target="_blank"
              rel="noreferrer"
            >
              View résumé <span aria-hidden="true">↗</span>
            </a>
          ) : null}
        </div>
      </div>
      <figure
        className={styles.portrait}
        data-hero-photo
        tabIndex={0}
        aria-label={`${profile.name} portrait — hover for tech preview, click for pulse`}
      >
        <div className={styles.shutter} data-photo-shutter aria-hidden="true" />
        {/* Chromatic layers for premium hover — duplicate image, offset on hover via GSAP */}
        <Image
          src="/assets/hero-portrait.webp"
          alt=""
          width={890}
          height={1010}
          sizes="(max-width: 760px) 92vw, (max-width: 1400px) 48vw, 620px"
          aria-hidden="true"
          className={styles.imageChromaR}
          data-chroma-r
        />
        <Image
          src="/assets/hero-portrait.webp"
          alt=""
          width={890}
          height={1010}
          sizes="(max-width: 760px) 92vw, (max-width: 1400px) 48vw, 620px"
          aria-hidden="true"
          className={styles.imageChromaB}
          data-chroma-b
        />
        <Image
          src="/assets/hero-portrait.webp"
          alt={profile.name + ', ' + profile.role}
          width={890}
          height={1010}
          sizes="(max-width: 760px) 92vw, (max-width: 1400px) 48vw, 620px"
          loading="eager"
          fetchPriority="high"
          className={styles.image}
        />
        {/* Premium tech frame — rectangle professional */}
        <div className={styles.portraitTech} aria-hidden="true">
          <span className={styles.corner} data-corner="tl" />
          <span className={styles.corner} data-corner="tr" />
          <span className={styles.corner} data-corner="bl" />
          <span className={styles.corner} data-corner="br" />
          <span className={styles.scanLine} data-scan-line />
          <span className={styles.scanLaserV} data-scan-v />
          <span className={styles.glare} data-glare />
          <span className={styles.holoGrid} data-holo-grid />
          <div className={styles.perimeterTrack} aria-hidden="true">
            <span className={styles.perimeterRunner} data-perimeter-runner />
          </div>
        </div>
        <div
          className={styles.portraitGlow}
          data-portrait-glow
          aria-hidden="true"
        />
        <div
          className={styles.portraitFlash}
          data-portrait-flash
          aria-hidden="true"
        />
        <div
          className={styles.portraitHUD}
          data-portrait-hud
          aria-hidden="true"
        >
          <span className={styles.hudLeft}>
            <i className={styles.hudDot} aria-hidden="true" />
            OPEN TO WORK
          </span>
          <span className={styles.hudRight}>ID: AB_076 · 27.67°N 85.32°E</span>
        </div>
        {/* Remotion-inspired scanning label + bar — interpolate drives pct */}
        <div
          className={styles.scanLabelWrap}
          data-scan-label
          aria-hidden="true"
        >
          <span className={styles.scanLabel}>
            <i aria-hidden="true" /> SCANNING{' '}
            <span className={styles.scanPct} data-scan-pct>
              042%
            </span>
          </span>
          <div className={styles.scanBar} aria-hidden="true">
            <span className={styles.scanBarFill} data-scan-fill />
          </div>
        </div>
        <div className={styles.codeTicker} data-code-ticker aria-hidden="true">
          <span>Next.js 16</span>
          <span>TypeScript</span>
          <span>AI • Applied</span>
          <span>QA</span>
          <span>Ship to prod</span>
        </div>
        <div className={styles.dataBars} data-bars aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <figcaption className={styles.location}>
          <span>
            <strong>{profile.location}</strong>
            <span>Available for new opportunities</span>
          </span>
          {experience?.[0] ? (
            <span className={styles.experience}>
              <strong>{experience[0].company}</strong>
              <span>{experience[0].role}</span>
            </span>
          ) : null}
        </figcaption>
      </figure>
      <div className={styles.heroBottom} data-hero-reveal>
        <span>Based in {profile.location}</span>
        <span>Web engineering / Applied AI / Quality</span>
        <a href="#approach">Scroll to discover ↓</a>
      </div>
      <div
        className={styles.scrollProgress}
        data-scroll-progress
        aria-hidden="true"
      >
        <span />
      </div>
    </section>
  );
}
