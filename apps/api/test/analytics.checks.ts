import { describe, expect, test } from 'bun:test';
import {
  AnalyticsService,
  analyticsWindow,
  canonicalPath,
} from '../src/analytics/analytics.service';
import { Prisma } from '../src/prisma/prisma-client';

describe('analytics collection', () => {
  test('uses inclusive UTC calendar days, leap dates, and bounded ranges', () => {
    expect(
      analyticsWindow(7, new Date('2024-03-01T15:00:00Z')).start.toISOString(),
    ).toBe('2024-02-24T00:00:00.000Z');
    expect(() => analyticsWindow('-999')).toThrow();
    expect(() => analyticsWindow('999999')).toThrow();
    expect(analyticsWindow('all').start.getTime()).toBe(0);
  });
  test('normalizes filters, fragments, aliases and trailing slashes', () => {
    expect(canonicalPath('/projects/?tab=AI#content')).toBe('/projects');
    expect(canonicalPath('/work/example')).toBe('/projects/example');
    expect(() => canonicalPath('//foreign.example')).toThrow();
    expect(() => canonicalPath('/\\foreign.example')).toThrow();
  });
  test('duplicate events count once and supplied content ids cannot corrupt counters', async () => {
    const events = new Map();
    let increments = 0;
    const readers = new Set<string>();
    const prisma = {
      blog: {
        findUnique: async () => ({
          id: 'real-blog',
          status: 'PUBLISHED',
          published: true,
        }),
      },
      $transaction: async (fn: Function) =>
        fn({
          pageView: {
            create: async ({ data }: any) => {
              if (events.has(data.id))
                throw new Prisma.PrismaClientKnownRequestError('duplicate', {
                  code: 'P2002',
                  clientVersion: '6',
                });
              events.set(data.id, data);
            },
          },
          blogView: {
            createMany: async ({ data }: any) => {
              const key = `${data[0].blogId}:${data[0].visitorHash}`;
              if (readers.has(key)) return { count: 0 };
              readers.add(key);
              return { count: 1 };
            },
          },
          blog: { update: async () => ({ viewCount: ++increments }) },
        }),
    };
    const service = new AnalyticsService(prisma as never);
    const event = {
      eventId: crypto.randomUUID(),
      visitorId: crypto.randomUUID(),
      path: '/blog/example?tracking=secret',
      referer: 'https://search.example/results?q=private',
      userAgent: 'Mozilla/5.0',
    };
    await Promise.all([service.track(event), service.track(event)]);
    expect(events.size).toBe(1);
    expect(increments).toBe(1);
    const saved = [...events.values()][0];
    expect(saved.blogId).toBe('real-blog');
    expect(saved.path).toBe('/blog/example');
    expect(saved.referer).toBe('https://search.example');
    expect(saved.ipHash).toStartWith('v2:');
    // New event IDs represent reloads, new tabs, and return visits.
    await Promise.all(
      Array.from({ length: 10 }, () =>
        service.track({
          ...event,
          eventId: crypto.randomUUID(),
        }),
      ),
    );
    expect(events.size).toBe(11);
    expect(increments).toBe(1);
    await service.track({
      ...event,
      eventId: crypto.randomUUID(),
      visitorId: crypto.randomUUID(),
    });
    expect(increments).toBe(2);
    await service.track({
      ...event,
      eventId: crypto.randomUUID(),
      visitorId: undefined,
    });
    expect(increments).toBe(2);
  });
  test('rejects bots and non-public destinations without creating events', async () => {
    let wrote = false;
    const service = new AnalyticsService({
      blog: { findUnique: async () => ({ status: 'DRAFT', published: false }) },
      $transaction: async () => {
        wrote = true;
      },
    } as never);
    for (const event of [
      { path: '/', userAgent: 'Googlebot' },
      { path: '/admin' },
      { path: '/api/secret' },
      { path: '/blog/private' },
    ])
      await service.track({ ...event, eventId: crypto.randomUUID() });
    expect(wrote).toBe(false);
  });
  test('propagates storage failures so clients can retry instead of acknowledging lost views', async () => {
    const service = new AnalyticsService({
      $transaction: async () => {
        throw new Error('offline');
      },
    } as never);
    await expect(
      service.track({ path: '/', eventId: crypto.randomUUID() }),
    ).rejects.toThrow('offline');
  });
});

