import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../prisma/prisma-client';
import { PageQuery } from './query.dto';

/** Read-only activity feed. Events are written by the services themselves, so
 *  there is no create route: nothing should be able to forge an audit entry. */
@Controller('publisher-activity')
@Roles('ADMIN', 'EDITOR')
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() query: PageQuery) {
    const where: Prisma.AuditEventWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.actorType ? { actorType: query.actorType } : {}),
      ...(query.success !== undefined
        ? { success: query.success === 'true' }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            },
          }
        : {}),
    };
    /* Promise.all, not $transaction: the array form wraps the pair in
       BEGIN/COMMIT, which costs two extra round trips — ~500ms on a remote
       pooler — to buy consistency a paginated read does not need. */
    /* All three at once. Fetching every key rather than only the ids on this
       page looks wasteful, but there are a handful of them and it removes a
       dependent third round trip — worth ~350ms against a remote pooler.
       Names are safe to show; secrets are not stored at all. */
    const [items, total, keys] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditEvent.count({ where }),
      this.prisma.publisherKey.findMany({
        select: { id: true, name: true, prefix: true },
      }),
    ]);
    const byId = new Map(keys.map((k) => [k.id, k]));

    return {
      items: items.map((item) => ({
        ...item,
        apiKey: item.apiKeyId ? (byId.get(item.apiKeyId) ?? null) : null,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** Powers the filter dropdown without hard-coding the vocabulary in the UI. */
  @Get('actions')
  async actions() {
    const rows = await this.prisma.auditEvent.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
      take: 100,
    });
    return rows.map((r) => r.action);
  }
}
