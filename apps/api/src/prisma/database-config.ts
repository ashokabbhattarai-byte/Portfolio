/**
 * Builds the Prisma connection URL, applying pool settings that suit the
 * transport in use.
 *
 * Supabase offers two poolers and they want opposite settings:
 *
 *   5432 session mode      one Postgres backend per pooled connection, so
 *                          prepared statements work and a query is one round
 *                          trip (~176ms here). Capped at 15 clients for this
 *                          project, so the pool must stay small.
 *   6543 transaction mode  multiplexed, effectively unlimited clients, but
 *                          Prisma must set pgbouncer=true and every query then
 *                          costs ~794ms — four times slower.
 *
 * A single long-lived API instance wants session mode. `pool_timeout` is how
 * long a request waits for a free connection; it has to exceed the slowest
 * transaction the app runs, or healthy work reports P2024 under load.
 */
export function databaseUrl(env: Record<string, string | undefined>): string {
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL ?? '');
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL must use PostgreSQL.');
  const set = (
    name: string,
    variable: string,
    fallback: number,
    max: number,
  ) => {
    const value =
      env[variable] ?? url.searchParams.get(name) ?? String(fallback);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > max)
      throw new Error(`${variable} must be between 1 and ${max}.`);
    url.searchParams.set(name, value);
  };

  if (
    url.hostname.endsWith('.pooler.supabase.com') &&
    url.port === '5432' &&
    (env.VERCEL === '1' ||
      env.VERCEL === 'true' ||
      env.NODE_ENV === 'production' ||
      env.USE_TRANSACTION_POOLER === 'true')
  ) {
    url.port = '6543';
  }

  const sessionPooler =
    url.hostname.endsWith('.pooler.supabase.com') && url.port === '5432';

  /* Session mode: five of the fifteen available client slots. Enough for this
     instance's concurrency, and it still leaves room for a rolling deploy
     (old and new instance overlapping), migrations and Prisma Studio.
     Overshooting produces `FATAL: (EMAXCONNSESSION) max clients reached`. */
  set('connection_limit', 'DATABASE_POOL_SIZE', sessionPooler ? 5 : 10, 100);
  set('connect_timeout', 'DATABASE_CONNECT_TIMEOUT', 5, 60);
  /* Comfortably longer than the slowest transaction the app runs (scheduled
     publication, ~1s per article) so queueing behind normal work never
     surfaces as P2024. */
  set('pool_timeout', 'DATABASE_POOL_TIMEOUT', 15, 60);
  if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543')
    url.searchParams.set('pgbouncer', 'true');
  return url.toString();
}
