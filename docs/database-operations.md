# Database reliability

The API owns one Prisma client and one bounded client-side connection pool per process. The runtime URL uses Supavisor transaction pooling (`6543`, `pgbouncer=true` for Prisma 6). This multiplexes API clients onto PostgreSQL backends rather than reserving a database session for every open client connection. `DIRECT_URL` remains a direct or session-pooler (`5432`) connection used by Prisma migrations. Never run migrations through the runtime transaction endpoint.

Transaction pooling has a prepared-statement compatibility cost. It is selected for shared connection capacity, not as a promise of lower latency. Prisma's `pgbouncer=true` flag is intentional; do not remove it to improve a single-query benchmark. Our publishing transactions use transaction-scoped advisory locks and `FOR UPDATE SKIP LOCKED`, which stay within their transaction. Do not add session-scoped locks or session state to that runtime path.

## Configuration

In `apps/api/.env`:

- `DATABASE_URL`: transaction pooler URL from Supabase's Connect panel; retain `sslmode=require` and `pgbouncer=true`.
- `DIRECT_URL`: direct/session endpoint for schema operations. Credentials are never printed by diagnostics.
- `DATABASE_POOL_SIZE`: application connections per API process (default 10). Budget the total across all replicas, deployment overlap, and other clients against the provider's client capacity. This is a safety boundary, not a cure for an unavailable database.
- `DATABASE_CONNECT_TIMEOUT`: connection establishment timeout in seconds (default 5).
- `DATABASE_POOL_TIMEOUT`: waiting time for an application pool connection in seconds (default 5).

Explicit variables take precedence over equivalent URL options; existing URL options are honored otherwise. The Supabase transaction endpoint automatically gets the Prisma compatibility flag. No code silently changes an arbitrary PostgreSQL endpoint or migration URL.

The old fixed five-connection session setup has been replaced locally. Do not copy this project's credentials into another environment. Obtain its own runtime and migration URLs from the deployment's Supabase project.

## Failure behavior

- Connectivity and pool-capacity failures return `503 DATABASE_UNAVAILABLE` with `Retry-After`, no-store, and a request identifier. Responses and application logs omit Prisma's SQL/parameter dumps and connection details.
- Authentication reads retry a recognized dropped connection once with short jitter. Pool overload, invalid credentials, write operations, and transactions are not blindly retried.
- Simultaneous account checks for the same user share an in-flight read. Results are discarded immediately on completion; disabled accounts and changed roles are checked again on the next request.
- An unavailable database never becomes an anonymous blog request. Authentication fails closed.
- Refresh cookies are cleared only for an invalid/expired session. Network and service failures preserve cookies; the browser does not treat a failed refresh service as invalid credentials.
- Admin server reads have a timeout. Non-401 authentication errors render a retryable Admin error page rather than redirecting to login. Actual invalid credentials still require login.
- Scheduled publishing backs off from 30 seconds to at most five minutes during failures. It avoids writing failure audits to a known-unavailable database. Due posts stay pending and are picked up after recovery; existing transactional claims remain in place.
- Nest owns client shutdown through its lifecycle. No duplicate process signal listeners disconnect active requests early.

## Checks and deployment

Run `bun run --filter='@portfolio/api' db:check` for bounded parallel reads and a transaction-lock compatibility check. It creates no blog posts, views, likes, or permanent fixture data.

Use `/api/health/live` for process liveness and `/api/health/ready` for database readiness. Configure readiness failures to remove a replica from traffic; do not restart every replica because the upstream database is briefly unavailable. An initial connectivity failure leaves readiness unavailable and lets Prisma reconnect on subsequent queries. Invalid connection configuration still fails startup.

Restart the API after changing environment variables. Keep only the intended API processes running. More API replicas each create another client pool. If `P1001` continues, check Supabase availability, network/DNS, runtime endpoint credentials, and provider logs. `P2024` denotes a local pool wait timeout and needs load/query investigation; it is not the same as `P1001`. Do not remove pool bounds or increase provider limits without measuring capacity.

References: [Supabase pooling and limits](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits), [Prisma/Supabase troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting), [Prisma error reference](https://docs.prisma.io/docs/orm/reference/error-reference).
