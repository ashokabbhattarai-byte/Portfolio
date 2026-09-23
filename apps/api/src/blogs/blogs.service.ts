import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Blog } from '@portfolio/types';
import { Prisma, BlogStatus } from '../prisma/prisma-client';
import { PrismaService } from '../prisma/prisma.service';
import { RevalidateService } from '../revalidate/revalidate.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import {
  type Actor,
  canonicalJson,
  fail,
  slugify,
  systemActor,
} from '../publishing/common';
import { auditData } from '../publishing/audit.service';
import { PageQuery } from '../publishing/query.dto';

export const blogInclude = {
  images: { orderBy: { position: 'asc' as const } },
  featuredImage: true,
  ogImage: true,
  inlineMedia: true,
  author: { select: { id: true, name: true } },
};
export const publicBlogWhere = {
  deletedAt: null,
  status: 'PUBLISHED' as const,
  published: true,
};
type Row = Prisma.BlogGetPayload<{ include: typeof blogInclude }>;
export function blogWire(row: Row): Blog {
  const { deletedAt, inlineMedia, featuredImage, ogImage, author, ...rest } =
    row;
  void deletedAt;
  return JSON.parse(
    JSON.stringify({
      ...rest,
      inlineMediaIds: inlineMedia.map((m) => m.id),
      featuredImage,
      ogImage,
      author,
      coverImage: featuredImage?.url ?? row.coverImage,
      images: row.images,
    }),
  ) as Blog;
}
const fields = [
  'title',
  'excerpt',
  'content',
  'featured',
  'position',
  'coverImage',
  'gallery',
  'linkedinUrl',
  'linkedinPostId',
  'linkedinStatus',
  'seoTitle',
  'seoDescription',
  'canonicalUrl',
  'ogTitle',
  'ogDescription',
  'twitterTitle',
  'twitterDescription',
  'noIndex',
  'noFollow',
  'aiProvider',
  'aiModel',
  'timezone',
] as const;
const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

/* Bounded so one sweep cannot monopolise a connection; the next tick, fifteen
   seconds later, drains the rest. */
const MAX_PUBLISH_PER_SWEEP = 10;
/* Generous for five statements at ~200ms each, tight enough that a wedged
   transaction releases its connection rather than pinning it. */
