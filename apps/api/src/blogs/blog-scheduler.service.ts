import {
  databaseErrorCode,
  isDatabaseUnavailable,
} from '../prisma/database-errors';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlogsService } from './blogs.service';
import { AuditService } from '../publishing/audit.service';
import { systemActor } from '../publishing/common';
@Injectable()
export class BlogScheduler implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private nextAttemptAt = 0;
  private failures = 0;
  private readonly logger = new Logger(BlogScheduler.name);
  constructor(
    private readonly blogs: BlogsService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}
  onModuleInit() {
    if (this.config.get('BLOG_SCHEDULER_ENABLED') === 'false') return;
    const interval = Math.max(
      5000,
      Number(this.config.get('BLOG_SCHEDULER_INTERVAL_MS') || 15000),
    );
    this.timer = setInterval(
      () => void this.tick(),
      Number.isFinite(interval) ? interval : 15000,
    );
    this.timer.unref();
    void this.tick();
  }
  async tick() {
    if (this.running || Date.now() < this.nextAttemptAt) return;
    this.running = true;
    const startedAt = Date.now();
    try {
      const count = await this.blogs.publishDue();
      if (this.failures)
        this.logger.log('Scheduled publishing checks recovered.');
      this.failures = 0;
      this.nextAttemptAt = 0;
      if (count) this.logger.log(`Published ${count} scheduled article(s).`);
    } catch (error) {
      this.failures = Math.min(this.failures + 1, 5);
      this.nextAttemptAt =
        Date.now() + Math.min(300000, 15000 * 2 ** this.failures);
      const actor = systemActor();
      const metadata = {
        code: databaseErrorCode(error) ?? 'SCHEDULER_CHECK_FAILED',
        elapsedMs: Date.now() - startedAt,
        attempt: this.failures,
        retryAt: new Date(this.nextAttemptAt).toISOString(),
      };
      this.logger.error(
        `Scheduled publishing check failed code=${metadata.code} elapsedMs=${metadata.elapsedMs} retryAt=${metadata.retryAt} correlation=${actor.correlationId}. Due articles remain queued.`,
      );
      if (isDatabaseUnavailable(error)) return;
      await this.audit
        .record(actor, 'SCHEDULER_FAILED', 'BLOG', undefined, false, metadata)
        .catch(() => this.logger.error('Scheduler failure audit unavailable.'));
    } finally {
      this.running = false;
    }
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
