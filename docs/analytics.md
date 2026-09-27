# Portfolio analytics

A view is a visible public-page visit, including reloads and return navigation. Fragment links and query-only filter changes do not create new visits. Each mounted visit gets a UUID; retries reuse it. The page-view primary key enforces deduplication in PostgreSQL. Raw visits drive dashboard reports. Public blog counters use the distinct-browser ledger described below; other public page counters use raw visits. No displayed count falls back to a fabricated total.

The API resolves blog/project associations from the public path and excludes unpublished content, unknown routes, recognized bot user agents, cross-site tracking requests, and users with a valid ADMIN/EDITOR session. Client and server respect Do Not Track and Global Privacy Control. Browser requests retry transient failures twice. Delivery can still be prevented by offline browsing, blockers, or closing a tab; the system does not claim to measure every human visit or resist all deliberately forged traffic.

New visitor estimates use a random browser-local UUID, hashed before storage with a `v2:` prefix in the existing `ipHash` column. No raw IP is collected. Storage clearing and different browsers create separate identifiers. Unknown identifiers are excluded from distinct counts. Legacy IP hashes remain in the page-view ledger but are excluded from unique visitors, unique page views, and visit/session metrics to avoid mixing incompatible identifiers. Earlier duplicates or missing historical events cannot be reconstructed reliably and are not silently altered.

All period totals, sources, rankings and daily buckets use inclusive UTC calendar days (7, 30, 90, or all recorded history), with the current day ending at query time. Daily buckets include zeros. The explicitly labelled last-7/last-30 cards remain fixed windows. Multi-tag articles contribute to each topic, so topic totals are not additive. New referrers store only HTTP(S) origins; absent referrers appear as Direct / unknown.

Public `/api/analytics/views?path=...` exposes lifetime views and article likes for a verified public destination. Detailed reports remain authenticated. Query strings and fragments are removed; `/work` aliases are normalized to `/projects` for new events. Historical paths are retained as recorded. Article count failures show an unavailable state rather than manufacture a zero. Dashboard failures are displayed separately from empty reports; refresh polling pauses when the tab is hidden.

## Validation

- `bun run --filter='@portfolio/api' test:analytics` — isolated collector and ranking regressions.
- From `apps/api`, `bun test ./test/analytics-database.checks.ts` — integration test using the configured database. Use a disposable PostgreSQL database configured with UTC timezone. Most fixtures roll back; the concurrency fixture commits isolated test articles and deletes them and their visits in a finally block.
- `bun run typecheck`, `bun run lint`, `bun run build`.

Browser checks cover stable visitor identifiers, retry event IDs, reloads, fragment navigation, public count rendering, reporting filters, search, CSV export and mobile layout. Dashboard tests use intercepted responses and never publish mock events.

## Visits and reader engagement

A visit starts with a browser’s first recorded page view or after at least 30 minutes of inactivity. Session boundaries are calculated server-side from timestamped events across all public pages, with a 30-minute lookback at reporting boundaries. Visits belong to the period in which they start. Page reports label this as visits starting on that page, not all sessions that touched that page. Unknown and legacy identifiers do not generate estimated visits. Unique page views count distinct browser/path pairs across the entire selected period. Daily visitor counts are not additive across dates.

`GET /api/analytics/blog-counts` returns view and like counts for published articles in one shared card request. `POST /api/analytics/like` takes an explicit desired `liked` state plus the article path and a random browser UUID. A composite database key prevents duplicate active likes. Unlike removes only that browser’s like; retries are idempotent. The anonymous hash is never returned publicly. `GET /api/analytics/views` optionally accepts `x-visitor-id` to return that browser’s liked state. Likes are anonymous browser estimates, not verified people or fraud-proof votes.

The dashboard shows active likes whose creation date is within the selected period; unlikes remove them from those counts. Public article counts show all currently active likes. No likes are fabricated or backfilled. The additive migration creates `blog_likes` and indexes the page-view timeline and browser timeline; deploy it and regenerate Prisma before running the new API.

## Unique article views

Public article counters and `Blog.viewCount` count each persistent browser once per article, for the lifetime of its identity. `blog_views` enforces this with a composite primary key on article ID and hashed browser ID. The first-view claim, counter increment, and raw visit are committed together. Refreshes, different event IDs, simultaneous tabs, retries, and slug changes cannot increment the same browser/article pair twice. Raw `page_views` and dashboard visit reports still include repeat visits.

The migration `20260927000000_unique_blog_views` backfills each known `v2:` browser/article pair at its earliest visit, and reconciles article counters. It preserves the raw history and excludes anonymous/legacy events from unique counts because their browser identity is unknown. Apply migrations with `bun run db:deploy` before deploying the updated API, then regenerate Prisma. Pause old API collectors during rollout; old instances increment counters using the previous semantics.

Web Locks serialize first-use identity creation across tabs in supporting browsers. If local storage is blocked, visits can still be recorded without a browser identity, but cannot increase unique readership. Clearing storage, private sessions, other browser profiles, and deliberately replacing IDs can create a new identity. This is anonymous browser deduplication, not physical-device identification or fraud-proof audience measurement. Known bots, editor sessions, privacy opt-outs, and unpublished/deleted articles remain excluded from tracking.

## Request and cache budgets

- All blog cards share one React Query request. Counts are fresh in the browser for 60 seconds, with no polling, focus/reconnect refetch, automatic error retries, or failed-query retries on remount. Article counters use the same query options and visitor-aware request everywhere.
- Next handles `/api/analytics/blog-counts` with a 30-second Data Cache tagged `blogs`, so content edits also invalidate it. Concurrent cold requests share an in-flight fetch per web instance. Upstream failures have a five-second cooldown and return 503, never a fabricated zero. No visitor IDs, cookies, or authorization headers enter this shared cache. Detail/like state and writes remain uncached. Shared totals can lag behind new readers; the browser's 60-second freshness interval adds to that delay.
- Tracking writes return the article count when they create a new reader. The browser patches its cached counts from that response; likes do the same. No global counter/dashboard invalidation is triggered by public visits or likes. Late initial reads cannot overwrite a completed write.
- Rapid visits to the same path and identity within 10 seconds are coalesced, including reloads within the same tab when session storage works. These rapid repeats no longer generate separate raw visit records. Normal later visits still do. Simultaneous mounts share one pending POST; lifetime uniqueness is still enforced by PostgreSQL.
- Tracking has an eight-second timeout and at most two transient-failure retries with exponential delay and jitter. HTTP 429 and other client errors do not retry automatically. The existing Nest throttle remains in place (300 requests per minute per handler/tracker). No tighter per-IP limits are added because the API currently sees proxy connections and tighter limits could throttle unrelated visitors together. Limits are per API instance with the current in-memory throttler; distributed abuse protection belongs at the gateway or a shared rate-limit store.

Regression tests cover 50 concurrent card queries producing one read, 50 rapid tracking requests producing one POST, cache updates without refetches, late-response races, and retry eligibility. A production Next smoke check additionally verifies shared cache reuse, 30-second expiry, and absence of forwarded personal headers against an isolated mock API.
