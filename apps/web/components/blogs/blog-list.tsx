'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BlogCounts } from '@/components/analytics/blog-engagement';
import Image from 'next/image';
import { TransitionLink } from '@/components/motion/transition-link';
import { travels, watchFlow } from '@/components/motion/flow';
import type { Blog } from '@portfolio/types';

gsap.registerPlugin(ScrollTrigger);

const PAGE_SIZE = 6;

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
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* Collect all unique tags */
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    blogs.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [blogs]);

  /* Filter blogs by search + tag */
  const filtered = useMemo(() => {
    let result = blogs;
    if (activeTag) {
      result = result.filter((b) => b.tags.includes(activeTag));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.excerpt.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [blogs, search, activeTag]);

  /* Reset visible count when filters change */
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, activeTag]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  /* GSAP scroll reveal */
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
  }, [visible.length]);

  if (blogs.length === 0) {
    return (
      <div
        style={{
          marginTop: 24,
          background: '#fff',
          borderRadius: 22,
          border: '1px solid var(--line)',
          padding: 40,
        }}
      >
        <p style={{ color: 'var(--muted)', fontSize: 17, margin: 0 }}>
          The first articles are in progress. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ marginTop: 28 }}>
      {/* Search + Tag Filters */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              border: '1.5px solid var(--line)',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(8px)',
              fontSize: 15,
              color: 'var(--ink)',
              outline: 'none',
              transition: 'border-color 200ms ease',
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = 'var(--accent)')
            }
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 16,
              color: 'var(--muted)',
              pointerEvents: 'none',
            }}
          >
            ⌕
          </span>
        </div>

        {/* Tag pills */}
        {allTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setActiveTag(null)}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                border: '1.5px solid',
                borderColor: !activeTag ? 'var(--accent)' : 'var(--line)',
                background: !activeTag
                  ? 'var(--accent)'
                  : 'rgba(255,255,255,0.6)',
                color: !activeTag ? '#fff' : 'var(--muted)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 200ms ease',
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: '1.5px solid',
                  borderColor:
                    activeTag === tag ? 'var(--accent)' : 'var(--line)',
                  background:
                    activeTag === tag
                      ? 'var(--accent)'
                      : 'rgba(255,255,255,0.6)',
                  color: activeTag === tag ? '#fff' : 'var(--muted)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Result count */}
        <p
          style={{
            fontSize: 14,
            color: 'var(--muted)',
            margin: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {filtered.length === blogs.length
            ? `${blogs.length} articles`
            : `${filtered.length} of ${blogs.length} articles`}
        </p>
      </div>

      {/* Blog entries */}
      <div className="project-collection list">
        <div className="work-columns utility">
          <span>Article</span>
          <span>Published</span>
          <span>Read</span>
        </div>
        {visible.map((post) => (
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
                    (i) =>
                      i.placement === 'COVER' || i.placement === 'THUMBNAIL',
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
                      background: 'var(--deep)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 32,
                      color: 'var(--paper)',
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
                      color: 'var(--accent)',
                      background:
                        'color-mix(in srgb, var(--highlight) 12%, transparent)',
                      border:
                        '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
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
                      color: 'var(--accent)',
                      background:
                        'color-mix(in srgb, var(--highlight) 12%, transparent)',
                      border:
                        '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
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
                  color: 'var(--muted)',
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

      {/* Load More */}
      {hasMore && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 40,
          }}
        >
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="round-button"
            style={{
              padding: '14px 36px',
              borderRadius: 999,
              border: '1.5px solid var(--line)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 300ms var(--ease)',
            }}
          >
            Load more articles
          </button>
        </div>
      )}

      {/* No results */}
      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: 'var(--muted)',
          }}
        >
          <p style={{ fontSize: 17, margin: '0 0 8px' }}>
            No articles match your search.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setActiveTag(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
