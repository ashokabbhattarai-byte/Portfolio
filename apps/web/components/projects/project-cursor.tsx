'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Project } from '@portfolio/types';
import { travels, watchFlow } from '@/components/motion/flow';
import { ProjectArt } from './project-art';
export function ProjectCursor({
  projects,
}: {
  projects: Pick<
    Project,
    | 'image'
    | 'title'
    | 'slug'
    | 'color'
    | 'ink'
    | 'symbol'
    | 'focus'
    | 'category'
    | 'context'
  >[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    const arm = () => {
      media.revert();
      if (!travels()) return;
      // Hover preview is essential UX — keep it even in calm, just softer
      media.add('(hover: hover) and (pointer: fine)', () => {
        const node = ref.current;
        const label = labelRef.current;
        if (!node) return;
        // Velvet-smooth float — longer duration + expo ease for premium lag
        const x = gsap.quickTo(node, 'x', { duration: 0.72, ease: 'expo.out' });
        const y = gsap.quickTo(node, 'y', { duration: 0.72, ease: 'expo.out' });
        const r = gsap.quickTo(node, 'rotation', {
          duration: 0.9,
          ease: 'power3.out',
        });
        let active = '';
        let lastX = 0;
        const move = (event: PointerEvent) => {
          const target = (event.target as Element).closest<HTMLElement>(
            '[data-project]',
          );
          const slug = target?.dataset.project ?? '';
          const mode = target?.dataset.preview ?? 'cursor';
          const vx = event.clientX - lastX;
          lastX = event.clientX;
          // Clamp to viewport with generous padding for 380px media
          x(Math.min(window.innerWidth - 200, Math.max(200, event.clientX)));
          y(Math.min(window.innerHeight - 170, Math.max(170, event.clientY)));
          r(gsap.utils.clamp(-6, 6, vx * 0.08));
          if (slug !== active || node.dataset.mode !== mode) {
            active = slug;
            node.dataset.mode = mode;
            const isActive = !!slug;
            gsap.to(node, {
              opacity: isActive ? 1 : 0,
              scale: isActive ? 1 : 0.86,
              duration: isActive ? 0.42 : 0.24,
              ease: isActive ? 'expo.out' : 'power3.in',
              overwrite: 'auto',
            });
            if (label) {
              gsap.to(label, {
                scale: isActive ? 1 : 0.8,
                opacity: isActive ? 1 : 0,
                duration: 0.32,
                ease: 'expo.out',
                overwrite: true,
              });
            }
            node.querySelectorAll<HTMLElement>('[data-art]').forEach((el) => {
              const isTarget = el.dataset.art === slug;
              gsap.to(el, {
                opacity: isTarget ? 1 : 0,
                y: isTarget ? 0 : 12,
                scale: isTarget ? 1 : 0.98,
                duration: isTarget ? 0.5 : 0.32,
                ease: isTarget ? 'expo.out' : 'power3.inOut',
                overwrite: true,
              });
            });
          }
        };
        const hide = () => {
          active = '';
          gsap.to(node, {
            opacity: 0,
            scale: 0.9,
            duration: 0.22,
            ease: 'power3.in',
            overwrite: 'auto',
          });
          gsap.to(node, { rotation: 0, duration: 0.5, ease: 'power3.out' });
        };
        document.addEventListener('pointermove', move, { passive: true });
        document.addEventListener('pointerleave', hide);
        window.addEventListener('scroll', hide, { passive: true });
        window.addEventListener('blur', hide);
        return () => {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerleave', hide);
          window.removeEventListener('scroll', hide);
          window.removeEventListener('blur', hide);
          x.tween.kill();
          y.tween.kill();
          r.tween.kill();
          gsap.killTweensOf(node);
          if (label) gsap.killTweensOf(label);
          node
            .querySelectorAll('[data-art]')
            .forEach((el) => gsap.killTweensOf(el));
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
    <div ref={ref} className="project-cursor" aria-hidden="true">
      <div className="cursor-media">
        {projects.map((project) => (
          <div
            data-art={project.slug}
            key={project.slug}
            className="cursor-art-wrap"
          >
            <ProjectArt project={project} compact />
            <div className="cursor-caption">
              <span className="cursor-title">{project.title}</span>
              <span className="cursor-meta">
                {project.category} · {project.context}
              </span>
            </div>
          </div>
        ))}
      </div>
      <span ref={labelRef} className="cursor-label">
        View ↗
      </span>
    </div>
  );
}
