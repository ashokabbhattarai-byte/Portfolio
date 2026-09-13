import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from './prisma-client';
import { databaseUrl } from './database-config';
import { databaseErrorCode, retryableRead } from './database-errors';

export async function retryDatabaseRead<T>(
  run: () => Promise<T>,
  retry: (code: string) => void = () => {},
) {
  try {
    return await run();
  } catch (error) {
    if (!retryableRead(error)) throw error;
    retry(databaseErrorCode(error)!);
    await new Promise((resolve) =>
      setTimeout(resolve, 150 + Math.floor(Math.random() * 150)),
    );
    return run();
  }
}

const authSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  disabledAt: true,
} as const;
type AuthRecord = Awaited<ReturnType<PrismaService['readAuthUser']>>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly authReads = new Map<string, Promise<AuthRecord>>();
  constructor() {
    super({ datasources: { db: { url: databaseUrl(process.env) } }, log: [] });
  }
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected.');
    } catch (error) {
      if (!retryableRead(error)) throw error;
      this.logger.warn(
        'Database unavailable at startup; readiness will remain unavailable until it recovers.',
      );
    }
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
  async withRetry<T>(run: () => Promise<T>, label: string): Promise<T> {
    return retryDatabaseRead(run, (code) =>
      this.logger.warn(
        `${label}: transient database read failure (${code}); retrying once.`,
      ),
    );
  }
  protected readAuthUser(id: string) {
    return this.withRetry(
      () => this.user.findUnique({ where: { id }, select: authSelect }),
      'auth.read',
    );
  }
  authUser(id: string): Promise<AuthRecord> {
    const pending = this.authReads.get(id);
    if (pending) return pending;
    // Coalesce only concurrent checks. Nothing survives completion, so roles
    // and account disablement are still checked afresh on the next request.
    const read = this.readAuthUser(id).finally(() => this.authReads.delete(id));
    this.authReads.set(id, read);
    return read;
  }
}
