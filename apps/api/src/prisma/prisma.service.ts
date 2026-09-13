import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from './prisma-client';

/** Postgres/Supavisor conditions that are worth one more attempt: the
 *  connection was lost or refused, not the query rejected. */
const TRANSIENT = new Set([
  'P1001', // can't reach database server
  'P1002', // server reached but timed out
  'P1017', // server has closed the connection
]);

const RETRY_DELAY_MS = 250;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private closing = false;

  constructor() {
    super({
      log: [
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connected.');
    /* `bun --watch` and container stops can deliver a signal that Nest's own
       shutdown hooks miss, and a session-mode connection that is not released
       holds one of fifteen slots until the pooler times it out. */
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
      process.once(signal, () => void this.release());
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.release();
  }

  private async release(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    await this.$disconnect().catch(() => undefined);
  }

  /**
   * Runs a query, retrying once if the connection — not the query — failed.
   *
   * Callers opt in; it is deliberately not a global middleware, because a
   * blind retry of a write that already committed would be worse than the
   * error it hides.
   */
  async withRetry<T>(run: () => Promise<T>, label: string): Promise<T> {
    try {
      return await run();
    } catch (error) {
      const code =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : undefined;
      const initialisation =
        error instanceof Prisma.PrismaClientInitializationError;
      if (!initialisation && !(code && TRANSIENT.has(code))) throw error;

      this.logger.warn(
        `${label}: connection lost (${code ?? 'init'}), retrying once.`,
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return run();
    }
  }
}
