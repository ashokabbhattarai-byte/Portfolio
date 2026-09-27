import { expect, test } from 'bun:test';
import { PrismaClient } from '../src/prisma/prisma-client';
import { AnalyticsService } from '../src/analytics/analytics.service';
test('PostgreSQL counts match daily buckets and windowed visitors', async () => {
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_ANALYTICS_FIXTURE');
  const path = `/analytics-check-${crypto.randomUUID()}`;
  try {
    await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const old = new Date(now);
        old.setUTCDate(old.getUTCDate() - 40);
        await tx.pageView.createMany({
          data: [
            { path, ipHash: `v2:${path}-a`, createdAt: now },
            { path, ipHash: `v2:${path}-a`, createdAt: now },
            { path, ipHash: null, createdAt: now },
            { path, ipHash: `v2:${path}-b`, createdAt: old },
          ],
        });
        const wrapper = new Proxy(tx, {
          get(target, key) {
            if (key === '$transaction') return async (fn: Function) => fn(tx);
            return Reflect.get(target, key);
          },
        });
        const service = new AnalyticsService(wrapper as never);
        const recent = await service.getRouteAnalytics(path, '7');
        expect(recent.views).toBe(3);
        expect(recent.uniqueViews).toBe(1);
        expect(recent.daily).toHaveLength(7);
        expect(recent.daily.reduce((sum, day) => sum + day.views, 0)).toBe(3);
        expect(recent.topReferers[0]).toEqual({
          referer: 'Direct / unknown',
          count: 3,
        });
        const all = await service.getRouteAnalytics(path, 'all');
        expect(all.views).toBe(4);
        expect(all.uniqueViews).toBe(2);
        expect(all.daily.reduce((sum, day) => sum + day.views, 0)).toBe(4);
        const routes = await service.getAllRoutesAnalytics('7');
        expect(routes.find((row) => row.path === path)?.unique).toBe(1);
        throw rollback;
      },
      { timeout: 20000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
}, 30000);

test('visits respect the 30-minute gap across pages and the reporting boundary', async () => {
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_SESSION_FIXTURE');
  const id = crypto.randomUUID();
  const path = `/session-check-${id}`;
  try {
    await prisma.$transaction(
      async (tx) => {
        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - 6);
        const at = (minutes: number) =>
          new Date(start.getTime() + minutes * 60000);
        await tx.pageView.createMany({
          data: [
            { path: '/', ipHash: `v2:${id}`, createdAt: at(-10) },
            { path, ipHash: `v2:${id}`, createdAt: at(5) },
            { path, ipHash: `v2:${id}`, createdAt: at(34) },
            { path, ipHash: `v2:${id}`, createdAt: at(64) },
            { path, ipHash: null, createdAt: at(65) },
            { path, ipHash: `legacy-${id}`, createdAt: at(66) },
          ],
        });
        const wrapper = new Proxy(tx, {
          get(target, key) {
            if (key === '$transaction') return async (fn: Function) => fn(tx);
            return Reflect.get(target, key);
          },
        });
        const service = new AnalyticsService(wrapper as never);
        const report = await service.getRouteAnalytics(path, '7');
        expect(report.views).toBe(5);
        expect(report.uniqueViews).toBe(1);
        expect(report.uniquePageViews).toBe(1);
        expect(report.visits).toBe(1);
        expect(report.daily.reduce((sum, day) => sum + day.visits, 0)).toBe(1);
        expect(report.daily.reduce((sum, day) => sum + day.visitors, 0)).toBe(
          1,
        );
        throw rollback;
      },
      { timeout: 20000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
}, 30000);

test('likes persist once per browser, unlike is idempotent, drafts cannot be liked', async () => {
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_LIKES_FIXTURE');
  try {
    await prisma.$transaction(
      async (tx) => {
        const slug = `like-check-${crypto.randomUUID()}`;
        const blog = await tx.blog.create({
          data: {
            slug,
            title: 'Like check',
            excerpt: 'Test',
            content: 'Test',
            tags: [],
            published: true,
            status: 'PUBLISHED',
          },
        });
        const service = new AnalyticsService(tx as never);
        const first = {
          path: `/blog/${slug}`,
          visitorId: crypto.randomUUID(),
          liked: true,
        };
        expect((await service.setLike(first)).likes).toBe(1);
        expect((await service.setLike(first)).likes).toBe(1);
        expect(
          (await service.setLike({ ...first, visitorId: crypto.randomUUID() }))
            .likes,
        ).toBe(2);
        expect(
          (await service.publicCount(first.path, first.visitorId)).liked,
        ).toBe(true);
        expect((await service.setLike({ ...first, liked: false })).likes).toBe(
          1,
        );
        expect((await service.setLike({ ...first, liked: false })).likes).toBe(
          1,
        );
        expect(
          (await service.publicCount(first.path, first.visitorId)).liked,
        ).toBe(false);
        expect(
          (await service.blogCounts()).find((row) => row.path === first.path)
            ?.likes,
        ).toBe(1);
        await tx.blog.update({
          where: { id: blog.id },
          data: { status: 'DRAFT', published: false },
        });
        await expect(service.setLike(first)).rejects.toThrow(
          'Article unavailable.',
        );
        expect(
          (await service.blogCounts()).some((row) => row.path === first.path),
        ).toBe(false);
        throw rollback;
      },
      { timeout: 25000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    await prisma.$disconnect();
  }
}, 30000);

test('overview returns coherent daily totals and engagement rankings from PostgreSQL', async () => {
  const prisma = new PrismaClient();
  try {
    const report = await new AnalyticsService(prisma as never).getOverview('7');
    expect(report.daily.reduce((sum, row) => sum + row.views, 0)).toBe(
      report.totals.pageViews,
    );
    expect(report.daily.reduce((sum, row) => sum + row.visits, 0)).toBe(
      report.totals.visits,
    );
    expect(report.totals.uniqueVisitors).toBeLessThanOrEqual(
      report.totals.uniquePageViews,
    );
    expect(report.totals.uniquePageViews).toBeLessThanOrEqual(
      report.totals.pageViews,
    );
    expect(report.mostLiked.every((row) => row.likes > 0)).toBe(true);
    expect(
      report.topReferers.reduce((sum, row) => sum + row.count, 0),
    ).toBeLessThanOrEqual(report.totals.pageViews);
  } finally {
    await prisma.$disconnect();
  }
}, 30000);

test('concurrent refreshes count one reader per article and roll back failed claims', async () => {
  const prisma = new PrismaClient();
  const service = new AnalyticsService(prisma as never);
  const prefix = `unique-views-${crypto.randomUUID()}`;
  const ids: string[] = [];
  try {
    for (const suffix of ['a', 'b']) {
      const blog = await prisma.blog.create({
        data: {
          slug: `${prefix}-${suffix}`,
          title: 'Unique view fixture',
          excerpt: 'Test',
          content: 'Test',
          tags: [],
          status: 'PUBLISHED',
          published: true,
        },
      });
      ids.push(blog.id);
    }
    const visitorId = crypto.randomUUID();
    const path = `/blog/${prefix}-a`;
    const track = (overrides = {}) =>
      service.track({
        path,
        visitorId,
        eventId: crypto.randomUUID(),
        userAgent: 'Mozilla/5.0',
        ...overrides,
      });
    await Promise.all(Array.from({ length: 12 }, () => track()));
    expect((await service.publicCount(path)).views).toBe(1);
    expect(
      (await prisma.blog.findUniqueOrThrow({ where: { id: ids[0] } }))
        .viewCount,
    ).toBe(1);
    expect(await prisma.pageView.count({ where: { blogId: ids[0] } })).toBe(12);
    const eventId = crypto.randomUUID();
    await Promise.all([track({ eventId }), track({ eventId })]);
    expect(await prisma.pageView.count({ where: { blogId: ids[0] } })).toBe(13);
    await track({ visitorId: crypto.randomUUID() });
    await track({ visitorId: undefined });
    expect((await service.publicCount(path)).views).toBe(2);
    await track({ path: `/blog/${prefix}-b` });
    expect((await service.publicCount(`/blog/${prefix}-b`)).views).toBe(1);
    // Replaying an event from another article must roll back the new reader claim.
    await track({
      path: `/blog/${prefix}-b`,
      eventId,
      visitorId: crypto.randomUUID(),
    });
    expect((await service.publicCount(`/blog/${prefix}-b`)).views).toBe(1);
    await prisma.blog.update({
      where: { id: ids[0] },
      data: { slug: `${prefix}-renamed` },
    });
    await track({ path: `/blog/${prefix}-renamed` });
    expect((await service.publicCount(`/blog/${prefix}-renamed`)).views).toBe(
      2,
    );
    expect(
      (await service.blogCounts()).find(
        (row) => row.path === `/blog/${prefix}-renamed`,
      )?.views,
    ).toBe(2);
  } finally {
    await prisma.pageView.deleteMany({ where: { blogId: { in: ids } } });
    await prisma.blog.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}, 30000);