test('rankings and topics use the selected window, never lifetime counter fallbacks', async () => {
  const blogs = Array.from({ length: 6 }, (_, i) => ({
    id: `blog-${i}`,
    slug: `blog-${i}`,
    title: `Blog ${i}`,
    coverImage: null,
    viewCount: i === 5 ? 0 : 999,
    tags: [i === 5 ? 'Active' : 'Old'],
  }));
  const service = new AnalyticsService({
    blog: { findMany: async () => blogs },
    project: { findMany: async () => [] },
    blogLike: { groupBy: async () => [] },
  } as never);
  (service as any).report = async () => ({
    totals: { views: 3n, blogs: 3n, projects: 0n, unique: 1n },
    routes: [
      { path: '/blog/blog-5', blogId: 'blog-5', projectId: null, views: 3n },
    ],
    daily: [{ date: '2026-09-13', views: 3 }],
  });
  const result = await service.getOverview('7');
  expect(result.topBlogs.map((row) => row.blog.id)).toEqual(['blog-5']);
  expect(result.topBlogs[0].views).toBe(3);
  expect(result.byTag).toEqual([{ tag: 'Active', views: 3 }]);
  expect(result.topProjects).toEqual([]);
});

test('soft-deleted articles cannot collect or expose engagement', async () => {
  const service = new AnalyticsService({
    blog: {
      findUnique: async () => ({
        id: 'deleted',
        status: 'PUBLISHED',
        published: true,
        deletedAt: new Date(),
      }),
    },
  } as never);
  expect(
    await service.track({
      path: '/blog/deleted',
      eventId: crypto.randomUUID(),
      visitorId: crypto.randomUUID(),
    }),
  ).toEqual({ ok: true, skipped: 'not-public' });
  expect((await service.publicCount('/blog/deleted')).views).toBeNull();
});

test('public article views use unique reader records, not repeat visit totals', async () => {
  const service = new AnalyticsService({
    blog: {
      findUnique: async () => ({
        id: 'blog',
        status: 'PUBLISHED',
        published: true,
      }),
    },
    blogView: { count: async () => 2 },
    pageView: { count: async () => 17 },
    blogLike: { count: async () => 0 },
  } as never);
  expect((await service.publicCount('/blog/example')).views).toBe(2);
  expect((await service.publicCount('/')).views).toBe(17);
});

describe('analytics helpers', () => {
  const {
    parseUserAgent,
    categorizeReferrer,
    calculateDelta,
  } = require('../src/analytics/analytics.helpers');

  test('parses devices, browsers and operating systems correctly', () => {
    const iphone = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    );
    expect(iphone).toEqual({
      device: 'Mobile',
      browser: 'Safari',
      os: 'iOS',
    });

    const macChrome = parseUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    expect(macChrome).toEqual({
      device: 'Desktop',
      browser: 'Chrome',
      os: 'macOS',
    });

    const ipad = parseUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    );
    expect(ipad.device).toBe('Tablet');
  });

  test('categorizes referrers accurately into search, social, ai, direct and referral', () => {
    expect(categorizeReferrer('https://www.google.com/search?q=test')).toBe(
      'search',
    );
    expect(categorizeReferrer('https://duckduckgo.com/')).toBe('search');
    expect(categorizeReferrer('https://t.co/xyz123')).toBe('social');
    expect(categorizeReferrer('https://www.linkedin.com/feed')).toBe('social');
    expect(categorizeReferrer('https://chatgpt.com/')).toBe('ai');
    expect(categorizeReferrer('https://claude.ai/chat')).toBe('ai');
    expect(categorizeReferrer(null)).toBe('direct');
    expect(categorizeReferrer('https://myblog.com', 'https://myblog.com')).toBe(
      'internal',
    );
    expect(categorizeReferrer('https://awesome-site.org/post')).toBe(
      'referral',
    );
  });

  test('calculates period deltas accurately', () => {
    expect(calculateDelta(150, 100)).toBe(50.0);
    expect(calculateDelta(80, 100)).toBe(-20.0);
    expect(calculateDelta(10, 0)).toBe(100.0);
    expect(calculateDelta(0, 0)).toBe(0.0);
  });
});
