'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicViewCount, SetBlogLike } from '@portfolio/types';
import { visitorId } from '@/lib/visitor-identity';
import {
  blogCountsOptions,
  publicViewsOptions,
  updateEngagementCache,
} from '@/lib/engagement-queries';
import styles from './blog-engagement.module.css';

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeartIcon({
  filled = false,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? '#ff3366' : 'none'}
      stroke={filled ? '#ff3366' : 'currentColor'}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

export function BlogCounts({ path }: { path: string }) {
  const qc = useQueryClient();
  const { data, isError } = useQuery(blogCountsOptions());
  const count = data?.find((row) => row.path === path);

  const views = count?.views ?? 0;
  const likes = count?.likes ?? 0;
  const isLiked = count?.liked ?? false;
  const [popping, setPopping] = useState(false);

  const mutation = useMutation({
    mutationFn: async (nextLiked: boolean): Promise<PublicViewCount> => {
      const payload: SetBlogLike = {
        path,
        liked: nextLiked,
        visitorId: await visitorId(),
      };
      const response = await fetch('/api/analytics/like', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!response.ok) throw new Error('Could not sync like.');
      return response.json();
    },
    onMutate: async (nextLiked) => {
      await qc.cancelQueries({ queryKey: ['blog-counts'] });
      const prev = qc.getQueryData<PublicViewCount[]>(['blog-counts']);
      const optimisticLikes = Math.max(0, likes + (nextLiked ? 1 : -1));

      qc.setQueryData<PublicViewCount[]>(['blog-counts'], (old) =>
        old?.map((row) =>
          row.path === path
            ? { ...row, likes: optimisticLikes, liked: nextLiked }
            : row,
        ),
      );

      qc.setQueryData<PublicViewCount>(['public-views', path], (old) =>
        old ? { ...old, likes: optimisticLikes, liked: nextLiked } : undefined,
      );

      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['blog-counts'], ctx.prev);
    },
    onSuccess: (data) => updateEngagementCache(qc, data),
  });

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !isLiked;
    if (nextState) {
      setPopping(true);
      setTimeout(() => setPopping(false), 500);
    }
    mutation.mutate(nextState);
  };

  if (!count) {
    return (
      <span className={styles.summary}>
        <span className={styles.summaryItem}>
          <EyeIcon />
          <span>{isError ? '—' : '…'}</span>
        </span>
        <span className={styles.summaryItem}>
          <HeartIcon />
          <span>{isError ? '—' : '…'}</span>
        </span>
      </span>
    );
  }

  return (
    <span className={styles.summary}>
      <span
        className={styles.summaryItem}
        title="Unique readers who have viewed this article."
      >
        <EyeIcon />
        <span>
          {views.toLocaleString()} {views === 1 ? 'view' : 'views'}
        </span>
      </span>

      <button
        type="button"
        className={`${styles.cardLikeBtn} ${isLiked ? styles.isLiked : ''}`}
        onClick={handleLike}
        aria-label={isLiked ? 'Unlike article' : 'Like article'}
        title={isLiked ? 'Liked' : 'Like'}
      >
        <HeartIcon
          filled={isLiked}
          className={`${styles.heartIcon} ${popping ? styles.isPopping : ''}`}
        />
        <span>{likes.toLocaleString()}</span>
      </button>
    </span>
  );
}

