'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PublicViewCount, SetBlogLike } from '@portfolio/types';
import { visitorId } from '@/lib/visitor-identity';

function Eye() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function Heart({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
export function BlogCounts({ path }: { path: string }) {
  // All cards share one request; counts never create tracking events.
  const { data, isError } = useQuery<PublicViewCount[]>({
    queryKey: ['blog-counts'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/blog-counts');
      if (!response.ok) throw new Error('Counts unavailable');
      return response.json();
    },
    staleTime: 30000,
    retry: 1,
  });
  const count = data?.find((row) => row.path === path);
  if (!count)
    return (
      <span className="blog-engagement-muted">
        {isError || data ? 'Counts unavailable' : 'Loading counts…'}
      </span>
    );
  return (
    <span className="blog-engagement-summary">
      <span>
        <Eye />
        {count.views?.toLocaleString()} {count.views === 1 ? 'view' : 'views'}
      </span>
      <span>
        <Heart />
        {(count.likes ?? 0).toLocaleString()}{' '}
        {count.likes === 1 ? 'like' : 'likes'}
      </span>
    </span>
  );
}
export function BlogEngagement({ path }: { path: string }) {
  const qc = useQueryClient();
  const key = ['public-views', path];
  const query = useQuery<PublicViewCount>({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/analytics/views?path=${encodeURIComponent(path)}`,
        { headers: { 'x-visitor-id': visitorId() }, cache: 'no-store', signal },
      );
      if (!response.ok) throw new Error('Counts unavailable');
      return response.json();
    },
    staleTime: 30000,
    retry: 1,
  });
  const mutation = useMutation({
    onMutate: () => qc.cancelQueries({ queryKey: key }),
    mutationFn: async (liked: boolean): Promise<PublicViewCount> => {
      const payload: SetBlogLike = { path, liked, visitorId: visitorId() };
      const response = await fetch('/api/analytics/like', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok)
        throw new Error('Your like could not be saved. Please try again.');
      return response.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(key, data);
      void qc.invalidateQueries({ queryKey: ['blog-counts'] });
      void qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
  const count = query.data;
  return (
    <div className="blog-engagement" aria-label="Article readership and likes">
      {count?.views != null ? (
        <span className="blog-engagement-views">
          <Eye />
          {count.views.toLocaleString()} {count.views === 1 ? 'view' : 'views'}
        </span>
      ) : (
        <span className="blog-engagement-muted">
          {query.isError || query.data
            ? 'Counts unavailable'
            : 'Loading counts…'}
        </span>
      )}
      <button
        type="button"
        className="blog-like-button"
        aria-pressed={count?.liked ?? false}
        aria-label={count?.liked ? 'Remove your like' : 'Like this article'}
        disabled={mutation.isPending || count?.likes == null}
        onClick={() => mutation.mutate(!count?.liked)}
      >
        <Heart filled={count?.liked} />
        <span>
          {mutation.isPending
            ? 'Saving…'
            : count?.likes == null
              ? 'Like'
              : `${count.likes.toLocaleString()} ${count.likes === 1 ? 'like' : 'likes'}`}
        </span>
      </button>
      <span className="sr-only" role="status">
        {mutation.isSuccess
          ? count?.liked
            ? 'Article liked.'
            : 'Like removed.'
          : ''}
      </span>
      {mutation.isError && (
        <span className="blog-like-error" role="alert">
          {mutation.error.message}
        </span>
      )}
      {query.isError && (
        <button className="text-link" onClick={() => void query.refetch()}>
          Retry
        </button>
      )}
    </div>
  );
}
