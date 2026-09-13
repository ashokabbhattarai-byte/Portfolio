# Portfolio analytics

A view is a visible public-page visit, including reloads and return navigation. Fragment links and query-only filter changes do not create new visits. Each mounted visit gets a UUID; retries reuse it. The page-view primary key enforces deduplication in PostgreSQL. The event and legacy content counter increment commit together. Reports and public counters use the event ledger, never a fallback to lifetime content counters.

The API resolves blog/project associations from the public path and excludes unpublished content, unknown routes, recognized bot user agents, cross-site tracking requests, and users with a valid ADMIN/EDITOR session. Client and server respect Do Not Track and Global Privacy Control. Browser requests retry transient failures twice. Delivery can still be prevented by offline browsing, blockers, or closing a tab; the system does not claim to measure every human visit or resist all deliberately forged traffic.

New visitor estimates use a random browser-local UUID, hashed before storage with a `v2:` prefix in the existing `ipHash` column. No raw IP is collected. Storage clearing and different browsers create separate identifiers. Unknown identifiers are excluded from distinct counts. Legacy IP hashes remain in the page-view ledger but are excluded from unique visitors, unique page views, and visit/session metrics to avoid mixing incompatible identifiers. Earlier duplicates or missing historical events cannot be reconstructed reliably and are not silently altered.

All period totals, sources, rankings and daily buckets use inclusive UTC calendar days (7, 30, 90, or all recorded history), with the current day ending at query time. Daily buckets include zeros. The explicitly labelled last-7/last-30 cards remain fixed windows. Multi-tag articles contribute to each topic, so topic totals are not additive. New referrers store only HTTP(S) origins; absent referrers appear as Direct / unknown.

Public `/api/analytics/views?path=...` exposes lifetime views and article likes for a verified public destination. Detailed reports remain authenticated. Query strings and fragments are removed; `/work` aliases are normalized to `/projects` for new events. Historical paths are retained as recorded. Article count failures show an unavailable state rather than manufacture a zero. Dashboard failures are displayed separately from empty reports; refresh polling pauses when the tab is hidden.

## Validation

- `bun run --filter='@portfolio/api' test:analytics` — isolated collector and ranking regressions.
- From `apps/api`, `bun test ./test/analytics-database.checks.ts` — integration test using the configured database. Inserts temporary fixture events inside a transaction and always rolls them back, including on assertion failure.
- `bun run typecheck`, `bun run lint`, `bun run build`.

Browser checks cover stable visitor identifiers, retry event IDs, reloads, fragment navigation, public count rendering, reporting filters, search, CSV export and mobile layout. Dashboard tests use intercepted responses and never publish mock events.

## Visits and reader engagement

A visit starts with a browser’s first recorded page view or after at least 30 minutes of inactivity. Session boundaries are calculated server-side from timestamped events across all public pages, with a 30-minute lookback at reporting boundaries. Visits belong to the period in which they start. Page reports label this as visits starting on that page, not all sessions that touched that page. Unknown and legacy identifiers do not generate estimated visits. Unique page views count distinct browser/path pairs across the entire selected period. Daily visitor counts are not additive across dates.

`GET /api/analytics/blog-counts` returns view and like counts for published articles in one shared card request. `POST /api/analytics/like` takes an explicit desired `liked` state plus the article path and a random browser UUID. A composite database key prevents duplicate active likes. Unlike removes only that browser’s like; retries are idempotent. The anonymous hash is never returned publicly. `GET /api/analytics/views` optionally accepts `x-visitor-id` to return that browser’s liked state. Likes are anonymous browser estimates, not verified people or fraud-proof votes.

The dashboard shows active likes whose creation date is within the selected period; unlikes remove them from those counts. Public article counts show all currently active likes. No likes are fabricated or backfilled. The additive migration creates `blog_likes` and indexes the page-view timeline and browser timeline; deploy it and regenerate Prisma before running the new API.
