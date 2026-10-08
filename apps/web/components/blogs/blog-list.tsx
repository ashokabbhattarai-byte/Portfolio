'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BlogCounts } from '@/components/analytics/blog-engagement';
import { TransitionLink } from '@/components/motion/transition-link';
import { travels, watchFlow } from '@/components/motion/flow';
import { estimateReadingTime } from '@/lib/blog-utils';
import type { Blog } from '@portfolio/types';
import styles from './blog-list.module.css';

gsap.registerPlugin(ScrollTrigger);

const PAGE_SIZE = 8;

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
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const b of blogs) {
      for (const t of b.tags) set.add(t);
    }
    return Array.from(set).slice(0, 8);
  }, [blogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return blogs.filter((b) => {
      const matchesTag =
        selectedTag === 'ALL' ||
        b.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase());
      if (!matchesTag) return false;
      if (!q) return true;
      return (
        b.title.toLowerCase().includes(q) ||
        b.excerpt.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [blogs, search, selectedTag]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, selectedTag]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    let cleanup: (() => void) | void;
    const arm = () => {
      const root = ref.current;
      if (!root || !travels()) return;
      const entries = gsap.utils.toArray<HTMLElement>(
        root.querySelectorAll('[data-blog-index-entry]'),
      );
      if (entries.length === 0) return;
      gsap.set(entries, { y: 24, opacity: 0 });
      const triggers = ScrollTrigger.batch(entries, {
        start: 'top 95%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            duration: 0.65,
            ease: 'power3.out',
            stagger: 0.05,
            overwrite: 'auto',
          }),
      });
      const cleanups = entries.map((element) => {
        const reveal = () =>
          gsap.to(element, {
            y: 0,
            opacity: 1,
            duration: 0.35,
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
      <div className={styles.emptyState}>
        <p className={styles.emptyMessage}>
          The first articles are in progress. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles by title, topic, or keyword…"
            aria-label="Search articles"
            className={styles.searchInput}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className={styles.clearBtn}
              aria-label="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        <span className={styles.countBadge}>
          {filtered.length === blogs.length
            ? `${blogs.length} articles`
            : `${filtered.length} of ${blogs.length} articles`}
        </span>
      </div>

      {allTags.length > 0 && (
        <div
          className={styles.tagFilters}
          role="group"
          aria-label="Filter by topic"
        >
          <button
            type="button"
            className={`${styles.filterPill} ${selectedTag === 'ALL' ? styles.isActive : ''}`}
            onClick={() => setSelectedTag('ALL')}
            aria-pressed={selectedTag === 'ALL'}
          >
            All topics
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`${styles.filterPill} ${
                selectedTag.toLowerCase() === tag.toLowerCase()
                  ? styles.isActive
                  : ''
              }`}
              onClick={() =>
                setSelectedTag((prev) =>
                  prev.toLowerCase() === tag.toLowerCase() ? 'ALL' : tag,
                )
              }
              aria-pressed={selectedTag.toLowerCase() === tag.toLowerCase()}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className={styles.articleList}>
        <div className={styles.listHeader} aria-hidden="true">
          <span>Article</span>
          <span>Published</span>
          <span>Read</span>
        </div>

        {visible.map((post) => {
          const dateStr = post.scheduledAt
            ? formatDate(post.scheduledAt)
            : formatDate(post.publishedAt);
          const { text: readTime } = estimateReadingTime(post.content);

          return (
            <TransitionLink
              key={post.id}
              href={`/blog/${post.slug}`}
              className={styles.articleRow}
              data-blog={post.slug}
              data-blog-index-entry
              data-flip-id={post.slug}
            >
              <div className={styles.articleContent}>
                <h3 className={styles.articleTitle}>{post.title}</h3>
                <p className={styles.articleExcerpt}>{post.excerpt}</p>
                <div className={styles.articleMeta}>
                  <BlogCounts path={`/blog/${post.slug}`} />
                  <span className={styles.metaDot} aria-hidden="true">
                    •
                  </span>
                  <span className={styles.readTimeText}>{readTime}</span>
                  {post.tags.slice(0, 2).map((t) => (
                    <span key={t} className={styles.tagPill}>
                      {t}
                    </span>
                  ))}
                  {dateStr ? (
                    <span className={styles.mobileDate}>{dateStr}</span>
                  ) : null}
                </div>
              </div>

              <div className={styles.dateCol}>{dateStr}</div>

              <div className={styles.arrowCol}>
                <span className={styles.arrowIcon} aria-hidden="true">
                  ↗
                </span>
              </div>
            </TransitionLink>
          );
        })}
      </div>

      {hasMore && (
        <div className={styles.loadMoreWrapper}>
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className={styles.loadMoreBtn}
          >
            Load more articles
          </button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className={styles.emptyState}>
          <p className={styles.emptyMessage}>
            No articles match{' '}
            {search ? `“${search}”` : `selected topic “${selectedTag}”`}.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedTag('ALL');
            }}
            className={styles.clearFilterBtn}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
