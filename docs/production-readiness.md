# Production verification — September 18, 2026

## Changes in this pass

- Initial content is visible immediately; no greeting curtain delays a ready page. Route transitions and the portrait animation remain. Reduced motion disables decorative hover cursors.
- Public error recovery uses Next 16's `retry` API.
- The public content feed uses the same published/non-deleted predicate and blog serializer as the blog service. Overdue scheduled posts remain private until the publishing transaction succeeds. Featured media and SEO fields are preserved.
- Concurrent content requests share one in-flight read, including partial requests. Completed responses are not held in a process cache that could refill an invalidated Next cache with old content. The HTTP feed uses no-store; Next's tagged server-fetch cache remains the public page cache.
- Hover previews receive only display fields, not entire article bodies or project case studies. Below-fold article thumbnails load lazily.
- Public and Admin list queries have separate cache keys. Query-key generation no longer mutates the caller's array.
- Removed the invented Twitter handle derived from the GitHub username and corrected generic project image descriptions.
- Patched transitive Multer to 2.3.0 and deepmerge-ts to 8.0.0 using root overrides. Keep these pins until the parent dependencies adopt patched versions. Prisma schema validation and the full build/test checks passed after the updates.

## Evidence

Commands run successfully: `bun run test`, `bun run lint`, `bun run typecheck`, `bun run build`, `bun audit --json`, and `bunx --no-install prisma validate` from apps/api. The API suite ran 44 tests; web and MCP test tasks also passed. The final dependency audit returned no advisories. Added regression checks for content request coalescing, fresh reads after edits, recovery after errors, and the public query/SEO contract.

The production web build was started on temporary port 3012 with the API offline. Home and mobile navigation to Projects rendered with committed fallback content. The 390px layout had no horizontal overflow, the intro curtain was hidden, and the page was not scroll-locked. One unthrottled localhost navigation measured first contentful paint around 268ms and first response around 68ms. These are local observations, not mobile-network benchmarks or field Core Web Vitals. The missing API caused analytics requests to fail during this offline check; tracking was not claimed as end-to-end verified.

`.github/workflows/verify.yml` repeats formatting, lint, types, tests, build, and high-severity dependency checks on pull requests and main pushes. The workflow itself still needs its first GitHub run.

## Deployment checks still required

1. Configure the real HTTPS `NEXT_PUBLIC_SITE_URL`, API and web origins, matching JWT/revalidation secrets, storage settings, and database runtime/migration URLs. Do not deploy localhost example values. Read `database-operations.md` and `ai-publishing.md` for the full environment and scheduler setup.
2. Run reviewed Prisma migrations with `bun run db:deploy`; no database reset is needed for this pass. Run the API as a persistent process if using its built-in scheduler.
3. Configure readiness and liveness probes and external error monitoring. Confirm the host/CDN honors Next revalidation and does not independently cache `/api/content` or private routes.
4. On staging with the actual database and storage, verify login/refresh, upload, draft preview, publish/unpublish and cache invalidation, scheduled publishing, API-key revocation/scopes, and analytics. Unit checks and an offline public preview do not replace these integrations.
5. Test the deployed site on physical iOS/Android devices and throttled mobile networks. Measure LCP, INP, CLS and API latency with real traffic before setting performance claims. Verify sitemap/canonical URLs against the real domain.

This is a verified hardening pass, not a guarantee that every possible bug has been eliminated or that hosting and external providers are configured correctly.
