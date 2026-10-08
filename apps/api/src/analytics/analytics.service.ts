import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateDelta,
  categorizeReferrer,
  parseUserAgent,
  type DeviceType,
  type ReferrerCategory,
} from './analytics.helpers';

export function analyticsWindow(days: number | string = 30, now = new Date()) {
  const all = days === 'all' || String(days) === '0';
  const count = Number(days);
  if (!all && ![7, 30, 90].includes(count))
    throw new BadRequestException('Choose 7, 30, 90 days or all.');
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - ((all ? 1 : count) - 1));
  return { start: all ? new Date(0) : start, end: now, all };
}

export function canonicalPath(input: string) {
  if (
    !input.startsWith('/') ||
    input.startsWith('//') ||
    /[\\\u0000-\u001f]/.test(input)
  )
    throw new BadRequestException('Invalid public path.');
  const path =
    new URL(input, 'https://portfolio.invalid').pathname.replace(/\/+$/, '') ||
    '/';
  return path.replace(/^\/work(?=\/|$)/, '/projects');
}

function source(input?: string | null) {
  try {
    const url = new URL(input || '');
    return /^https?:$/.test(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export function visitorHash(id: string) {
  return `v2:${createHash('sha256').update(id).digest('hex').slice(0, 32)}`;
}

type CountRow = {
  views: bigint;
  unique: bigint;
  blogs: bigint;
  projects: bigint;
  last7: bigint;
  last30: bigint;
  active5m?: bigint;
  active30m?: bigint;
  views30m?: bigint;
};

type RouteRow = {
  path: string;
  views: bigint;
  unique: bigint;
  lastViewed: Date | null;
  blogId: string | null;
  projectId: string | null;
};

const publicRoutes = ['/', '/projects', '/blog', '/about', '/contact'];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolvePath(input: string) {
    const path = canonicalPath(input);
    if (publicRoutes.includes(path))
      return { path, blogId: null, projectId: null };
    const match = path.match(/^\/(blog|projects)\/([^/]+)$/);
    if (!match) return null;
    let slug: string;
    try {
      slug = decodeURIComponent(match[2]);
    } catch {
      return null;
    }
    if (match[1] === 'blog') {
      const blog = await this.prisma.blog.findUnique({
        where: { slug },
        select: {
          id: true,
          status: true,
          published: true,
          scheduledAt: true,
          deletedAt: true,
        },
      });
      if (
        !blog ||
        blog.deletedAt ||
        !(
          (blog.status === 'PUBLISHED' && blog.published) ||
          (blog.status === 'SCHEDULED' &&
            blog.scheduledAt &&
            blog.scheduledAt <= new Date())
        )
      )
        return null;
      return { path, blogId: blog.id, projectId: null };
    }
    const project = await this.prisma.project.findUnique({
      where: { slug },
      select: { id: true, published: true },
    });
    return project?.published
      ? { path, blogId: null, projectId: project.id }
      : null;
  }

  async track(data: {
    path: string;
    eventId: string;
    visitorId?: string;
    referer?: string | null;
    userAgent?: string | null;
  }) {
    if (
      /bot|crawler|spider|headless|preview|facebookexternalhit|slurp|monitor/i.test(
        data.userAgent || '',
      )
    )
      return { ok: true, skipped: 'bot' };
    const target = await this.resolvePath(data.path);
    if (!target) return { ok: true, skipped: 'not-public' };
    const ipHash = data.visitorId ? visitorHash(data.visitorId) : null;
    try {
      const views = await this.prisma.$transaction(async (tx) => {
        await tx.pageView.create({
          data: {
            id: data.eventId,
            ...target,
            ipHash,
            referer: source(data.referer),
            userAgent: data.userAgent?.slice(0, 500) || null,
          },
        });
        let views: number | undefined;
        if (target.blogId && ipHash) {
          const claim = await tx.blogView.createMany({
            data: [{ blogId: target.blogId, visitorHash: ipHash }],
            skipDuplicates: true,
          });
          if (claim.count === 1) {
            const updated = await tx.blog.update({
              where: { id: target.blogId },
              data: { viewCount: { increment: 1 } },
              select: { viewCount: true },
            });
            views = updated.viewCount;
          }
        }
        if (target.projectId) {
          await tx.project.update({
            where: { id: target.projectId },
            data: { viewCount: { increment: 1 } },
            select: { viewCount: true },
          });
        }
        return views;
      });
      return { ok: true, recorded: true, path: target.path, views };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        return { ok: true, recorded: false };
      throw error;
    }
  }

  async publicCount(input: string, visitorId?: string) {
    const target = await this.resolvePath(input);
    if (!target) return { path: canonicalPath(input), views: null };
    const where = target.blogId
      ? { blogId: target.blogId }
      : target.projectId
        ? { projectId: target.projectId }
        : { path: target.path };
    return {
      path: target.path,
      views: target.blogId
        ? await this.prisma.blogView.count({ where: { blogId: target.blogId } })
        : await this.prisma.pageView.count({ where }),
      likes: target.blogId
        ? await this.prisma.blogLike.count({ where: { blogId: target.blogId } })
        : null,
      liked: !!(
        target.blogId &&
        visitorId &&
        (await this.prisma.blogLike.findUnique({
          where: {
            blogId_visitorHash: {
              blogId: target.blogId,
              visitorHash: visitorHash(visitorId),
            },
          },
        }))
      ),
    };
  }

  async setLike(data: { path: string; visitorId: string; liked: boolean }) {
    const target = await this.resolvePath(data.path);
    if (!target?.blogId) throw new NotFoundException('Article unavailable.');
    const key = {
      blogId: target.blogId,
      visitorHash: visitorHash(data.visitorId),
    };
    if (data.liked)
      await this.prisma.blogLike.createMany({
        data: [key],
        skipDuplicates: true,
      });
    else await this.prisma.blogLike.deleteMany({ where: key });
    return this.publicCount(target.path, data.visitorId);
  }

  async blogCounts(visitorId?: string) {
    const rows = await this.prisma.$queryRaw<
      { path: string; views: bigint; likes: bigint; blogId: string }[]
    >(Prisma.sql`
      SELECT '/blog/' || b.slug AS path, b.id AS "blogId",
        (SELECT COUNT(*) FROM blog_views v WHERE v."blogId" = b.id) AS views,
        (SELECT COUNT(*) FROM blog_likes l WHERE l."blogId" = b.id) AS likes
      FROM blogs b WHERE b."deletedAt" IS NULL AND ((b.status = 'PUBLISHED' AND b.published = true)
        OR (b.status = 'SCHEDULED' AND b."scheduledAt" <= NOW()))`);

    let userLikes: Set<string> = new Set();
    if (visitorId) {
      const vHash = visitorHash(visitorId);
      const likes = await this.prisma.blogLike.findMany({
        where: {
          visitorHash: vHash,
          blogId: { in: rows.map((r) => r.blogId) },
        },
        select: { blogId: true },
      });
      userLikes = new Set(likes.map((l) => l.blogId));
    }

    return rows.map((row) => ({
      path: row.path,
      views: Number(row.views),
      likes: Number(row.likes),
      liked: userLikes.has(row.blogId),
    }));
  }

  private async report(
    days: number | string,
    scope: Prisma.Sql = Prisma.sql`TRUE`,
  ) {
    const window = analyticsWindow(days);
    const since7 = analyticsWindow(7, window.end).start;
    const since30 = analyticsWindow(30, window.end).start;
    const last5m = new Date(window.end.getTime() - 5 * 60 * 1000);
    const last30m = new Date(window.end.getTime() - 30 * 60 * 1000);
    const range = Prisma.sql`"createdAt" >= ${window.start} AND "createdAt" <= ${window.end}`;

    const [
      [totals],
      dailyRows,
      routes,
      referrers,
      audience,
      [uniquePages],
      uaRows,
      [newVsReturning],
    ] = await Promise.all([
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`SELECT
        COUNT(*) FILTER (WHERE ${range}) AS views,
        COUNT(DISTINCT "ipHash") FILTER (WHERE ${range} AND "ipHash" LIKE 'v2:%') AS unique,
        COUNT(*) FILTER (WHERE ${range} AND "blogId" IS NOT NULL) AS blogs,
        COUNT(*) FILTER (WHERE ${range} AND "projectId" IS NOT NULL) AS projects,
        COUNT(*) FILTER (WHERE "createdAt" >= ${since7}) AS last7,
        COUNT(*) FILTER (WHERE "createdAt" >= ${since30}) AS last30,
        COUNT(DISTINCT "ipHash") FILTER (WHERE "createdAt" >= ${last5m} AND "ipHash" LIKE 'v2:%') AS active5m,
        COUNT(DISTINCT "ipHash") FILTER (WHERE "createdAt" >= ${last30m} AND "ipHash" LIKE 'v2:%') AS active30m,
        COUNT(*) FILTER (WHERE "createdAt" >= ${last30m}) AS views30m
        FROM page_views WHERE ${scope} AND "createdAt" <= ${window.end}`),

      this.prisma.$queryRaw<{ date: string; views: bigint }[]>(
        Prisma.sql`SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, COUNT(*) AS views FROM page_views WHERE ${scope} AND ${range} GROUP BY 1 ORDER BY 1`,
      ),

      this.prisma.$queryRaw<RouteRow[]>(
        Prisma.sql`SELECT path,"blogId","projectId",COUNT(*) AS views,COUNT(DISTINCT "ipHash") FILTER (WHERE "ipHash" LIKE 'v2:%') AS unique,MAX("createdAt") AS "lastViewed" FROM page_views WHERE ${scope} AND ${range} GROUP BY path,"blogId","projectId" ORDER BY views DESC,path ASC`,
      ),

      this.prisma.$queryRaw<{ referer: string; count: bigint }[]>(
        Prisma.sql`SELECT COALESCE(NULLIF(referer, ''), 'Direct / unknown') AS referer, COUNT(*) AS count FROM page_views WHERE ${scope} AND ${range} GROUP BY 1 ORDER BY count DESC LIMIT 20`,
      ),

      this.prisma.$queryRaw<
        {
          date: string;
          visitors: bigint;
          visits: bigint;
          uniquePages: bigint;
        }[]
      >(Prisma.sql`
        WITH ordered AS (
          SELECT *, LAG("createdAt") OVER (PARTITION BY "ipHash" ORDER BY "createdAt", id) AS previous
          FROM page_views WHERE "ipHash" LIKE 'v2:%'
            AND "createdAt" >= ${new Date(window.start.getTime() - 30 * 60 * 1000)} AND "createdAt" <= ${window.end}
        ) SELECT to_char("createdAt", 'YYYY-MM-DD') AS date,
          COUNT(DISTINCT "ipHash") AS visitors,
          COUNT(*) FILTER (WHERE previous IS NULL OR "createdAt" - previous >= INTERVAL '30 minutes') AS visits,
          COUNT(DISTINCT ("ipHash", path)) AS "uniquePages"
        FROM ordered WHERE ${scope} AND ${range} GROUP BY 1 ORDER BY 1`),

      this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT ("ipHash", path)) AS count FROM page_views
        WHERE ${scope} AND ${range} AND "ipHash" LIKE 'v2:%'`),

      this.prisma.$queryRaw<
        { userAgent: string | null; count: bigint }[]
      >(Prisma.sql`
        SELECT "userAgent", COUNT(*) AS count FROM page_views
        WHERE ${scope} AND ${range}
        GROUP BY "userAgent"`),

      this.prisma.$queryRaw<
        { new_visitors: bigint; returning_visitors: bigint }[]
      >(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE first_seen >= ${window.start}) AS new_visitors,
          COUNT(*) FILTER (WHERE first_seen < ${window.start}) AS returning_visitors
        FROM (
          SELECT "ipHash", MIN("createdAt") AS first_seen
          FROM page_views
          WHERE "ipHash" LIKE 'v2:%'
          GROUP BY "ipHash"
          HAVING MAX("createdAt") >= ${window.start} AND MIN("createdAt") <= ${window.end}
        ) v`),
    ]);

    // Previous period comparison (for bounded windows)
    let comparison: {
      pageViewsDelta: number;
      visitorsDelta: number;
      visitsDelta: number;
      bounceRateDelta: number;
      viewsPerVisitDelta: number;
      previousPageViews: number;
      previousVisitors: number;
      previousVisits: number;
    } | null = null;

    const totalVisits = audience.reduce(
      (sum, row) => sum + Number(row.visits),
      0,
    );
    const totalViewsCount = Number(totals?.views || 0);
    const viewsPerVisit =
      totalVisits > 0 ? Number((totalViewsCount / totalVisits).toFixed(2)) : 0;
    // Bounce estimate: sessions with only 1 page view
    const bounceRate =
      totalVisits > 0 && totalViewsCount >= totalVisits
        ? Number(
            Math.min(
              100,
              Math.max(
                0,
                ((2 * totalVisits - totalViewsCount) / totalVisits) * 100,
              ),
            ).toFixed(1),
          )
        : 0;

    if (!window.all) {
      const duration = window.end.getTime() - window.start.getTime();
      const prevStart = new Date(window.start.getTime() - duration);
      const prevEnd = new Date(window.start.getTime());
      const prevRange = Prisma.sql`"createdAt" >= ${prevStart} AND "createdAt" < ${prevEnd}`;

      const [[prevTotals], prevAudience] = await Promise.all([
        this.prisma.$queryRaw<{ views: bigint; unique: bigint }[]>(Prisma.sql`
          SELECT
            COUNT(*) AS views,
            COUNT(DISTINCT "ipHash") FILTER (WHERE "ipHash" LIKE 'v2:%') AS unique
          FROM page_views WHERE ${scope} AND ${prevRange}`),

        this.prisma.$queryRaw<{ visits: bigint }[]>(Prisma.sql`
          WITH ordered AS (
            SELECT *, LAG("createdAt") OVER (PARTITION BY "ipHash" ORDER BY "createdAt", id) AS previous
            FROM page_views WHERE "ipHash" LIKE 'v2:%'
              AND "createdAt" >= ${new Date(prevStart.getTime() - 30 * 60 * 1000)} AND "createdAt" < ${prevEnd}
          ) SELECT
            COUNT(*) FILTER (WHERE previous IS NULL OR "createdAt" - previous >= INTERVAL '30 minutes') AS visits
          FROM ordered WHERE ${scope} AND "createdAt" >= ${prevStart} AND "createdAt" < ${prevEnd}`),
      ]);

      const curViews = totalViewsCount;
      const curVisitors = Number(totals?.unique || 0);
      const curVisits = totalVisits;

      const prevViews = Number(prevTotals?.views || 0);
      const prevVisitors = Number(prevTotals?.unique || 0);
      const prevVisits = Number(prevAudience[0]?.visits || 0);
      const prevViewsPerVisit = prevVisits > 0 ? prevViews / prevVisits : 0;
      const prevBounceRate =
        prevVisits > 0 && prevViews >= prevVisits
          ? Math.min(
              100,
              Math.max(0, ((2 * prevVisits - prevViews) / prevVisits) * 100),
            )
          : 0;

      comparison = {
        pageViewsDelta: calculateDelta(curViews, prevViews),
        visitorsDelta: calculateDelta(curVisitors, prevVisitors),
        visitsDelta: calculateDelta(curVisits, prevVisits),
        bounceRateDelta: Number((bounceRate - prevBounceRate).toFixed(1)),
        viewsPerVisitDelta: Number(
          (viewsPerVisit - prevViewsPerVisit).toFixed(2),
        ),
        previousPageViews: prevViews,
        previousVisitors: prevVisitors,
        previousVisits: prevVisits,
      };
    }

    // Technology breakdown calculation
    const baseViewsCount = Math.max(1, totalViewsCount);
    const deviceMap = new Map<DeviceType, number>();
    const browserMap = new Map<string, number>();
    const osMap = new Map<string, number>();

    for (const row of uaRows) {
      const count = Number(row.count);
      const parsed = parseUserAgent(row.userAgent);
      deviceMap.set(parsed.device, (deviceMap.get(parsed.device) || 0) + count);
      browserMap.set(
        parsed.browser,
        (browserMap.get(parsed.browser) || 0) + count,
      );
      osMap.set(parsed.os, (osMap.get(parsed.os) || 0) + count);
    }

    const devices = Array.from(deviceMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / baseViewsCount) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    const browsers = Array.from(browserMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / baseViewsCount) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const os = Array.from(osMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: Number(((count / baseViewsCount) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Referrers with categories
    const categoryMap = new Map<ReferrerCategory, number>();
    for (const row of referrers) {
      const refererName = row.referer || 'Direct / unknown';
      const category = categorizeReferrer(refererName);
      const count = Number(row.count);
      categoryMap.set(category, (categoryMap.get(category) || 0) + count);
    }

    const categories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Number(((count / baseViewsCount) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    const audienceMap = new Map(audience.map((row) => [row.date, row]));
    const map = new Map(dailyRows.map((row) => [row.date, Number(row.views)]));
    const start = window.all
      ? new Date(
          `${dailyRows[0]?.date ?? window.end.toISOString().slice(0, 10)}T00:00:00Z`,
        )
      : new Date(window.start);

    const daily: {
      date: string;
      views: number;
      visitors: number;
      visits: number;
      bounceRate: number;
    }[] = [];

    for (
      const date = new Date(start);
      date <= window.end;
      date.setUTCDate(date.getUTCDate() + 1)
    ) {
      const key = date.toISOString().slice(0, 10);
      const aud = audienceMap.get(key);
      const dViews = map.get(key) || 0;
      const dVisits = Number(aud?.visits || 0);
      const dBounceRate =
        dVisits > 0 && dViews >= dVisits
          ? Number(
              Math.min(
                100,
                Math.max(0, ((2 * dVisits - dViews) / dVisits) * 100),
              ).toFixed(1),
            )
          : 0;

      daily.push({
        date: key,
        views: dViews,
        visitors: Number(aud?.visitors || 0),
        visits: dVisits,
        bounceRate: dBounceRate,
      });
    }

    return {
      totals: totals || {
        views: 0n,
        unique: 0n,
        blogs: 0n,
        projects: 0n,
        last7: 0n,
        last30: 0n,
        active5m: 0n,
        active30m: 0n,
        views30m: 0n,
      },
      visits: totalVisits,
      bounceRate,
      viewsPerVisit,
      newVisitors: Number(newVsReturning?.new_visitors || 0),
      returningVisitors: Number(newVsReturning?.returning_visitors || 0),
      realtime: {
        activeLast5Min: Number(totals?.active5m || 0),
        activeLast30Min: Number(totals?.active30m || 0),
        viewsLast30Min: Number(totals?.views30m || 0),
      },
      comparison,
      breakdown: {
        devices,
        browsers,
        os,
        categories,
      },
      uniquePageViews: Number(uniquePages?.count || 0),
      routes,
      daily,
      topReferers: referrers.map((row) => ({
        referer: row.referer || 'Direct / unknown',
        count: Number(row.count),
      })),
    };
  }

  async getOverview(days: number | string = 30) {
    const report = await this.report(days);
    const [blogs, projects, likes] = await Promise.all([
      this.prisma.blog.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          coverImage: true,
          viewCount: true,
          tags: true,
        },
      }),
      this.prisma.project.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          image: true,
          viewCount: true,
        },
      }),
      this.prisma.blogLike.groupBy({
        by: ['blogId'],
        _count: true,
        where: {
          createdAt: {
            gte: analyticsWindow(days).start,
            lte: analyticsWindow(days).end,
          },
        },
      }),
    ]);
    const views = (id: string, key: 'blogId' | 'projectId') =>
      (report.routes || [])
        .filter((row) => row[key] === id)
        .reduce((sum, row) => sum + Number(row.views), 0);
    const allBlogs = blogs.map((blog) => ({
      blog,
      views: views(blog.id, 'blogId'),
      likes: likes.find((row) => row.blogId === blog.id)?._count || 0,
    }));
    const tags = new Map<string, number>();
    for (const { blog, views } of allBlogs)
      for (const tag of new Set(blog.tags))
        tags.set(tag, (tags.get(tag) || 0) + views);

    return {
      totals: {
        pageViews: Number(report.totals?.views || 0),
        visits: report.visits ?? 0,
        uniquePageViews: report.uniquePageViews ?? 0,
        likes: likes.reduce((sum, row) => sum + row._count, 0),
        blogViews: Number(report.totals?.blogs || 0),
        projectViews: Number(report.totals?.projects || 0),
        uniqueVisitors: Number(report.totals?.unique || 0),
        bounceRate: report.bounceRate ?? 0,
        viewsPerVisit: report.viewsPerVisit ?? 0,
        newVisitors: report.newVisitors ?? 0,
        returningVisitors: report.returningVisitors ?? 0,
      },
      comparison: report.comparison ?? null,
      realtime: report.realtime ?? {
        activeLast5Min: 0,
        activeLast30Min: 0,
        viewsLast30Min: 0,
      },
      breakdown: report.breakdown ?? {
        devices: [],
        browsers: [],
        os: [],
        categories: [],
      },
      topBlogs: allBlogs
        .filter((row) => row.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
      topProjects: projects
        .map((project) => ({ project, views: views(project.id, 'projectId') }))
        .filter((row) => row.views > 0)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5),
      daily: report.daily || [],
      topReferers: report.topReferers || [],
      mostLiked: allBlogs
        .filter((row) => row.likes > 0)
        .sort((a, b) => b.likes - a.likes)
        .slice(0, 5),
      byTag: [...tags]
        .filter(([, views]) => views > 0)
        .map(([tag, views]) => ({ tag, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 8),
    };
  }

  private detail(report: Awaited<ReturnType<AnalyticsService['report']>>) {
    return {
      views: Number(report.totals?.views || 0),
      uniqueViews: Number(report.totals?.unique || 0),
      visits: report.visits ?? 0,
      uniquePageViews: report.uniquePageViews ?? 0,
      bounceRate: report.bounceRate ?? 0,
      viewsPerVisit: report.viewsPerVisit ?? 0,
      viewsLast7Days: Number(report.totals?.last7 || 0),
      viewsLast30Days: Number(report.totals?.last30 || 0),
      comparison: report.comparison ?? null,
      breakdown: report.breakdown ?? {
        devices: [],
        browsers: [],
        os: [],
        categories: [],
      },
      daily: report.daily || [],
      topReferers: report.topReferers || [],
    };
  }

  async getBlogAnalytics(blogId: string, days: number | string = 30) {
    const blog = await this.prisma.blog.findUnique({ where: { id: blogId } });
    if (!blog) return null;
    return {
      blog,
      likes: await this.prisma.blogLike.count({
        where: {
          blogId,
          createdAt: {
            gte: analyticsWindow(days).start,
            lte: analyticsWindow(days).end,
          },
        },
      }),
      ...this.detail(await this.report(days, Prisma.sql`"blogId" = ${blogId}`)),
    };
  }

  async getRouteAnalytics(input: string, days: number | string = 30) {
    const path = canonicalPath(input);
    return {
      path,
      ...this.detail(await this.report(days, Prisma.sql`path = ${path}`)),
    };
  }

  async getAllRoutesAnalytics(days: number | string = 30) {
    const window = analyticsWindow(days);
    const rows = await this.prisma.$queryRaw<RouteRow[]>(
      Prisma.sql`SELECT path, COUNT(*) AS views,COUNT(DISTINCT "ipHash") FILTER (WHERE "ipHash" LIKE 'v2:%') AS unique,MAX("createdAt") AS "lastViewed" FROM page_views WHERE "createdAt" >= ${window.start} AND "createdAt" <= ${window.end} GROUP BY path ORDER BY views DESC,path ASC`,
    );
    const result = rows.map((row) => ({
      path: row.path,
      views: Number(row.views),
      unique: Number(row.unique),
      lastViewed: row.lastViewed?.toISOString() || null,
    }));
    for (const path of publicRoutes)
      if (!result.some((row) => row.path === path))
        result.push({ path, views: 0, unique: 0, lastViewed: null });
    return result.sort((a, b) => b.views - a.views);
  }

  async getAllBlogsAnalytics(days: number | string = 'all') {
    const window = analyticsWindow(days);
    const [blogs, rows] = await Promise.all([
      this.prisma.blog.findMany(),
      this.prisma.$queryRaw<
        { blogId: string; views: bigint; unique: bigint }[]
      >(
        Prisma.sql`SELECT "blogId",COUNT(*) AS views,COUNT(DISTINCT "ipHash") FILTER (WHERE "ipHash" LIKE 'v2:%') AS unique FROM page_views WHERE "createdAt" >= ${window.start} AND "createdAt" <= ${window.end} AND "blogId" IS NOT NULL GROUP BY "blogId"`,
      ),
    ]);
    return blogs
      .map((blog) => {
        const row = rows.find((row) => row.blogId === blog.id);
        return {
          blog,
          views: Number(row?.views || 0),
          unique: Number(row?.unique || 0),
        };
      })
      .sort((a, b) => b.views - a.views);
  }
}
