import { Logger } from '@nestjs/common';
import { describe, expect, test, spyOn } from 'bun:test';
import { UnauthorizedException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '../src/prisma/prisma-client';
import { databaseUrl } from '../src/prisma/database-config';
import { retryDatabaseRead, PrismaService } from '../src/prisma/prisma.service';
import { DatabaseExceptionFilter } from '../src/prisma/database-exception.filter';
import { AuthController } from '../src/auth/auth.controller';
import { BlogScheduler } from '../src/blogs/blog-scheduler.service';

const error = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(
    'private query and connection credentials',
    { code, clientVersion: '6.19.3' },
  );

describe('database connection safety', () => {
  test('uses transaction compatibility and explicit pool budgets without changing migration credentials', () => {
    const env = {
      DATABASE_URL:
        'postgresql://user:secret@aws-test.pooler.supabase.com:6543/postgres?sslmode=require',
      DIRECT_URL: 'postgresql://user:secret@host:5432/postgres',
      DATABASE_POOL_SIZE: '12',
    };
    const url = new URL(databaseUrl(env));
    expect(url.port).toBe('6543');
    expect(url.searchParams.get('pgbouncer')).toBe('true');
    expect(url.searchParams.get('connection_limit')).toBe('12');
    expect(url.searchParams.get('connect_timeout')).toBe('5');
    expect(env.DIRECT_URL).toEndWith(':5432/postgres');
    expect(() => databaseUrl({ ...env, DATABASE_POOL_SIZE: '0' })).toThrow(
      'DATABASE_POOL_SIZE',
    );
    expect(() => databaseUrl({ DATABASE_URL: 'secret-value' })).toThrow(
      'valid PostgreSQL',
    );
  });

  test('session mode gets a small pool and no pgbouncer flag', () => {
    /* Supabase caps the session pooler at 15 clients for this project, so the
       default has to leave room for a rolling deploy and migrations. Prepared
       statements work in session mode, so pgbouncer=true must NOT be set —
       it is what makes every query four times slower. */
    const url = new URL(
      databaseUrl({
        DATABASE_URL:
          'postgresql://user:secret@aws-test.pooler.supabase.com:5432/postgres?sslmode=require',
      }),
    );
    expect(url.port).toBe('5432');
    expect(url.searchParams.get('pgbouncer')).toBeNull();
    expect(url.searchParams.get('connection_limit')).toBe('5');
  });

  test('pool_timeout outlasts the slowest transaction the app runs', () => {
    /* Scheduled publication takes about a second per article. A five-second
       pool_timeout made normal queueing surface as P2024 across the API. */
    const url = new URL(
      databaseUrl({
        DATABASE_URL:
          'postgresql://user:secret@aws-test.pooler.supabase.com:5432/postgres',
      }),
    );
    expect(Number(url.searchParams.get('pool_timeout'))).toBeGreaterThanOrEqual(
      15,
    );
  });
  test('retries only safe transient reads once; overload and credentials are not retried', async () => {
    let count = 0;
    expect(
      await retryDatabaseRead(async () => {
        if (++count === 1) throw error('P1001');
        return 'recovered';
      }),
    ).toBe('recovered');
    expect(count).toBe(2);
    for (const code of ['P2024', 'P2002', 'P1000']) {
      let calls = 0;
      await expect(
        retryDatabaseRead(async () => {
          calls++;
          throw error(code);
        }),
      ).rejects.toThrow();
      expect(calls).toBe(1);
    }
    let failures = 0;
    await expect(
      retryDatabaseRead(async () => {
        failures++;
        throw error('P1017');
      }),
    ).rejects.toThrow();
    expect(failures).toBe(2);
  });
  test('coalesces overlapping auth reads but does not retain permission decisions', async () => {
    let calls = 0;
    let disabled = false;
    class TestPrisma extends PrismaService {
      protected async readAuthUser(id: string) {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return {
          id,
          name: 'Editor',
          email: 'editor@example.test',
          role: 'EDITOR' as const,
          disabledAt: disabled ? new Date() : null,
        };
      }
    }
    const prisma = new TestPrisma();
    try {
      await Promise.all([
        prisma.authUser('id'),
        prisma.authUser('id'),
        prisma.authUser('id'),
      ]);
      expect(calls).toBe(1);
      disabled = true;
      expect((await prisma.authUser('id'))?.disabledAt).not.toBeNull();
      expect(calls).toBe(2);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('database failures return 503 with retry guidance without leaking query text', () => {
    const headers: Record<string, string> = {};
    let status = 0;
    let body: unknown;
    const response = {
      setHeader: (key: string, value: string) => {
        headers[key] = value;
      },
      status: (value: number) => {
        status = value;
        return response;
      },
      json: (value: unknown) => {
        body = value;
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          method: 'GET',
          route: { path: '/api/blogs/:id' },
          originalUrl: '/api/blogs/private-id?token=private-token',
        }),
      }),
    } as unknown as ArgumentsHost;
    const log = spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    try {
      new DatabaseExceptionFilter().catch(error('P1001'), host);
      const messages = JSON.stringify(log.mock.calls);
      expect(messages).toContain('method=GET route=/api/blogs/:id');
      expect(messages).not.toContain('private-id');
      expect(messages).not.toContain('private-token');
      expect(messages).not.toContain('private query');
    } finally {
      log.mockRestore();
    }
    expect(status).toBe(503);
    expect(headers['Retry-After']).toBe('3');
    expect(headers['Cache-Control']).toBe('no-store');
    expect(JSON.stringify(body)).toContain('DATABASE_UNAVAILABLE');
    expect(JSON.stringify(body)).not.toContain('private query');
  });
  test('refresh preserves cookies on outages and clears them only for invalid sessions', async () => {
    for (const [failure, expected] of [
      [error('P1001'), 0],
      [new UnauthorizedException(), 2],
    ] as const) {
      let cleared = 0;
      const controller = new AuthController(
        {
          refresh: async () => {
            throw failure;
          },
        } as never,
        {} as never,
        { get: () => 'development' } as never,
      );
      await expect(
        controller.refresh(
          { cookies: { refresh_token: 'test' }, get: () => undefined } as never,
          {
            clearCookie: () => {
              cleared++;
            },
          } as never,
        ),
      ).rejects.toThrow();
      expect(cleared).toBe(expected);
    }
  });
  test('scheduler backs off during an outage instead of adding audit queries to a dead database', async () => {
    let attempts = 0;
    let audits = 0;
    let now = 100000;
    const clock = spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const scheduler = new BlogScheduler(
        {
          publishDue: async () => {
            if (++attempts === 1) throw error('P1001');
            return 0;
          },
        } as never,
        {} as never,
        {
          record: async () => {
            audits++;
          },
        } as never,
      );
      await scheduler.tick();
      await scheduler.tick();
      expect(attempts).toBe(1);
      expect(audits).toBe(0);
      now += 30001;
      await scheduler.tick();
      expect(attempts).toBe(2);
    } finally {
      clock.mockRestore();
    }
  });
});
