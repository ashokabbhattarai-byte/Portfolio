import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';

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
        select: { id: true, status: true, published: true, scheduledAt: true },
      });
      if (
        !blog ||
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
    // Reuse the primary key as an idempotency key: concurrent retries cannot add views.
    // The legacy ipHash column now holds a namespaced anonymous browser hash; no IP is collected.
    const ipHash = data.visitorId ? visitorHash(data.visitorId) : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.pageView.create({
          data: {
            id: data.eventId,
            ...target,
            ipHash,
            referer: source(data.referer),
            userAgent: data.userAgent?.slice(0, 500) || null,
          },
        });
        if (target.blogId)
          await tx.blog.update({
            where: { id: target.blogId },
            data: { viewCount: { increment: 1 } },
          });
        if (target.projectId)
          await tx.project.update({
            where: { id: target.projectId },
            data: { viewCount: { increment: 1 } },
          });
      });
      return { ok: true, recorded: true };
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
      views: await this.prisma.pageView.count({ where }),
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
    // Desired state, not increment: concurrent retries can never create extra likes.
    if (data.liked)
      await this.prisma.blogLike.createMany({
        data: [key],
        skipDuplicates: true,
      });
    else await this.prisma.blogLike.deleteMany({ where: key });
    return this.publicCount(target.path, data.visitorId);
  }

  async blogCounts() {
    const rows = await this.prisma.$queryRaw<
      { path: string; views: bigint; likes: bigint }[]
    >(Prisma.sql`
      SELECT '/blog/' || b.slug AS path,
        (SELECT COUNT(*) FROM page_views v WHERE v."blogId" = b.id) AS views,
        (SELECT COUNT(*) FROM blog_likes l WHERE l."blogId" = b.id) AS likes
      FROM blogs b WHERE (b.status = 'PUBLISHED' AND b.published = true)
        OR (b.status = 'SCHEDULED' AND b."scheduledAt" <= NOW())`);
    return rows.map((row) => ({
      path: row.path,
      views: Number(row.views),
      likes: Number(row.likes),
    }));
  }

  private async report(
    days: number | string,
    scope: Prisma.Sql = Prisma.sql`TRUE`,
  ) {
    const window = analyticsWindow(days);
    const since7 = analyticsWindow(7, window.end).start;
    const since30 = analyticsWindow(30, window.end).start;
    const range = Prisma.sql`"createdAt" >= ${window.start} AND "createdAt" <= ${window.end}`;
    return this.prisma.$transaction(
      async (tx) => {
        const [totals] = await tx.$queryRaw<CountRow[]>(Prisma.sql`SELECT
        COUNT(*) FILTER (WHERE ${range}) AS views,
        COUNT(DISTINCT "ipHash") FILTER (WHERE ${range} AND "ipHash" LIKE 'v2:%') AS unique,
        COUNT(*) FILTER (WHERE ${range} AND "blogId" IS NOT NULL) AS blogs,
        COUNT(*) FILTER (WHERE ${range} AND "projectId" IS NOT NULL) AS projects,
        COUNT(*) FILTER (WHERE "createdAt" >= ${since7}) AS last7,
        COUNT(*) FILTER (WHERE "createdAt" >= ${since30}) AS last30
        FROM page_views WHERE ${scope} AND "createdAt" <= ${window.end}`);
        const dailyRows = await tx.$queryRaw<{ date: string; views: bigint }[]>(
          Prisma.sql`SELECT to_char("createdAt", 'YYYY-MM-DD') AS date, COUNT(*) AS views FROM page_views WHERE ${scope} AND ${range} GROUP BY 1 ORDER BY 1`,
        );
        const routes = await tx.$queryRaw<RouteRow[]>(
          Prisma.sql`SELECT path,"blogId","projectId",COUNT(*) AS views,COUNT(DISTINCT "ipHash") FILTER (WHERE "ipHash" LIKE 'v2:%') AS unique,MAX("createdAt") AS "lastViewed" FROM page_views WHERE ${scope} AND ${range} GROUP BY path,"blogId","projectId" ORDER BY views DESC,path ASC`,
        );
        const referrers = await tx.$queryRaw<
          { referer: string | null; count: bigint }[]
        >(
          Prisma.sql`SELECT referer,COUNT(*) AS count FROM page_views WHERE ${scope} AND ${range} GROUP BY referer ORDER BY count DESC LIMIT 10`,
        );
        const audience = await tx.$queryRaw<
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
          FROM ordered WHERE ${scope} AND ${range} GROUP BY 1 ORDER BY 1`);
        const [uniquePages] = await tx.$queryRaw<
          { count: bigint }[]
        >(Prisma.sql`
          SELECT COUNT(DISTINCT ("ipHash", path)) AS count FROM page_views
          WHERE ${scope} AND ${range} AND "ipHash" LIKE 'v2:%'`);
        const audienceMap = new Map(audience.map((row) => [row.date, row]));
        const map = new Map(
          dailyRows.map((row) => [row.date, Number(row.views)]),
        );
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
        }[] = [];
        for (
          const date = new Date(start);
          date <= window.end;
          date.setUTCDate(date.getUTCDate() + 1)
        ) {
          const key = date.toISOString().slice(0, 10);
          daily.push({
            date: key,
            views: map.get(key) || 0,
            visitors: Number(audienceMap.get(key)?.visitors || 0),
            visits: Number(audienceMap.get(key)?.visits || 0),
          });
        }
        return {
          totals,
          visits: audience.reduce((sum, row) => sum + Number(row.visits), 0),
          uniquePageViews: Number(uniquePages.count),
          routes,
          daily,
          topReferers: referrers.map((row) => ({
            referer: row.referer || 'Direct / unknown',
            count: Number(row.count),
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
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
      report.routes
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
        pageViews: Number(report.totals.views),
        visits: report.visits,
        uniquePageViews: report.uniquePageViews,
        likes: likes.reduce((sum, row) => sum + row._count, 0),
        blogViews: Number(report.totals.blogs),
        projectViews: Number(report.totals.projects),
        uniqueVisitors: Number(report.totals.unique),
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
      daily: report.daily,
      topReferers: report.topReferers,
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
      views: Number(report.totals.views),
      uniqueViews: Number(report.totals.unique),
      visits: report.visits,
      uniquePageViews: report.uniquePageViews,
      viewsLast7Days: Number(report.totals.last7),
      viewsLast30Days: Number(report.totals.last30),
      daily: report.daily,
      topReferers: report.topReferers,
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
