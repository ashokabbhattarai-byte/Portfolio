'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { travels, watchFlow } from '@/components/motion/flow';
import styles from '@/components/sections/hero.module.css';

/**
 * Footer tech atmosphere — mirrors hero's premium canvas field so the footer
 * feels like the same product, not a different page.
 * Same palette (#0c213c + #527747/#c7dca8 lime), same dot-field + glow + ripples.
 * Pointer + click are handled on the footer container itself.
 */
export function FooterAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    const ripples = ripplesRef.current;
    if (!host || !canvas || !glow || !ripples) return;

    // Find the footer container — host's parent chain, fallback to query
    const footer =
      (host.closest('.contact-footer') as HTMLElement | null) ??
      (document.querySelector('.contact-footer') as HTMLElement | null);
    if (!footer) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const mm = gsap.matchMedia();
    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let points: { x: number; y: number; ox: number; oy: number }[] = [];
    const pointer = { x: -9999, y: -9999, inside: false };
    let destroyed = false;

    const qx = gsap.quickTo(glow, 'x', { duration: 0.6, ease: 'expo.out' });
    const qy = gsap.quickTo(glow, 'y', { duration: 0.6, ease: 'expo.out' });
    const qOpacity = gsap.quickTo(glow, 'opacity', {
      duration: 0.35,
      ease: 'power2.out',
    });

    const orb = host.querySelector<HTMLElement>('[data-footer-orb]');
    const grid = host.querySelector<HTMLElement>('[data-footer-grid]');
    const scan = host.querySelector<HTMLElement>('[data-footer-scan]');
    let gridIdle: gsap.core.Tween | null = null;
    let orbIdle: gsap.core.Tween | null = null;

    const buildPoints = () => {
      const rect = footer.getBoundingClientRect();
      w = Math.round(rect.width);
      h = Math.round(rect.height);
      if (w < 10 || h < 10) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const gap = 34;
      points = [];
      for (let y = gap * 0.6; y < h; y += gap) {
        for (let x = gap * 0.6; x < w; x += gap) {
          const jx = x + (Math.random() - 0.5) * gap * 0.22;
          const jy = y + (Math.random() - 0.5) * gap * 0.22;
          points.push({ x: jx, y: jy, ox: jx, oy: jy });
        }
      }
    };

    const draw = () => {
      if (destroyed) return;
      ctx.clearRect(0, 0, w, h);
      const isCalm = !travels();
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = pointer.x - p.ox;
        const dy = pointer.y - p.oy;
        const dist = Math.hypot(dx, dy);
        const t = pointer.inside ? Math.max(0, 1 - dist / 165) : 0;
        const influence = t * t * (3 - 2 * t);
        const boosted = isCalm ? influence * 0.35 : influence;
        const baseR = 1.05;
        const baseA = 0.18 + (p.ox / w) * 0.06;
        const r = baseR + boosted * 2.1;
        const a = baseA + boosted * 0.52;
        const push = isCalm ? 0 : boosted * 6;
        const angle = dist > 0.1 ? Math.atan2(dy, dx) : 0;
        const px = p.ox - Math.cos(angle) * push;
        const py = p.oy - Math.sin(angle) * push;
        const mix = boosted;
        // Calm gates the halo pass — dots stay, glow goes.
        if (!isCalm && mix > 0.22) {
          ctx.beginPath();
          ctx.arc(px, py, r + 2.8, 0, Math.PI * 2);
          const g = ctx.createRadialGradient(px, py, r, px, py, r + 3);
          g.addColorStop(0, `rgba(168,191,130,${0.22 * mix})`);
          g.addColorStop(1, 'rgba(168,191,130,0)');
          ctx.fillStyle = g;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        const rr = Math.round(199 + mix * 56);
        const gg = Math.round(220 + mix * 35);
        const bb = Math.round(168 + mix * 87);
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${a})`;
        ctx.fill();
      }
      if (!isCalm && points.length) {
        ctx.lineWidth = 1;
        for (let i = 0; i < points.length; i++) {
          const p = points[i];
          const di = Math.hypot(pointer.x - p.ox, pointer.y - p.oy);
          if (di > 180) continue;
          const mixA = Math.max(0, 1 - di / 180);
          if (mixA < 0.15) continue;
          for (let j = i + 1; j < points.length; j++) {
            const q = points[j];
            const d = Math.hypot(q.ox - p.ox, q.oy - p.oy);
            if (d > 54) continue;
            const dj = Math.hypot(pointer.x - q.ox, pointer.y - q.oy);
            if (dj > 180) continue;
            const mixB = Math.max(0, 1 - dj / 180);
            const avg = (mixA + mixB) / 2;
            if (avg < 0.22) continue;
            const lineA = avg * 0.28;
            ctx.beginPath();
            ctx.moveTo(p.ox, p.oy);
            ctx.lineTo(q.ox, q.oy);
            ctx.strokeStyle = `rgba(199,220,168,${lineA})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const rect = footer.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      qx(pointer.x);
      qy(pointer.y);
      if (!pointer.inside) {
        pointer.inside = true;
        gsap.to(glow, {
          opacity: 1,
          scale: 1,
          duration: 0.38,
          ease: 'power2.out',
          overwrite: true,
        });
      }
      if (travels()) {
        if (grid) {
          const nx = (pointer.x / w - 0.5) * 2;
          const ny = (pointer.y / h - 0.5) * 2;
          gsap.to(grid, {
            x: nx * 8,
            y: ny * 6,
            duration: 0.9,
            ease: 'power3.out',
            overwrite: true,
          });
          gsap.to(grid, {
            opacity: 0.16 + Math.abs(nx) * 0.03,
            duration: 0.5,
            overwrite: true,
          });
        }
        if (orb) {
          const nx = (pointer.x / w - 0.5) * 2;
          const ny = (pointer.y / h - 0.5) * 2;
          gsap.to(orb, {
            x: nx * 14,
            y: ny * 10,
            duration: 1,
            ease: 'power3.out',
            overwrite: true,
          });
        }
        if (scan)
          gsap.to(scan, { opacity: 0.85, duration: 0.35, overwrite: true });
      }
    };
    const onLeave = () => {
      pointer.inside = false;
      qOpacity(0);
      gsap.to(glow, { scale: 0.88, duration: 0.5, ease: 'power3.out' });
      if (grid)
        gsap.to(grid, {
          x: 0,
          y: 0,
          opacity: 0.12,
          duration: 1,
          ease: 'power3.out',
        });
      if (orb) gsap.to(orb, { x: 0, y: 0, duration: 1.1, ease: 'power3.out' });
      if (scan) gsap.to(scan, { opacity: 0.5, duration: 0.5 });
      gsap.to(pointer, {
        x: -9999,
        y: -9999,
        duration: 1.1,
        ease: 'power3.out',
        overwrite: true,
      });
    };
    const spawnRipple = (clientX: number, clientY: number, strong = false) => {
      if (!travels() && !strong) return;
      const rect = footer.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const el = document.createElement('span');
      el.className = styles.techRipple;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      ripples.appendChild(el);
      gsap.set(el, { scale: 0.08, opacity: 0, borderWidth: 1 });
      gsap
        .timeline({ onComplete: () => el.remove() })
        .to(el, { scale: 1, opacity: 1, duration: 0.16, ease: 'power3.out' })
        .to(
          el,
          {
            scale: strong ? 16 : 10,
            opacity: 0,
            borderWidth: 0.6,
            duration: strong ? 1.05 : 0.88,
            ease: 'power3.out',
          },
          0.1,
        );
      const dot = document.createElement('span');
      dot.className = styles.techRippleDot;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      ripples.appendChild(dot);
      gsap.set(dot, { scale: 0, opacity: 0.9 });
      gsap
        .timeline({ onComplete: () => dot.remove() })
        .to(dot, {
          scale: 1,
          opacity: 1,
          duration: 0.16,
          ease: 'back.out(1.5)',
        })
        .to(
          dot,
          { scale: 0, opacity: 0, duration: 0.52, ease: 'power3.in' },
          0.38,
        );
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('a,button')) {
        spawnRipple(e.clientX, e.clientY, false);
        return;
      }
      spawnRipple(e.clientX, e.clientY, true);
    };

    const onResize = () => buildPoints();
    const arm = () => {
      buildPoints();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        footer.addEventListener('pointermove', onMove, { passive: true });
        footer.addEventListener('pointerleave', onLeave, { passive: true });
        footer.addEventListener('click', onClick);
      } else {
        footer.addEventListener('click', onClick);
      }
      gsap.set(glow, {
        x: w / 2,
        y: h / 2,
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        scale: 0.86,
      });
      // Hero-style idle motion — slow grid crawl + orb drift, full flow only.
      gridIdle?.kill();
      orbIdle?.kill();
      gridIdle = null;
      orbIdle = null;
      if (travels()) {
        if (grid) {
          gridIdle = gsap.to(grid, {
            backgroundPosition: '80px 80px',
            duration: 7,
            repeat: -1,
            ease: 'none',
          });
        }
        if (orb) {
          orbIdle = gsap.to(orb, {
            x: 14,
            y: -12,
            duration: 5.2,
            yoyo: true,
            repeat: -1,
            ease: 'power3.out',
          });
        }
      }
    };

    const stop = watchFlow(() => {
      buildPoints();
      if (!travels()) {
        gsap.set(glow, { opacity: 0 });
        gridIdle?.kill();
        orbIdle?.kill();
        gridIdle = null;
        orbIdle = null;
      } else if (!gridIdle && grid) {
        gridIdle = gsap.to(grid, {
          backgroundPosition: '80px 80px',
          duration: 7,
          repeat: -1,
          ease: 'none',
        });
        if (orb && !orbIdle) {
          orbIdle = gsap.to(orb, {
            x: 14,
            y: -12,
            duration: 5.2,
            yoyo: true,
            repeat: -1,
            ease: 'power3.out',
          });
        }
      }
    });

    let disposed = false;
    arm();
    const ro = new ResizeObserver(() => {
      if (!disposed) onResize();
    });
    ro.observe(footer);
    window.addEventListener('resize', onResize, { passive: true });
    if (!travels()) host.style.opacity = '0.42';

    return () => {
      destroyed = true;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      footer.removeEventListener('pointermove', onMove);
      footer.removeEventListener('pointerleave', onLeave);
      footer.removeEventListener('click', onClick);
      stop();
      mm.revert();
      gridIdle?.kill();
      orbIdle?.kill();
      gsap.killTweensOf(glow);
      gsap.killTweensOf(pointer);
      if (orb) gsap.killTweensOf(orb);
      if (grid) gsap.killTweensOf(grid);
      if (scan) gsap.killTweensOf(scan);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={styles.atmosphere}
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      <canvas ref={canvasRef} className={styles.techCanvas} data-tech-canvas />
      <div ref={glowRef} className={styles.techGlow} data-tech-glow />
      <div className={styles.techVignette} data-tech-vignette />
      <div className={styles.techNoise} data-tech-noise />
      <div ref={ripplesRef} className={styles.techRipples} data-tech-ripples />
      {/* hero-consistent layers — same 80px grid + orb + scan */}
      <span
        data-footer-grid
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.12,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(#c7dca81c 1px, transparent 1px), linear-gradient(90deg, #c7dca81c 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage:
            'radial-gradient(ellipse at 72% 48%, #000, transparent 70%)',
        }}
      />
      <span
        data-footer-orb
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: 'clamp(180px, 24vw, 320px)',
          aspectRatio: '1',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, #a8bf8252, #52774700 68%)',
          filter: 'blur(14px)',
          pointerEvents: 'none',
          left: '68%',
          top: '42%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <span
        data-footer-scan
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '-20%',
          height: '18%',
          background:
            'linear-gradient(transparent, rgba(199,220,168,.10), transparent)',
          mixBlendMode: 'screen' as const,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
