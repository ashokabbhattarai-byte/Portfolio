import { afterEach, expect, test } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import { blogCountsOptions, updateEngagementCache } from './engagement-queries';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('50 simultaneous cards and repeat mounts share one counts request', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return Response.json([{ path: '/blog/a', views: 2, likes: 1 }]);
  }) as typeof fetch;
  const client = new QueryClient();
  try {
    await Promise.all(
      Array.from({ length: 50 }, () => client.fetchQuery(blogCountsOptions())),
    );
    await client.fetchQuery(blogCountsOptions());
    expect(calls).toBe(1);
    await updateEngagementCache(client, {
      path: '/blog/a',
      views: 3,
      likes: 2,
      liked: true,
    });
    expect(calls).toBe(1);
    expect(client.getQueryData(['blog-counts'])).toEqual([
      { path: '/blog/a', views: 3, likes: 2 },
    ]);
  } finally {
    client.clear();
  }
});

test('late initial reads cannot overwrite write results or leak liked state to cards', async () => {
  const client = new QueryClient();
  const key = ['public-views', '/blog/a'];
  const initial = client.fetchQuery({
    queryKey: key,
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { path: '/blog/a', views: 1, likes: 4, liked: true };
    },
  });
  await updateEngagementCache(client, { path: '/blog/a', views: 2 });
  await initial;
  expect(client.getQueryData(key)).toEqual({
    path: '/blog/a',
    views: 2,
    likes: 4,
    liked: true,
  });
  await updateEngagementCache(client, { path: '/blog/a', views: 1 });
  expect(client.getQueryData<{ views: number }>(key)?.views).toBe(2);
  client.clear();
});

test('counter failures do not automatically retry', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return new Response('', { status: 503 });
  }) as typeof fetch;
  const client = new QueryClient();
  await expect(client.fetchQuery(blogCountsOptions())).rejects.toThrow(
    'Counts unavailable',
  );
  expect(calls).toBe(1);
  client.clear();
});