const PUBLISH_TXN_TIMEOUT_MS = 10_000;

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly revalidate: RevalidateService,
  ) {}
  async list(admin = false): Promise<Blog[]> {
    const rows = await this.prisma.blog.findMany({
      where: admin ? { deletedAt: null } : publicBlogWhere,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      include: blogInclude,
      /* One LATERAL JOIN instead of a query per relation: six round trips to
         a pooler ~160ms away became one. Measured 946ms -> 159ms. */
      relationLoadStrategy: 'join',
    });
    return rows.map(blogWire);
  }
  async search(q: PageQuery) {
    const where: Prisma.BlogWhereInput = {
      deletedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.tag ? { tags: { has: q.tag } } : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              gte: q.from ? new Date(q.from) : undefined,
              lte: q.to ? new Date(q.to) : undefined,
            },
          }
        : {}),
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: 'insensitive' } },
              { excerpt: { contains: q.search, mode: 'insensitive' } },
              { slug: { contains: q.search, mode: 'insensitive' } },
              {
                tagRecords: {
                  some: { name: { contains: q.search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const orderBy: Prisma.BlogOrderByWithRelationInput =
      q.sort === 'title'
        ? { title: 'asc' }
        : q.sort === 'oldest'
          ? { createdAt: 'asc' }
          : q.sort === 'updated'
            ? { updatedAt: 'desc' }
            : { createdAt: 'desc' };
    /* Promise.all rather than $transaction: the array form adds BEGIN/COMMIT,
       two extra round trips, for consistency a paginated search does not need. */
    const [items, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        orderBy: [orderBy, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          scheduledAt: true,
          publishedAt: true,
          createdByAI: true,
          version: true,
          coverImage: true,
          featuredImage: { select: { id: true, url: true, alt: true } },
          author: { select: { name: true } },
        },
      }),
      this.prisma.blog.count({ where }),
    ]);
    return { items, total, page: q.page, limit: q.limit };
  }
  async getById(id: string, includeDrafts = false) {
    const row = await this.prisma.blog.findFirst({
      where: { id, ...(includeDrafts ? { deletedAt: null } : publicBlogWhere) },
      include: blogInclude,
      relationLoadStrategy: 'join',
    });
    if (!row) fail('BLOG_NOT_FOUND', 'Blog not found.', 404);
    return blogWire(row);
  }
  async getBySlug(slug: string, includeDrafts = false) {
    const row = await this.prisma.blog.findFirst({
      where: {
        slug,
        ...(includeDrafts ? { deletedAt: null } : publicBlogWhere),
      },
      include: blogInclude,
      relationLoadStrategy: 'join',
    });
    if (!row) fail('BLOG_NOT_FOUND', 'Blog not found.', 404);
    return blogWire(row);
  }
  private validatePublish(title: string, excerpt: string, content: string) {
    if (
      title.trim().length < 2 ||
      excerpt.trim().length < 10 ||
      content.trim().length < 20
    )
      fail(
        'BLOG_INCOMPLETE',
        'Publishing requires a title, an excerpt of at least 10 characters, and article content of at least 20 characters.',
      );
  }
  private async media(
    tx: Prisma.TransactionClient,
    dto: UpdateBlogDto,
    existing?: Row,
  ) {
    const content = dto.content ?? existing?.content ?? '';
    const urls = Array.from(
      content.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g),
      (m) => m[1],
    );
    const matched = urls.length
      ? await tx.mediaAsset.findMany({
          where: { url: { in: urls } },
          select: { id: true },
        })
      : [];
    const inlineIds = [
      ...new Set([
        ...(dto.inlineMediaIds ?? existing?.inlineMedia.map((m) => m.id) ?? []),
        ...matched.map((m) => m.id),
      ]),
    ];
    const featured =
      dto.featuredImageId !== undefined
        ? dto.featuredImageId
        : existing?.featuredImageId;
    const og =
      dto.ogImageId !== undefined ? dto.ogImageId : existing?.ogImageId;
    const ids = [
      ...new Set(
        [featured, og, ...inlineIds].filter((id): id is string => !!id),
      ),
    ].sort();
    if (ids.length) {
      const assets = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM media_assets WHERE id IN (${Prisma.join(ids)}) AND "deletedAt" IS NULL ORDER BY id FOR UPDATE`,
      );
      if (assets.length !== ids.length)
        fail(
          'MEDIA_NOT_FOUND',
          'One or more selected images are unavailable.',
          404,
        );
    }
    return {
      featuredImageId: featured || null,
      ogImageId: og || null,
      inlineMedia: { set: inlineIds.map((id) => ({ id })) },
    };
  }
  private async tags(tx: Prisma.TransactionClient, names: string[]) {
    const tags = [...new Set(names.map((t) => t.trim()).filter(Boolean))];
    const rows = [];
    for (const name of tags) {
      const slug = slugify(name);
      if (!slug) fail('INVALID_TAG', 'Tags must contain letters or numbers.');
      rows.push(
        await tx.tag.upsert({
          where: { slug },
          create: { name, slug },
          update: {},
        }),
      );
    }
    return {
      tags: rows.map((t) => t.name),
      tagRecords: { set: rows.map((t) => ({ id: t.id })) },
    };
  }
  private handle(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    )
      fail(
        'BLOG_SLUG_ALREADY_EXISTS',
        'A blog with that slug already exists.',
        409,
      );
    throw error;
  }
  async create(
    dto: CreateBlogDto,
    actor: Actor = systemActor(),
  ): Promise<Blog> {
    try {
      const row = await this.prisma.$transaction(
        async (tx) => {
          const fingerprint = digest(canonicalJson(dto));
          if (dto.idempotencyKey) {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.id + ':' + dto.idempotencyKey},0))`;
            const previous = await tx.publishingRequest.findUnique({
              where: {
                actorId_key: { actorId: actor.id, key: dto.idempotencyKey },
              },
            });
            if (previous) {
              if (previous.fingerprint !== fingerprint)
                fail(
                  'IDEMPOTENCY_CONFLICT',
                  'This idempotency key was used for a different request.',
                  409,
                );
              const old = await tx.blog.findUnique({
                where: { id: previous.blogId },
                include: blogInclude,
              });
              if (!old || old.deletedAt)
                fail(
                  'BLOG_NOT_FOUND',
                  'The previously created article is no longer available.',
                  404,
                );
              return old;
            }
          }
          const status = dto.status ?? (dto.published ? 'PUBLISHED' : 'DRAFT');
          if (status === 'PUBLISHED' || status === 'SCHEDULED')
            this.validatePublish(dto.title, dto.excerpt, dto.content);
          const scheduledAt = this.scheduleTime(status, dto.scheduledAt);
          this.validateTimezone(dto.timezone);
          const tags = await this.tags(tx, dto.tags ?? []);
          const media = await this.media(tx, dto);
          const row = await tx.blog.create({
            data: {
              title: dto.title,
              slug: this.slug(dto.slug || dto.title),
              excerpt: dto.excerpt ?? '',
              content: dto.content ?? '',
              ...Object.fromEntries(
                fields
                  .filter((k) => dto[k] !== undefined)
                  .map((k) => [k, dto[k]]),
              ),
              ...media,
              inlineMedia: { connect: media.inlineMedia.set },
              ...tags,
              tagRecords: { connect: tags.tagRecords.set },
              status,
              published: status === 'PUBLISHED',
              scheduledAt,
              publishedAt: status === 'PUBLISHED' ? new Date() : null,
              authorId: actor.type === 'ADMIN' ? actor.id : null,
              createdByAI: actor.type === 'AI_API_KEY',
              images: dto.images
                ? {
                    create: dto.images.map((img, i) => ({
                      ...img,
                      position: img.position ?? i,
                    })),
                  }
                : undefined,
            },
            include: blogInclude,
          });
          if (dto.idempotencyKey)
            await tx.publishingRequest.create({
              data: {
                actorId: actor.id,
                key: dto.idempotencyKey,
                fingerprint,
                blogId: row.id,
              },
            });
          await tx.auditEvent.create({
            data: auditData(actor, 'BLOG_CREATED', 'BLOG', row.id),
          });
          if (status === 'PUBLISHED' || status === 'SCHEDULED')
            await tx.auditEvent.create({
              data: auditData(actor, `BLOG_${status}`, 'BLOG', row.id),
            });
          return row;
        },
        { timeout: 20000 },
      );
      this.revalidate.trigger('blogs');
      return blogWire(row);
    } catch (error) {
      return this.handle(error);
    }
  }
  private slug(value: string) {
    const slug = slugify(value);
    if (slug.length < 2)
      fail('INVALID_SLUG', 'Use at least two URL-safe letters or numbers.');
    return slug;
  }
  private validateTimezone(zone?: string) {
    if (zone)
      try {
        new Intl.DateTimeFormat('en', { timeZone: zone }).format();
      } catch {
        fail(
          'INVALID_TIMEZONE',
          'Use a valid IANA timezone such as Asia/Kathmandu.',
        );
      }
  }
  private scheduleTime(status: string, value?: string | null) {
    if (status !== 'SCHEDULED') return null;
    if (
      !value ||
      !Number.isFinite(Date.parse(value)) ||
      Date.parse(value) <= Date.now() ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(value)
    )
      fail(
        'INVALID_SCHEDULE_TIME',
        'Choose a future ISO 8601 time with a timezone offset.',
      );
    return new Date(value);
  }
  async update(
    id: string,
    dto: UpdateBlogDto,
    actor: Actor = systemActor(),
  ): Promise<Blog> {
    try {
      const row = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM blogs WHERE id=${id} FOR UPDATE`;
          const existing = await tx.blog.findUnique({
            where: { id },
            include: blogInclude,
          });
          if (!existing || existing.deletedAt)
            fail('BLOG_NOT_FOUND', 'Blog not found.', 404);
          if (
            dto.expectedVersion !== undefined &&
            dto.expectedVersion !== existing.version
          )
            fail(
              'VERSION_CONFLICT',
              'This article changed elsewhere. Reload it before saving your edits.',
              409,
            );
          const status =
            dto.status ??
            (dto.published !== undefined
              ? dto.published
                ? 'PUBLISHED'
                : 'UNPUBLISHED'
              : existing.status);
          const content = dto.content ?? existing.content,
            title = dto.title ?? existing.title,
            excerpt = dto.excerpt ?? existing.excerpt;
          if (status === 'PUBLISHED' || status === 'SCHEDULED')
            this.validatePublish(title, excerpt, content);
          const scheduleChanged =
            dto.status === 'SCHEDULED' || dto.scheduledAt !== undefined;
          const scheduledAt =
            status === 'SCHEDULED'
              ? scheduleChanged
                ? this.scheduleTime(status, dto.scheduledAt)
                : existing.scheduledAt
              : null;
          this.validateTimezone(dto.timezone);
          const media = await this.media(tx, dto, existing);
          await tx.blogRevision.create({
            data: {
              blogId: id,
              version: existing.version,
              snapshot: JSON.parse(JSON.stringify(blogWire(existing))),
              actorType: actor.type,
              actorId: actor.id,
            },
          });
          const tags = dto.tags ? await this.tags(tx, dto.tags) : {};
          const row = await tx.blog.update({
            where: { id },
            data: {
              ...Object.fromEntries(
                fields
                  .filter((k) => dto[k] !== undefined)
                  .map((k) => [k, dto[k]]),
              ),
              ...media,
              ...tags,
              ...(dto.slug !== undefined ? { slug: this.slug(dto.slug) } : {}),
              status,
              published: status === 'PUBLISHED',
              scheduledAt,
              publishedAt:
                status === 'PUBLISHED'
                  ? (existing.publishedAt ?? new Date())
                  : existing.publishedAt,
              version: { increment: 1 },
              ...(dto.images
                ? {
                    images: {
                      deleteMany: {},
                      create: dto.images.map((img, i) => ({
                        ...img,
                        position: img.position ?? i,
                      })),
                    },
                  }
                : {}),
            },
            include: blogInclude,
          });
          const action =
            status !== existing.status
              ? `BLOG_${status}`
              : dto.scheduledAt !== undefined
                ? 'BLOG_RESCHEDULED'
                : 'BLOG_UPDATED';
          await tx.auditEvent.create({
            data: auditData(actor, action, 'BLOG', id),
          });
          return row;
        },
        { timeout: 20000 },
      );
      this.revalidate.trigger('blogs');
      return blogWire(row);
    } catch (error) {
      return this.handle(error);
    }
  }
  async remove(id: string, actor: Actor = systemActor()) {
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.blog.updateMany({
        where: { id, deletedAt: null },
        data: {
          deletedAt: new Date(),
          status: 'ARCHIVED',
          published: false,
          scheduledAt: null,
          version: { increment: 1 },
        },
      });
      if (!result.count) fail('BLOG_NOT_FOUND', 'Blog not found.', 404);
      await tx.blogPreview.updateMany({
        where: { blogId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: auditData(actor, 'BLOG_DELETED', 'BLOG', id),
      });
    });
    this.revalidate.trigger('blogs');
  }
  async duplicate(id: string, actor: Actor) {
    const blog = await this.getById(id, true);
    const input = this.revisionInput(blog);
    return this.create(
      {
        ...input,
        title: `${blog.title} (copy)`.slice(0, 200),
        slug: `${blog.slug.slice(0, 105)}-${randomBytes(4).toString('hex')}`,
        status: 'DRAFT',
        published: false,
      },
      actor,
    );
  }
  async revisions(id: string) {
    await this.getById(id, true);
    return this.prisma.blogRevision.findMany({
      where: { blogId: id },
      orderBy: { version: 'desc' },
      take: 50,
      select: {
        id: true,
        version: true,
        actorType: true,
        actorId: true,
        createdAt: true,
      },
    });
  }
  private revisionInput(blog: Blog): CreateBlogDto {
    return {
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: blog.content,
      tags: blog.tags,
      ...Object.fromEntries(
        fields
          .filter((k) => blog[k as keyof Blog] !== undefined)
          .map((k) => [k, blog[k as keyof Blog]]),
      ),
      featuredImageId: blog.featuredImageId,
      ogImageId: blog.ogImageId,
      inlineMediaIds: blog.inlineMediaIds,
      images: blog.images.map(({ url, alt, caption, placement, position }) => ({
        url,
        alt,
        caption,
        placement,
        position,
      })),
    };
  }
  async restore(id: string, revisionId: string, actor: Actor) {
    const revision = await this.prisma.blogRevision.findFirst({
      where: { id: revisionId, blogId: id },
    });
    if (!revision) fail('REVISION_NOT_FOUND', 'Revision not found.', 404);
    return this.update(
      id,
      {
        ...this.revisionInput(revision.snapshot as unknown as Blog),
        status: 'DRAFT',
        published: false,
      },
      actor,
    );
  }
  async preview(id: string, actor: Actor) {
    await this.getById(id, true);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 24 * 3600000);
    await this.prisma.$transaction(async (tx) => {
      await tx.blogPreview.updateMany({
        where: { blogId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.blogPreview.create({
        data: { blogId: id, tokenHash: digest(token), expiresAt },
      });
      await tx.auditEvent.create({
        data: auditData(actor, 'PREVIEW_CREATED', 'BLOG', id),
      });
    });
    return { token, expiresAt, url: `/blog/preview/${token}` };
  }
  async readPreview(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      fail('PREVIEW_EXPIRED', 'Preview is invalid or expired.', 404);
    const preview = await this.prisma.blogPreview.findUnique({
      where: { tokenHash: digest(token) },
    });
    if (!preview || preview.revokedAt || preview.expiresAt <= new Date())
      fail('PREVIEW_EXPIRED', 'Preview is invalid or expired.', 404);
    return this.getById(preview.blogId, true);
  }
  /**
   * Publishes articles whose time has come.
   *
   * One short transaction per article, not one long transaction for the batch.
   * The previous shape claimed up to 50 rows and ran four statements for each
   * inside a single transaction — ~200 sequential round trips holding one
   * pooled connection. Measured against this pooler that is 49–90 seconds, so
   * every concurrent request queued behind it until `pool_timeout` expired and
   * the whole API started reporting P2024. Per-article transactions finish in
   * about a second and release the connection between each one.
   *
   * Publishing stays exactly-once: each transaction re-claims its row with
   * FOR UPDATE SKIP LOCKED and re-checks the status inside the lock, so two
   * replicas sweeping together take disjoint rows and neither repeats work.
   */
  async publishDue(now = new Date(), limit = MAX_PUBLISH_PER_SWEEP) {
    // Most sweeps are idle. Checking first avoids reserving a pooled backend
    // for a transaction that would find nothing.
    const candidate = await this.prisma.blog.findFirst({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!candidate) return 0;

    let published = 0;
    for (let taken = 0; taken < limit; taken += 1) {
      const result = await this.publishOneDue(now);
      if (result === 'none') break;
      if (result === 'published') published += 1;
    }
    if (published) this.revalidate.trigger('blogs');
    return published;
  }

  /** Claims and publishes a single due article. Returns what it did so the
   *  caller can keep draining without mistaking a skip for an empty queue. */
  private async publishOneDue(
    now: Date,
  ): Promise<'published' | 'skipped' | 'none'> {
    return this.prisma.$transaction(
      async (tx) => {
        const [claimed] = await tx.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT id FROM blogs
                     WHERE status='SCHEDULED' AND "scheduledAt" <= ${now} AND "deletedAt" IS NULL
                     ORDER BY "scheduledAt" LIMIT 1 FOR UPDATE SKIP LOCKED`,
        );
        if (!claimed) return 'none' as const;

        const row = await tx.blog.findUniqueOrThrow({
          where: { id: claimed.id },
          include: blogInclude,
        });

        /* An article that cannot pass the publish checks would otherwise abort
           this transaction on every sweep, blocking every other scheduled post
           behind it forever. Return it to a draft and record why, so the queue
           drains and the author can see what happened in the activity log. */
        try {
          this.validatePublish(row.title, row.excerpt, row.content);
        } catch (error) {
          await tx.blog.update({
            where: { id: row.id },
            data: { status: 'DRAFT', published: false, scheduledAt: null },
          });
          await tx.auditEvent.create({
            data: auditData(
              systemActor(),
              'BLOG_PUBLISH_FAILED',
              'BLOG',
              row.id,
              false,
              {
                reason:
                  error instanceof Error
                    ? error.message
                    : 'Article incomplete.',
              },
            ),
          });
          this.logger.warn(
            `Scheduled article ${row.id} is incomplete; returned to draft.`,
          );
          return 'skipped' as const;
        }

        await tx.blogRevision.create({
          data: {
            blogId: row.id,
            version: row.version,
            snapshot: JSON.parse(JSON.stringify(blogWire(row))),
            actorType: 'SYSTEM',
            actorId: 'scheduler',
          },
        });
        await tx.blog.update({
          where: { id: row.id },
          data: {
            status: 'PUBLISHED',
            published: true,
            /* The time that was promised, not the moment the sweep noticed. */
            publishedAt: row.publishedAt ?? row.scheduledAt ?? now,
            scheduledAt: null,
            version: { increment: 1 },
          },
        });
        await tx.auditEvent.create({
          data: auditData(systemActor(), 'BLOG_PUBLISHED', 'BLOG', row.id),
        });
        return 'published' as const;
      },
      { timeout: PUBLISH_TXN_TIMEOUT_MS },
    );
  }
}
