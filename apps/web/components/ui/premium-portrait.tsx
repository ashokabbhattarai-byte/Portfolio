'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import hero from '@/components/sections/hero.module.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Premium rectangle portrait — shared across hero, intro, interlude.
 * Matches hero's 22px rectangle professional style with Remotion-like
 * interpolate scanning (GSAP + bezier) and GSAP perimeter runner.
 *
 * Keeps palette var(--deep) / #03102a + color-mix(in srgb, var(--accent) 60%, transparent) / var(--highlight) lime — no new colors.
 * Hover: corners, HUD, scan line + bar, code ticker, data bars, glare.
 * Scroll: portrait drifts with ScrollTrigger scrub (bi-directional).
 * Click: flash + pulse + runner burst.
 */
export function PremiumPortrait({
  src = '/assets/hero-portrait.webp',
  alt,
  label,
  idLabel,
  priority = false,
  sizes = '(max-width: 760px) 92vw, 44vw',
  className = '',
}: {
  src?: string;
  alt: string;
  label?: string;
  idLabel?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const photo = el;
    const corners = photo.querySelectorAll<HTMLElement>('[data-corner]');
    const hud = photo.querySelector<HTMLElement>('[data-portrait-hud]');
    const glow = photo.querySelector<HTMLElement>('[data-portrait-glow]');
    const flash = photo.querySelector<HTMLElement>('[data-portrait-flash]');
    const scanLine = photo.querySelector<HTMLElement>('[data-scan-line]');
    const scanV = photo.querySelector<HTMLElement>('[data-scan-v]');
    const runner = photo.querySelector<HTMLElement>('[data-perimeter-runner]');
    const scanFill = photo.querySelector<HTMLElement>('[data-scan-fill]');
    const scanPct = photo.querySelector<HTMLElement>('[data-scan-pct]');
    const scanLabel = photo.querySelector<HTMLElement>('[data-scan-label]');
    const codeTicker = photo.querySelector<HTMLElement>('[data-code-ticker]');
    const bars = photo.querySelector<HTMLElement>('[data-bars]');
    const image = photo.querySelector<HTMLElement>(`.${hero.image}`);

    // Remotion-style interpolate for scan pct/bar (Easing.bezier(0.16,1,0.3,1) ~ power3.out)
    const scanState = { v: 38 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanTween: any = null;
    const startScan = () => {
      scanTween?.kill();
      scanTween = gsap.to(scanState, {
        v: 100,
        duration: 2.9,
        ease: 'none',
        repeat: -1,
        onUpdate: () => {
          const pct = Math.round(gsap.utils.wrap(38, 100, scanState.v));
          if (scanPct) scanPct.textContent = String(pct).padStart(3, '0') + '%';
          if (scanFill) {
            const w = gsap.utils.interpolate(0.1, 1, (pct - 38) / 62);
            gsap.set(scanFill, { scaleX: w, transformOrigin: 'left center' });
          }
        },
      });
    };
    const stopScan = () => scanTween?.pause();

    // Perimeter runner — circulates rectangle edge (4-keyframe loop)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let runnerTl: any = null;
    const buildRunner = () => {
      if (!runner || runnerTl) return;
      const w = photo.clientWidth;
      const h = photo.clientHeight;
      if (w < 40 || h < 40) return;
      const rw = 72;
      gsap.set(runner, { x: -rw, y: -1, rotation: 0 });
      runnerTl = gsap.timeline({
        repeat: -1,
        paused: true,
        defaults: { ease: 'none', duration: 1.08 },
      });
      runnerTl.to(runner, { x: w - rw + 1, y: -1 });
      runnerTl.to(runner, { x: w - 2, y: 0, rotation: 90, duration: 0.88 });
      runnerTl.to(runner, { x: w - 2, y: h - 2 });
      runnerTl.to(runner, {
        x: w - 2,
        y: h - 2,
        rotation: 180,
        duration: 0.08,
      });
      runnerTl.to(runner, { x: -rw, y: h - 2 });
      runnerTl.to(runner, { x: -rw, y: h - 2, rotation: 270, duration: 0.08 });
      runnerTl.to(runner, { x: -rw, y: -1 });
      runnerTl.to(runner, { rotation: 360, duration: 0.08 });
    };
    buildRunner();
    let ro: ResizeObserver | null = null;
    if (runner && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        runnerTl?.kill();
        runnerTl = null;
        buildRunner();
        if (photo.matches(':hover') || photo.classList.contains(hero.isHover))
          runnerTl?.play();
      });
      ro.observe(photo);
    }

    // Auto-entrance on scroll — makes remotion visible without hover (very premium)
    // Uses ScrollTrigger progress as frame -> interpolate, so on scroll into view the tech fades in
    const autoIn = ScrollTrigger.create({
      trigger: photo,
      start: 'top 88%',
      onEnter: () => {
        if (photo.classList.contains(hero.isHover)) return;
        // subtle auto-show at ~45% opacity so remotion is visible even before hover; hover then goes to 100%
        gsap.to(corners, {
          opacity: 0.52,
          scale: 0.94,
          duration: 0.45,
          stagger: 0.03,
          ease: 'power2.out',
          overwrite: true,
        });
        gsap.to(hud, {
          opacity: 0.88,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: true,
        });
        gsap.to(scanLabel, {
          opacity: 0.85,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: true,
        });
        gsap.to(codeTicker, {
          opacity: 0.7,
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: true,
        });
        gsap.to(bars, {
          opacity: 0.85,
          y: 0,
          duration: 0.35,
          ease: 'power2.out',
          overwrite: true,
        });
        // kick scan/runner subtly
        if (scanLine)
          gsap.to(scanLine, { opacity: 0.35, duration: 0.3, overwrite: true });
        if (scanV)
          gsap.to(scanV, { opacity: 0.22, duration: 0.3, overwrite: true });
        runnerTl?.play();
        startScan();
      },
      onLeaveBack: () => {
        if (photo.classList.contains(hero.isHover)) return;
        gsap.to(corners, {
          opacity: 0,
          scale: 0.72,
          duration: 0.25,
          stagger: 0.02,
          overwrite: true,
        });
        gsap.to([hud, scanLabel, codeTicker, bars], {
          opacity: 0,
          y: 4,
          duration: 0.2,
          overwrite: true,
        });
        gsap.to([scanLine, scanV], {
          opacity: 0,
          duration: 0.2,
          overwrite: true,
        });
        runnerTl?.pause();
        stopScan();
      },
    });

    // Hover timeline — GSAP core + stagger + bezier (motion-design Premium)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let hoverTl: any = null;
    const onEnter = () => {
      hoverTl?.kill();
      hoverTl = gsap.timeline({ defaults: { overwrite: true } });
      photo.classList.add(hero.isHover);
      if (corners.length)
        hoverTl.fromTo(
          corners,
          { scale: 0.72, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.48,
            stagger: 0.042,
            ease: 'back.out(1.5)',
          },
          0,
        );
      if (hud)
        hoverTl.fromTo(
          hud,
          { y: -6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.48, ease: 'power3.out' },
          0.06,
        );
      if (scanLabel)
        hoverTl.fromTo(
          scanLabel,
          { y: 6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.42, ease: 'power3.out' },
          0.08,
        );
      if (codeTicker)
        hoverTl.fromTo(
          codeTicker,
          { y: 6, opacity: 0 },
          { y: 0, opacity: 0.92, duration: 0.46, ease: 'power3.out' },
          0.12,
        );
      if (bars)
        hoverTl.to(
          bars,
          { opacity: 1, y: 0, duration: 0.38, ease: 'power3.out' },
          0.1,
        );
      if (glow)
        hoverTl.fromTo(
          glow,
          { opacity: 0, scale: 0.94 },
          { opacity: 1, scale: 1, duration: 0.55, ease: 'power3.out' },
          0,
        );
      if (image)
        hoverTl.to(
          image,
          { scale: 1.02, duration: 0.55, ease: 'power3.out' },
          0,
        );
      if (scanLine)
        hoverTl.to(scanLine, { opacity: 0.95, duration: 0.22 }, 0.1);
      if (scanV) hoverTl.to(scanV, { opacity: 0.58, duration: 0.22 }, 0.1);
      runnerTl?.play();
      startScan();
      gsap.to(photo, {
        rotation: 0,
        duration: 0.46,
        ease: 'power3.out',
        overwrite: true,
      });
    };
    const onLeave = () => {
      hoverTl?.kill();
      hoverTl = gsap.timeline({ defaults: { overwrite: true } });
      photo.classList.remove(hero.isHover);
      if (corners.length)
        hoverTl.to(
          corners,
          {
            scale: 0.82,
            opacity: 0,
            duration: 0.24,
            stagger: 0.018,
            ease: 'power2.in',
          },
          0,
        );
      if (hud)
        hoverTl.to(
          hud,
          { y: -5, opacity: 0, duration: 0.24, ease: 'power2.in' },
          0,
        );
      if (scanLabel)
        hoverTl.to(
          scanLabel,
          { y: 4, opacity: 0, duration: 0.22, ease: 'power2.in' },
          0,
        );
      if (codeTicker)
        hoverTl.to(
          codeTicker,
          { y: 4, opacity: 0, duration: 0.24, ease: 'power2.in' },
          0,
        );
      if (bars) hoverTl.to(bars, { y: 4, opacity: 0, duration: 0.22 }, 0);
      if (glow)
        hoverTl.to(
          glow,
          { opacity: 0, scale: 0.96, duration: 0.38, ease: 'power2.inOut' },
          0,
        );
      if (image)
        hoverTl.to(image, { scale: 1, duration: 0.5, ease: 'power3.out' }, 0);
      if (scanLine) hoverTl.to(scanLine, { opacity: 0, duration: 0.22 }, 0);
      if (scanV) hoverTl.to(scanV, { opacity: 0, duration: 0.22 }, 0);
      runnerTl?.pause();
      stopScan();
      gsap.to(photo, {
        rotation: 0.6,
        duration: 0.55,
        ease: 'power3.out',
        overwrite: true,
      });
    };
    const onClick = (e: PointerEvent) => {
      if (flash) {
        gsap.killTweensOf(flash);
        gsap
          .timeline()
          .set(flash, { opacity: 0 })
          .to(flash, { opacity: 0.2, duration: 0.07 })
          .to(flash, { opacity: 0, duration: 0.38 }, 0.12);
      }
      gsap
        .timeline()
        .to(photo, { scale: 0.986, duration: 0.08 })
        .to(photo, { scale: 1.012, duration: 0.15, ease: 'back.out(1.3)' })
        .to(photo, { scale: 1, duration: 0.42, ease: 'expo.out' });
      if (corners.length)
        gsap.fromTo(
          corners,
          { scale: 1 },
          {
            scale: 1.12,
            duration: 0.11,
            yoyo: true,
            repeat: 1,
            stagger: 0.02,
            ease: 'power2.inOut',
          },
        );
      if (runnerTl)
        gsap.to(runnerTl, {
          timeScale: 2.8,
          duration: 0.16,
          onComplete: () => gsap.to(runnerTl, { timeScale: 1, duration: 0.5 }),
        });
      const rect = photo.getBoundingClientRect();
      const dot = document.createElement('span');
      const x =
        (e as PointerEvent & { offsetX: number }).offsetX ?? rect.width / 2;
      const y =
        (e as PointerEvent & { offsetY: number }).offsetY ?? rect.height / 2;
      dot.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:var(--highlight);box-shadow:0 0 14px var(--accent);pointer-events:none;z-index:7;`;
      photo.appendChild(dot);
      gsap
        .timeline({ onComplete: () => dot.remove() })
        .to(dot, {
          scale: 1.5,
          opacity: 1,
          duration: 0.12,
          ease: 'back.out(1.4)',
        })
        .to(
          dot,
          { scale: 0, opacity: 0, duration: 0.46, ease: 'power3.in' },
          0.16,
        );
    };

    // subtle tilt on pointer (GSAP quickTo for 60fps)
    const qx = gsap.quickTo(photo, 'rotationY', {
      duration: 0.7,
      ease: 'power3.out',
    });
    const qy = gsap.quickTo(photo, 'rotationX', {
      duration: 0.7,
      ease: 'power3.out',
    });
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = photo.getBoundingClientRect();
      qy(-((e.clientY - r.top) / r.height - 0.5) * 4);
      qx(((e.clientX - r.left) / r.width - 0.5) * 4);
    };
    const onLeaveTilt = () => {
      qx(0);
      qy(0);
    };

    photo.addEventListener('pointermove', onMove, { passive: true });
    photo.addEventListener('pointerleave', onLeaveTilt);
    photo.addEventListener('pointerenter', onEnter);
    photo.addEventListener('pointerleave', onLeave);
    photo.addEventListener('focus', onEnter);
    photo.addEventListener('blur', onLeave);
    photo.addEventListener('click', onClick as EventListener);

    gsap.set(photo, { transformPerspective: 900, rotation: 0.6 });

    return () => {
      photo.removeEventListener('pointermove', onMove);
      photo.removeEventListener('pointerleave', onLeaveTilt);
      photo.removeEventListener('pointerenter', onEnter);
      photo.removeEventListener('pointerleave', onLeave);
      photo.removeEventListener('focus', onEnter);
      photo.removeEventListener('blur', onLeave);
      photo.removeEventListener('click', onClick as EventListener);
      hoverTl?.kill();
      scanTween?.kill();
      runnerTl?.kill();
      autoIn.kill();
      ro?.disconnect();
      gsap.killTweensOf(photo);
    };
  }, []);

  return (
    <figure
      ref={ref as React.RefObject<HTMLElement>}
      className={`${hero.portrait} ${className}`}
      data-hero-photo
      tabIndex={0}
      aria-label={`${alt}: hover for tech preview, click for pulse`}
      style={{ maxWidth: '560px', width: '100%' }}
    >
      <div className={hero.shutter} data-photo-shutter aria-hidden="true" />
      <Image
        src={src}
        alt=""
        width={890}
        height={1010}
        aria-hidden
        className={hero.imageChromaR}
        data-chroma-r
      />
      <Image
        src={src}
        alt=""
        width={890}
        height={1010}
        aria-hidden
        className={hero.imageChromaB}
        data-chroma-b
      />
      <Image
        src={src}
        alt={alt}
        width={890}
        height={1010}
        sizes={sizes}
        priority={priority}
        className={hero.image}
      />
      <div className={hero.portraitTech} aria-hidden="true">
        <span className={hero.corner} data-corner="tl" />
        <span className={hero.corner} data-corner="tr" />
        <span className={hero.corner} data-corner="bl" />
        <span className={hero.corner} data-corner="br" />
        <span className={hero.scanLine} data-scan-line />
        <span className={hero.scanLaserV} data-scan-v />
        <span className={hero.glare} data-glare />
        <span className={hero.holoGrid} data-holo-grid />
        <div className={hero.perimeterTrack} aria-hidden="true">
          <span className={hero.perimeterRunner} data-perimeter-runner />
        </div>
      </div>
      <div
        className={hero.portraitGlow}
        data-portrait-glow
        aria-hidden="true"
      />
      <div
        className={hero.portraitFlash}
        data-portrait-flash
        aria-hidden="true"
      />
      <div className={hero.portraitHUD} data-portrait-hud aria-hidden="true">
        <span className={hero.hudLeft}>
          <i className={hero.hudDot} aria-hidden="true" /> SYSTEM ACTIVE
        </span>
        <span className={hero.hudRight}>
          {idLabel ?? 'ID: AB_076 · 27.67°N 85.32°E'}
        </span>
      </div>
      <div className={hero.scanLabelWrap} data-scan-label aria-hidden="true">
        <span className={hero.scanLabel}>
          <i aria-hidden="true" /> SCANNING{' '}
          <span className={hero.scanPct} data-scan-pct>
            042%
          </span>
        </span>
        <div className={hero.scanBar} aria-hidden="true">
          <span className={hero.scanBarFill} data-scan-fill />
        </div>
      </div>
      <div className={hero.codeTicker} data-code-ticker aria-hidden="true">
        <span>Next.js 16</span>
        <span>TypeScript</span>
        <span>AI • Applied</span>
        <span>QA</span>
        <span>Ship to prod</span>
      </div>
      <div className={hero.dataBars} data-bars aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      {label ? (
        <span
          style={{
            position: 'absolute',
            left: 14,
            bottom: 14,
            zIndex: 6,
            background: 'rgba(238,241,245,0.92)',
            color: 'var(--deep)',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            boxShadow: '0 4px 16px rgba(0,0,0,0.16)',
            border: '1px solid rgba(255,255,255,0.9)',
          }}
          aria-hidden="true"
        >
          {label}
        </span>
      ) : null}
    </figure>
  );
}