export function BlogEngagement({ path }: { path: string }) {
  const qc = useQueryClient();
  const key = ['public-views', path];
  const query = useQuery(publicViewsOptions(path));

  const [popping, setPopping] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const popTimer = useRef<number | null>(null);

  const serverData = query.data;
  const isLiked = serverData?.liked ?? false;
  const likesCount = serverData?.likes ?? 0;
  const viewsCount = serverData?.views ?? 0;

  const mutation = useMutation({
    mutationFn: async (nextLiked: boolean): Promise<PublicViewCount> => {
      const payload: SetBlogLike = {
        path,
        liked: nextLiked,
        visitorId: await visitorId(),
      };
      const response = await fetch('/api/analytics/like', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!response.ok) {
        throw new Error('Could not sync like. Please try again.');
      }
      return response.json();
    },
    onMutate: async (nextLiked) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PublicViewCount>(key);

      // Optimistic instant write
      const optimisticLikes = Math.max(
        0,
        (previous?.likes ?? likesCount) + (nextLiked ? 1 : -1),
      );

      qc.setQueryData<PublicViewCount>(key, (old) =>
        old
          ? {
              ...old,
              liked: nextLiked,
              likes: optimisticLikes,
            }
          : {
              path,
              views: viewsCount,
              likes: optimisticLikes,
              liked: nextLiked,
            },
      );

      // Also update shared blog list query cache
      qc.setQueryData<PublicViewCount[]>(['blog-counts'], (old) =>
        old?.map((row) =>
          row.path === path ? { ...row, likes: optimisticLikes } : row,
        ),
      );

      return { previous };
    },
    onError: (err, _nextLiked, context) => {
      if (context?.previous) {
        qc.setQueryData(key, context.previous);
        qc.setQueryData<PublicViewCount[]>(['blog-counts'], (old) =>
          old?.map((row) =>
            row.path === path
              ? { ...row, likes: context.previous?.likes ?? row.likes }
              : row,
          ),
        );
      }
      setShaking(true);
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to save like.',
      );
      setTimeout(() => setShaking(false), 500);
      setTimeout(() => setErrorMessage(''), 3500);
    },
    onSuccess: (data) => {
      updateEngagementCache(qc, data);
    },
  });

  const handleToggleLike = useCallback(() => {
    const nextState = !isLiked;
    if (nextState) {
      setPopping(true);
      if (popTimer.current) window.clearTimeout(popTimer.current);
      popTimer.current = window.setTimeout(() => setPopping(false), 600);
    }
    mutation.mutate(nextState);
  }, [isLiked, mutation]);

  return (
    <div
      className={styles.engagement}
      aria-label="Article readership and likes"
    >
      <span
        className={styles.viewsCount}
        title="Unique readers recorded for this article."
      >
        <EyeIcon />
        <span>
          {viewsCount.toLocaleString()} {viewsCount === 1 ? 'view' : 'views'}
        </span>
      </span>

      <button
        type="button"
        className={`${styles.likeBtn} ${isLiked ? styles.isLiked : ''} ${
          shaking ? styles.isShaking : ''
        }`}
        aria-pressed={isLiked}
        aria-label={isLiked ? 'Remove like' : 'Like article'}
        onClick={handleToggleLike}
      >
        <span className={styles.heartWrapper}>
          <HeartIcon
            filled={isLiked}
            className={`${styles.heartIcon} ${popping ? styles.isPopping : ''}`}
          />
          <span className={styles.particles} aria-hidden="true">
            <span className={styles.particle} />
            <span className={styles.particle} />
            <span className={styles.particle} />
            <span className={styles.particle} />
            <span className={styles.particle} />
            <span className={styles.particle} />
          </span>
        </span>

        <span className={styles.likeCount}>
          {likesCount > 0
            ? `${likesCount.toLocaleString()} ${likesCount === 1 ? 'like' : 'likes'}`
            : 'Like'}
        </span>
      </button>

      {errorMessage && (
        <span className={styles.feedbackToast} role="alert">
          {errorMessage}
        </span>
      )}
    </div>
  );
}

export function BlogFloatingEngagement({
  path,
  title,
}: {
  path: string;
  title: string;
}) {
  const qc = useQueryClient();
  const key = ['public-views', path];
  const query = useQuery(publicViewsOptions(path));
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [popping, setPopping] = useState(false);

  const isLiked = query.data?.liked ?? false;
  const likesCount = query.data?.likes ?? 0;

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 420;
      setVisible(scrolled);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const mutation = useMutation({
    mutationFn: async (nextLiked: boolean): Promise<PublicViewCount> => {
      const payload: SetBlogLike = {
        path,
        liked: nextLiked,
        visitorId: await visitorId(),
      };
      const response = await fetch('/api/analytics/like', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      if (!response.ok) throw new Error('Could not sync like.');
      return response.json();
    },
    onMutate: async (nextLiked) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PublicViewCount>(key);
      const optimisticLikes = Math.max(
        0,
        (previous?.likes ?? likesCount) + (nextLiked ? 1 : -1),
      );
      qc.setQueryData<PublicViewCount>(key, (old) =>
        old ? { ...old, liked: nextLiked, likes: optimisticLikes } : undefined,
      );
      return { previous };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSuccess: (data) => updateEngagementCache(qc, data),
  });

  const handleToggle = () => {
    const nextState = !isLiked;
    if (nextState) setPopping(true);
    setTimeout(() => setPopping(false), 500);
    mutation.mutate(nextState);
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        /* User cancelled or fallback */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <aside
      className={`${styles.floatingBar} ${!visible ? styles.isHidden : ''}`}
      aria-label="Quick engagement bar"
    >
      <button
        type="button"
        className={`${styles.floatingBtn} ${isLiked ? styles.isLiked : ''}`}
        onClick={handleToggle}
        aria-label={isLiked ? 'Unlike article' : 'Like article'}
      >
        <span className={styles.heartWrapper}>
          <HeartIcon
            filled={isLiked}
            className={`${styles.heartIcon} ${popping ? styles.isPopping : ''}`}
          />
        </span>
        <span>{likesCount > 0 ? likesCount : 'Like'}</span>
      </button>

      <div className={styles.floatingSep} aria-hidden="true" />

      <button
        type="button"
        className={styles.floatingBtn}
        onClick={handleShare}
        aria-label="Share article"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <span>{copied ? 'Copied!' : 'Share'}</span>
      </button>
    </aside>
  );
}
