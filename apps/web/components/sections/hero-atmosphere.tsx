'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { travels, watchFlow } from '@/components/motion/flow';
import styles from './hero.module.css';

/**
 * Premium techy hover/click atmosphere for the hero.
 * - Canvas dot-field with pointer repulsion + linking
 * - Cursor-following halo (GSAP quickTo)
 * - Click ripples
 * - Reactive grid + orb + scan
 *
 * Respects `travels()` / calm mode + prefers-reduced-motion.
 * Heavy work is gated behind (hover: hover) && pointer: fine
 */
export function HeroAtmosphere({
  heroRef,
}: {
  heroRef: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    const canvas = canvasRef.current;
    const glow = glowRef.current;
    const ripples = ripplesRef.current;
    const host = hostRef.current;
    if (!hero || !canvas || !glow || !ripples || !host) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const mm = gsap.matchMedia();
    let raf = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let points: { x: number; y: number; ox: number; oy: number }[] = [];
    const pointer = { x: -9999, y: -9999, active: false, inside: false };
    let hoverIntensity = 0;
    let destroyed = false;

    const quickX = gsap.quickTo(glow, 'x', {
      duration: 0.55,
      ease: 'expo.out',
    });
    const quickY = gsap.quickTo(glow, 'y', {
      duration: 0.55,
      ease: 'expo.out',
    });
    const quickGlowOpacity = gsap.quickTo(glow, 'opacity', {
      duration: 0.35,
      ease: 'power2.out',
    });

    // Grid + orb refs for secondary parallax
    const grid = hero.querySelector<HTMLElement>('[data-hero-grid]');
    const orb = hero.querySelector<HTMLElement>('[data-hero-orb]');
    const scan = hero.querySelector<HTMLElement>('[data-hero-scan]');

    const buildPoints = () => {
      const rect = hero.getBoundingClientRect();
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
      // sub-pixel jitter for organic tech feel
      for (let y = gap * 0.6; y < h; y += gap) {
        for (let x = gap * 0.6; x < w; x += gap) {
          const jitter = 0.22;
          const jx = x + (Math.random() - 0.5) * gap * jitter;
          const jy = y + (Math.random() - 0.5) * gap * jitter;
          points.push({ x: jx, y: jy, ox: jx, oy: jy });
        }
      }
    };

    const draw = () => {
      if (destroyed) return;
      ctx.clearRect(0, 0, w, h);

      // subtle vignette inside canvas for depth
      const isCalm = !travels();

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dx = pointer.x - p.ox;
        const dy = pointer.y - p.oy;
        const dist = Math.hypot(dx, dy);
        const hoverRadius = 165;
        const t = pointer.inside ? Math.max(0, 1 - dist / hoverRadius) : 0;
        // eased influence, premium: ease-out cubic
        const influence = t * t * (3 - 2 * t);
        const boosted = isCalm ? influence * 0.35 : influence;

        // dot size + alpha
        const baseR = 1.05;
        const baseA = 0.18 + (p.ox / w) * 0.06;
        const r = baseR + boosted * 2.1;
        const a = baseA + boosted * 0.52 + hoverIntensity * 0.04;

        // repulsion: push dot slightly away from pointer for depth
        const push = isCalm ? 0 : boosted * 6;
        const angle = dist > 0.1 ? Math.atan2(dy, dx) : 0;
        const px = p.ox - Math.cos(angle) * push;
        const py = p.oy - Math.sin(angle) * push;

        // color lerp: muted lime -> warm white on hover
        // base: #c7dca8, hover: #e5e9dc -> #ffffff
        const mix = boosted;
        // use rgba lerp manually via alpha + color
        // draw outer glow for boosted dots
        if (mix > 0.22) {
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
        // premium ink: ~ #eef1e4 with additive
        const rr = Math.round(199 + mix * 56);
        const gg = Math.round(220 + mix * 35);
        const bb = Math.round(168 + mix * 87);
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${a})`;
        ctx.fill();
      }

      // linking lines: connect close points where at least one is influenced
      // keep it sparse for performance: only check right + bottom neighbours
      if (!isCalm && points.length) {
        ctx.lineWidth = 1;
        // use a pseudo grid lookup: brute O(n) neighbour scan with distance check but limited to influenced region
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
            const lineA = avg * 0.28 * (0.5 + hoverIntensity * 0.5);
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

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      const rect = hero.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;

      // glow follows with premium lag
      quickX(e.clientX - rect.left);
      quickY(e.clientY - rect.top);
      if (!pointer.inside) {
        pointer.inside = true;
        gsap.to(glow, {
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'power2.out',
          overwrite: true,
        });
      }

      // parallax grid + orb - subtle, premium
      if (grid && travels()) {
        const nx = (pointer.x / w - 0.5) * 2;
        const ny = (pointer.y / h - 0.5) * 2;
        gsap.to(grid, {
          x: nx * 10,
          y: ny * 8,
          duration: 0.9,
          ease: 'power3.out',
          overwrite: true,
        });
        gsap.to(grid, {
          opacity: 0.22 + Math.abs(nx) * 0.04,
          duration: 0.5,
          overwrite: true,
        });
      }
      if (orb && travels()) {
        const nx = (pointer.x / w - 0.5) * 2;
        const ny = (pointer.y / h - 0.5) * 2;
        gsap.to(orb, {
          x: nx * 18,
          y: ny * 14,
          duration: 1,
          ease: 'power3.out',
          overwrite: true,
        });
      }
      if (scan && travels()) {
        gsap.to(scan, { opacity: 0.9, duration: 0.4, overwrite: true });
      }
    };

    const onPointerLeave = () => {
      pointer.inside = false;
      quickGlowOpacity(0);
      gsap.to(glow, { scale: 0.88, duration: 0.5, ease: 'power3.out' });
      if (grid)
        gsap.to(grid, {
          x: 0,
          y: 0,
          opacity: 0.18,
          duration: 1,
          ease: 'power3.out',
        });
      if (orb) gsap.to(orb, { x: 0, y: 0, duration: 1.2, ease: 'power3.out' });
      if (scan) gsap.to(scan, { opacity: 0.55, duration: 0.6 });
      // ease pointer out
      gsap.to(pointer, {
        x: -9999,
        y: -9999,
        duration: 1.2,
        ease: 'power3.out',
        overwrite: true,
      });
    };

    const onPointerEnter = () => {
      pointer.active = true;
    };

    const spawnRipple = (clientX: number, clientY: number, strong = false) => {
      if (!travels() && !strong) return;
      const rect = hero.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const el = document.createElement('span');
      el.className = styles.techRipple;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      ripples.appendChild(el);

      const tl = gsap.timeline({
        onComplete: () => {
          el.remove();
        },
      });
      gsap.set(el, { scale: 0.08, opacity: 0.0, borderWidth: 1 });
      tl.to(el, {
        scale: 1,
        opacity: 1,
        duration: 0.18,
        ease: 'power2.out',
      })
        .to(
          el,
          {
            scale: strong ? 18 : 11,
            opacity: 0,
            borderWidth: 0.6,
            duration: strong ? 1.15 : 0.95,
            ease: 'expo.out',
          },
          0.12,
        )
        .to(
          el,
          {
            boxShadow:
              '0 0 0 0 rgba(168,191,130,0), 0 0 48px rgba(82,119,71,0)',
            duration: 1,
            ease: 'power2.out',
          },
          0,
        );

      // secondary inner dot pulse
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
          duration: 0.18,
          ease: 'back.out(1.6)',
        })
        .to(
          dot,
          { scale: 0, opacity: 0, duration: 0.55, ease: 'power3.in' },
          0.42,
        );

      // micro parallax kick on hero children - premium tactile feedback
      const content = hero.querySelector<HTMLElement>('[data-hero-content]');
      if (content && !strong) {
        gsap.fromTo(
          content,
          { x: (x / w - 0.5) * -4 },
          { x: 0, duration: 0.8, ease: 'expo.out' },
        );
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // ignore clicks on links/buttons that handle navigation themselves
      if (target.closest('a,button')) {
        // still spawn a subtle ripple for premium feedback
        spawnRipple(e.clientX, e.clientY, false);
        return;
      }
      spawnRipple(e.clientX, e.clientY, true);
      // brief scan flash
      if (scan) {
        gsap.fromTo(
          scan,
          { opacity: 1, yPercent: -10 },
          {
            yPercent: 130,
            opacity: 0.65,
            duration: 1.15,
            ease: 'expo.inOut',
            overwrite: true,
          },
        );
      }
      // brief grid flash
      if (grid) {
        gsap.fromTo(
          grid,
          { opacity: 0.26 },
          { opacity: 0.18, duration: 1.2, ease: 'power2.out' },
        );
      }
    };

    const onResize = () => {
      buildPoints();
    };

    const arm = () => {
      buildPoints();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);

      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        hero.addEventListener('pointermove', onPointerMove, { passive: true });
        hero.addEventListener('pointerenter', onPointerEnter, {
          passive: true,
        });
        hero.addEventListener('pointerleave', onPointerLeave, {
          passive: true,
        });
        hero.addEventListener('click', onClick);
        // hover intensity tween via GSAP rAF-free
        gsap.to(
          { v: 0 },
          {
            v: 1,
            duration: 1.2,
            ease: 'power2.out',
            onUpdate() {
              hoverIntensity = pointer.inside ? 1 : 0;
            },
            onComplete() {
              hoverIntensity = pointer.inside ? 1 : 0;
            },
          },
        );
      } else {
        // touch: one subtle ripple on tap, no pointer tracking
        hero.addEventListener('click', onClick);
      }

      // ensure glow starts centered and hidden
      gsap.set(glow, {
        x: w / 2,
        y: h / 2,
        xPercent: -50,
        yPercent: -50,
        opacity: 0,
        scale: 0.88,
      });
    };

    const stop = watchFlow(() => {
      // rebuild gracefully on flow toggle
      buildPoints();
      if (!travels()) {
        gsap.set(glow, { opacity: 0 });
        if (grid) gsap.set(grid, { clearProps: 'transform,opacity' });
      }
    });

    // fonts ready -> refresh
    let disposed = false;
    arm();
    const ro = new ResizeObserver(() => {
      if (!disposed) onResize();
    });
    ro.observe(hero);
    window.addEventListener('resize', onResize, { passive: true });

    // respect reduced motion: if calm, reduce canvas opacity and skip links
    if (!travels()) {
      host.style.opacity = '0.42';
    }

    return () => {
      destroyed = true;
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      hero.removeEventListener('pointermove', onPointerMove);
      hero.removeEventListener('pointerenter', onPointerEnter);
      hero.removeEventListener('pointerleave', onPointerLeave);
      hero.removeEventListener('click', onClick);
      stop();
      mm.revert();
      gsap.killTweensOf(glow);
      gsap.killTweensOf(pointer);
      if (grid) gsap.killTweensOf(grid);
      if (orb) gsap.killTweensOf(orb);
      if (scan) gsap.killTweensOf(scan);
    };
  }, [heroRef]);

  return (
    <div ref={hostRef} className={styles.atmosphere} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.techCanvas} data-tech-canvas />
      <div ref={glowRef} className={styles.techGlow} data-tech-glow />
      <div className={styles.techVignette} data-tech-vignette />
      <div className={styles.techNoise} data-tech-noise />
      <div ref={ripplesRef} className={styles.techRipples} data-tech-ripples />
    </div>
  );
}
