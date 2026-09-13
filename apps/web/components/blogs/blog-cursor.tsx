'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { Blog } from '@portfolio/types';
import { travels, watchFlow } from '@/components/motion/flow';
import Image from 'next/image';

export function BlogCursor({ blogs }: { blogs: Blog[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = gsap.matchMedia();
    const arm = () => {
      media.revert();
      media.add('(hover: hover) and (pointer: fine)', () => {
        const node = ref.current;
        if (!node) return;
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
            '[data-blog]',
          );
          const slug = target?.dataset.blog ?? '';
          const vx = event.clientX - lastX;
          lastX = event.clientX;
          x(Math.min(window.innerWidth - 200, Math.max(200, event.clientX)));
          y(Math.min(window.innerHeight - 170, Math.max(170, event.clientY)));
          r(gsap.utils.clamp(-6, 6, vx * 0.08));
          if (slug !== active) {
            active = slug;
            gsap.to(node, {
              opacity: slug ? 1 : 0,
              scale: slug ? 1 : 0.86,
              duration: slug ? 0.42 : 0.24,
              ease: slug ? 'expo.out' : 'power3.in',
              overwrite: 'auto',
            });
            node
              .querySelectorAll<HTMLElement>('[data-blog-art]')
              .forEach((el) => {
                const isTarget = el.dataset.blogArt === slug;
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
          node
            .querySelectorAll('[data-blog-art]')
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
        {blogs.map((post) => {
          const cover =
            post.images?.find(
              (i) => i.placement === 'COVER' || i.placement === 'HERO',
            )?.url ?? post.coverImage;
          return (
            <div
              data-blog-art={post.slug}
              key={post.slug}
              className="cursor-art-wrap"
            >
              {cover ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={cover}
                    alt={post.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="380px"
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: '#f4f3ee',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 32,
                  }}
                >
                  ✎
                </div>
              )}
              <div className="cursor-caption">
                <span className="cursor-title">{post.title}</span>
                <span className="cursor-meta">
                  {post.tags.slice(0, 2).join(' · ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <span className="cursor-label" style={{ background: '#0a66c2' }}>
        Read ↗
      </span>
    </div>
  );
}
