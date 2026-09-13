import { PrismaService } from '../src/prisma/prisma.service';
import { databaseErrorCode } from '../src/prisma/database-errors';

const prisma = new PrismaService();
const started = Date.now();
try {
  await prisma.$queryRaw`SELECT 1`;
  await Promise.all(
    Array.from({ length: 8 }, () => prisma.$queryRaw`SELECT 1`),
  );
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('portfolio-readiness-check', 0))`;
    await tx.$queryRaw`SELECT id FROM blogs WHERE FALSE FOR UPDATE SKIP LOCKED`;
  });
  console.log(
    JSON.stringify({
      status: 'ok',
      parallelReads: 8,
      transactionLocks: 'ok',
      elapsedMs: Date.now() - started,
    }),
  );
} catch (error) {
  // Do not print database URLs, Prisma query dumps, credentials, or metadata.
  console.error(
    JSON.stringify({
      status: 'unavailable',
      code: databaseErrorCode(error) ?? 'DATABASE_CHECK_FAILED',
    }),
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
