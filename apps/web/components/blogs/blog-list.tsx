'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BlogCounts } from '@/components/analytics/blog-engagement';
import Image from 'next/image';
import { TransitionLink } from '@/components/motion/transition-link';
import { travels, watchFlow } from '@/components/motion/flow';
import type { Blog } from '@portfolio/types';

gsap.registerPlugin(ScrollTrigger);

function formatDate(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function BlogList({ blogs }: { blogs: Blog[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cleanup: (() => void) | void;
    const arm = () => {
      const root = ref.current;
      if (!root || !travels()) return;
      const entries = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll('[data-blog-index-entry]'),
      );
      if (entries.length === 0) return;
      gsap.set(entries, { y: 34, opacity: 0 });
      const triggers = ScrollTrigger.batch(entries, {
        start: 'top 94%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: 'power3.out',
            stagger: 0.08,
            overwrite: 'auto',
          }),
      });
      const cleanups = entries.map((element) => {
        const reveal = () =>
          gsap.to(element, {
            y: 0,
            opacity: 1,
            duration: 0.45,
            ease: 'power3.out',
            overwrite: 'auto',
          });
        element.addEventListener('focusin', reveal);
        return () => element.removeEventListener('focusin', reveal);
      });
      ScrollTrigger.refresh();
      return () => {
        cleanups.forEach((fn) => fn());
        triggers.forEach((trigger) => trigger.kill());
        gsap.set(entries, { clearProps: 'all' });
      };
    };
    const rearm = () => {
      if (typeof cleanup === 'function') cleanup();
      cleanup = arm();
    };
    rearm();
    const stop = watchFlow(rearm);
    return () => {
      stop();
      if (typeof cleanup === 'function') cleanup();
    };
  }, [blogs.length]);

  if (blogs.length === 0) {
    return (
      <div
        style={{
          marginTop: 24,
          background: '#fff',
          borderRadius: 22,
          border: '1px solid #c8d1df',
          padding: 40,
        }}
      >
        <p style={{ color: '#556479', fontSize: 17, margin: 0 }}>
          The first articles are in progress — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="project-collection list"
      style={{ marginTop: 28 }}
    >
      <div className="work-columns utility">
        <span>Article</span>
        <span>Published</span>
        <span>Read</span>
      </div>
      {blogs.map((post) => (
        <TransitionLink
          key={post.id}
          href={`/blog/${post.slug}`}
          className="project-entry"
          data-blog={post.slug}
          data-blog-index-entry
          data-flip-id={post.slug}
        >
          <div className="project-thumbnail">
            {(() => {
              const cover =
                post.images?.find(
                  (i) =>
                    i.placement === 'COVER' ||
                    i.placement === 'THUMBNAIL' ||
                    i.placement === 'HERO',
                )?.url ?? post.coverImage;
              const alt =
                post.images?.find(
                  (i) => i.placement === 'COVER' || i.placement === 'THUMBNAIL',
                )?.alt ?? post.title;
              return cover ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    borderRadius: '22px 22px 0 0',
                    aspectRatio: '16 / 9',
                  }}
                >
                  <Image
                    src={cover}
                    alt={alt}
                    fill
                    sizes="(max-width: 700px) 100vw, 400px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div
                  className="project-art"
                  style={{
                    background: '#0c213c',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 32,
                    color: '#f4f3ee',
                    borderRadius: '22px 22px 0 0',
                    aspectRatio: '16 / 9',
                  }}
                >
                  ✎
                </div>
              );
            })()}
          </div>
          <div className="project-title">
            <h3>{post.title}</h3>
            <BlogCounts path={`/blog/${post.slug}`} />
            <span
              className="project-context"
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineClamp: 2,
                }}
              >
                {post.excerpt}
              </span>
              {post.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#527747',
                    background: 'rgba(199,220,168,0.12)',
                    border: '1px solid rgba(82,119,71,0.25)',
                    borderRadius: 999,
                    padding: '4px 12px',
                  }}
                >
                  {t}
                </span>
              ))}
            </span>
          </div>
          <span
            className="project-category"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 12,
            }}
          >
            <span>
              {post.status === 'PUBLISHED' ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#527747',
                    background: 'rgba(199,220,168,0.12)',
                    border: '1px solid rgba(82,119,71,0.25)',
                    borderRadius: 999,
                    padding: '4px 12px',
                  }}
                >
                  Published
                </span>
              ) : null}
            </span>
            <span
              style={{
                color: '#556479',
                fontSize: 14,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {post.scheduledAt
                ? formatDate(post.scheduledAt)
                : formatDate(post.publishedAt)}
            </span>
          </span>
          <span className="project-arrow" aria-hidden="true">
            ↗
          </span>
        </TransitionLink>
      ))}
    </div>
  );
}
