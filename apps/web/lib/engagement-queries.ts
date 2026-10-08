import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { PublicViewCount } from '@portfolio/types';
import { visitorId } from './visitor-identity';

const policy = {
  staleTime: 5_000,
  gcTime: 10 * 60_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: true,
  retry: false,
} as const;

export const blogCountsOptions = () =>
  queryOptions({
    ...policy,
    queryKey: ['blog-counts'],
    queryFn: async (): Promise<PublicViewCount[]> => {
      const response = await fetch('/api/analytics/blog-counts', {
        headers: { 'x-visitor-id': await visitorId() },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Counts unavailable');
      return response.json();
    },
  });

export const publicViewsOptions = (path: string) =>
  queryOptions({
    ...policy,
    queryKey: ['public-views', path],
    queryFn: async (): Promise<PublicViewCount> => {
      const response = await fetch(
        `/api/analytics/views?path=${encodeURIComponent(path)}`,
        {
          headers: { 'x-visitor-id': await visitorId() },
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) throw new Error('Counts unavailable');
      return response.json();
    },
  });

/** Apply authoritative write responses without another round trip. */
export async function updateEngagementCache(
  client: QueryClient,
  count: Pick<PublicViewCount, 'path' | 'views'> & Partial<PublicViewCount>,
) {
  const key = ['public-views', count.path];
  // An initial GET may have started before the write; apply the write last.
  await client
    .getQueryCache()
    .find({ queryKey: key, exact: true })
    ?.promise?.catch(() => undefined);
  client.setQueryData<PublicViewCount>(key, (old) =>
    old
      ? { ...old, ...count, views: Math.max(old.views ?? 0, count.views ?? 0) }
      : undefined,
  );
  await client
    .getQueryCache()
    .find({ queryKey: ['blog-counts'], exact: true })
    ?.promise?.catch(() => undefined);
  client.setQueryData<PublicViewCount[]>(['blog-counts'], (old) =>
    old?.map((row) =>
      row.path === count.path
        ? {
            ...row,
            views: Math.max(row.views ?? 0, count.views ?? 0),
            ...(count.likes == null ? {} : { likes: count.likes }),
          }
        : row,
    ),
  );
}
