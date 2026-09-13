import { Prisma } from './prisma-client';

export function databaseErrorCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError)
    return error.errorCode;
  return undefined;
}
const unavailable = new Set([
  'P1001',
  'P1002',
  'P1008',
  'P1017',
  'P2024',
  'P2037',
]);
export function isDatabaseUnavailable(error: unknown): boolean {
  return (
    unavailable.has(databaseErrorCode(error) ?? '') ||
    error instanceof Prisma.PrismaClientInitializationError
  );
}
export function retryableRead(error: unknown): boolean {
  // Do not amplify an overloaded pool, retry configuration errors, or replay writes.
  return ['P1001', 'P1002', 'P1017'].includes(databaseErrorCode(error) ?? '');
}
