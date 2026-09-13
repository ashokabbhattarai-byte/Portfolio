import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { fail } from './common';

/* A fixed window per key, counted in Postgres rather than in memory so the
   limit holds across replicas and survives a restart. The row id encodes the
   window, so expiry is a delete of stale rows rather than a TTL sweep. */
@Injectable()
export class PublisherRateService {
  private readonly logger = new Logger(PublisherRateService.name);
  private readonly limit: number;
  private readonly windowMs: number;
  private lastSweep = 0;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.limit = Math.max(1, Number(config.get('AI_RATE_LIMIT') ?? 60));
    this.windowMs = Math.max(
      1_000,
      Number(config.get('AI_RATE_WINDOW_MS') ?? 60_000),
    );
  }

  async consume(keyId: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - (now % this.windowMs);
    const id = `${keyId}:${windowStart}`;
    const expiresAt = new Date(windowStart + this.windowMs);

    /* upsert returns the post-increment count, so the check is atomic and two
       concurrent requests cannot both see "limit - 1". */
    const row = await this.prisma.publisherRate.upsert({
      where: { id },
      create: { id, count: 1, expiresAt },
      update: { count: { increment: 1 } },
    });

    if (now - this.lastSweep > this.windowMs) {
      this.lastSweep = now;
      void this.prisma.publisherRate
        .deleteMany({ where: { expiresAt: { lt: new Date(now) } } })
        .catch(() =>
          this.logger.warn('Rate-window sweep failed; retrying later.'),
        );
    }

    if (row.count > this.limit) {
      const retryAfter = Math.ceil((expiresAt.getTime() - now) / 1000);
      fail(
        'RATE_LIMIT_EXCEEDED',
        `Rate limit of ${this.limit} requests per ${Math.round(
          this.windowMs / 1000,
        )}s exceeded. Retry in ${retryAfter}s.`,
        429,
      );
    }
  }
}
