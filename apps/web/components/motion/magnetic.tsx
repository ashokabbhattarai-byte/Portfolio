'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { travels, watchFlow } from './flow';
export function Magnetic({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = gsap.matchMedia();
    const arm = () => {
      media.revert();
      if (!travels()) return;
      media.add('(hover: hover) and (pointer: fine)', () => {
        const x = gsap.quickTo(node, 'x', {
          duration: 0.5,
          ease: 'power3.out',
        });
        const y = gsap.quickTo(node, 'y', {
          duration: 0.5,
          ease: 'power3.out',
        });
        const inner = node.querySelector<HTMLElement>('.magnetic-label');
        const move = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse') return;
          const bounds = node.getBoundingClientRect();
          x((event.clientX - bounds.left - bounds.width / 2) * 0.15);
          y((event.clientY - bounds.top - bounds.height / 2) * 0.15);
          if (inner)
            gsap.to(inner, {
              x: (event.clientX - bounds.left - bounds.width / 2) * 0.05,
              duration: 0.4,
              overwrite: true,
            });
        };
        const leave = () => {
          x(0);
          y(0);
          if (inner) gsap.to(inner, { x: 0, duration: 0.5, overwrite: true });
        };
        node.addEventListener('pointermove', move);
        node.addEventListener('pointerleave', leave);
        return () => {
          node.removeEventListener('pointermove', move);
          node.removeEventListener('pointerleave', leave);
          x.tween.kill();
          y.tween.kill();
          if (inner) {
            gsap.killTweensOf(inner);
            gsap.set(inner, { clearProps: 'transform' });
          }
          gsap.set(node, { clearProps: 'transform' });
        };
      });
    };
    arm();
    const stop = watchFlow(arm);
    return () => {
      stop();
      media.revert();
    };
  }, []);
  return (
    <span ref={ref} className={`magnetic ${className}`}>
      {children}
    </span>
  );
}
