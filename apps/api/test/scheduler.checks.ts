import { describe, expect, test } from 'bun:test';
import { BlogScheduler } from '../src/blogs/blog-scheduler.service';
import { BlogsService } from '../src/blogs/blogs.service';

/**
 * The scheduler's contract is "publish each due article exactly once", which
 * three separate mechanisms defend:
 *
 *  1. `FOR UPDATE SKIP LOCKED` in the claim query, so two API replicas running
 *     the same tick take disjoint sets of rows.
 *  2. The status flip inside the same transaction, so a row is no longer due
 *     once committed.
 *  3. A `running` flag in BlogScheduler, so a slow tick cannot overlap itself.
 *
 * (1) needs Postgres and is covered by the live e2e run; (2) and (3) are
 * verified here.
 */

/** Prisma double whose `blogs` table actually changes state, so a second pass
 *  over the same rows can be observed returning nothing. */
function database(due: { id: string; status: string }[]) {
  const rows = new Map(due.map((row) => [row.id, { ...row }]));
  const published: string[] = [];
  const audits: string[] = [];

  const client = {
    blog: {
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        slug: where.id,
        title: 'Scheduled article',
        excerpt: 'A summary long enough to publish.',
        content: 'Body content long enough to publish.',
        tags: [],
        status: rows.get(where.id)?.status,
        version: 1,
        publishedAt: null,
        scheduledAt: new Date(Date.now() - 1000),
        images: [],
        inlineMedia: [],
        featuredImage: null,
        ogImage: null,
        author: null,
        deletedAt: null,
      }),
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { status?: string };
      }) => {
        const row = rows.get(where.id);
        if (row && data.status) row.status = data.status;
        if (data.status === 'PUBLISHED') published.push(where.id);
        return { ...row, images: [], inlineMedia: [] };
      },
    },
    blogRevision: { create: async () => ({}) },
    auditEvent: {
      create: async ({ data }: { data: { action: string } }) => {
        audits.push(data.action);
        return data;
      },
    },
    /* Stands in for the claim query: only rows still SCHEDULED are due. */
    $queryRaw: async () =>
      [...rows.values()]
        .filter((row) => row.status === 'SCHEDULED')
        .map((row) => ({ id: row.id })),
    $executeRaw: async () => 0,
  };

  return {
    prisma: {
      ...client,
      $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) =>
        fn(client),
    },
    published: () => published,
    audits: () => audits,
  };
}

describe('scheduled publication', () => {
  test('publishes a due article once, and finds nothing on the next tick', async () => {
    const db = database([
      { id: 'a', status: 'SCHEDULED' },
      { id: 'b', status: 'SCHEDULED' },
    ]);
    const blogs = new BlogsService(
      db.prisma as never,
      {
        trigger() {},
      } as never,
    );

    expect(await blogs.publishDue()).toBe(2);
    expect(db.published()).toEqual(['a', 'b']);

    // Second sweep: the rows are PUBLISHED now, so nothing is claimed again.
    expect(await blogs.publishDue()).toBe(0);
    expect(db.published()).toEqual(['a', 'b']);
  });

  test('records the publication against the SYSTEM actor', async () => {
    const db = database([{ id: 'a', status: 'SCHEDULED' }]);
    const blogs = new BlogsService(
      db.prisma as never,
      {
        trigger() {},
      } as never,
    );
    await blogs.publishDue();
    expect(db.audits()).toContain('BLOG_PUBLISHED');
  });

  test('overlapping ticks do not double-publish', async () => {
    let inFlight = 0;
    let maxConcurrent = 0;
    let calls = 0;

    const blogs = {
      publishDue: async () => {
        calls += 1;
        inFlight += 1;
        maxConcurrent = Math.max(maxConcurrent, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 30));
        inFlight -= 1;
        return 1;
      },
    } as unknown as BlogsService;

    const scheduler = new BlogScheduler(
      blogs,
      { get: () => undefined } as never,
      { record: async () => undefined } as never,
    );

    // Three ticks fired while the first is still working.
    await Promise.all([scheduler.tick(), scheduler.tick(), scheduler.tick()]);

    expect(maxConcurrent).toBe(1);
    expect(calls).toBe(1);
  });

  test('a failing sweep is swallowed so the next tick still runs', async () => {
    let attempts = 0;
    const blogs = {
      publishDue: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('database unavailable');
        return 0;
      },
    } as unknown as BlogsService;

    const scheduler = new BlogScheduler(
      blogs,
      { get: () => undefined } as never,
      { record: async () => undefined } as never,
    );

    await scheduler.tick(); // throws internally, must not reject
    await scheduler.tick();
    expect(attempts).toBe(2);
  });
});
