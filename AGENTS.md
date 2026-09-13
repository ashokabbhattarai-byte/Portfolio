# Repository layout

A bun-workspaces + Turborepo monorepo. There is no code at the repo root.

```
apps/web    Next.js 16 App Router. app/(public) is the portfolio,
            app/(admin)/admin is the CMS. See apps/web/AGENTS.md —
            this Next.js version has breaking changes and its docs are
            vendored at apps/web/node_modules/next/dist/docs/.
apps/api    NestJS + Prisma. Owns the database and all authentication.
packages/types
            The wire contract between the two. Hand-written on purpose:
            the web app must not depend on the Prisma client.
packages/mcp
            Local stdio MCP server. Exposes the publishing tools to Claude,
            Codex and friends by calling /api/v1/ai — it holds no business
            logic of its own. See docs/ai-publishing.md.
```

The AI publishing surface (`apps/api/src/publishing/`) reuses `BlogsService`
and `MediaService` rather than reimplementing them; only the authentication
differs (a `pf_live_` key plus a scope check, instead of the admin cookie).
`publisherScopes` in `packages/types` must stay identical to `SCOPES` in
`apps/api/src/publishing/scopes.ts` — the guard compares against the latter, so
anything listed only in the former is unenforceable.

Run scripts with `bun run --filter='@portfolio/web' <script>` (note the
position of `run` — `bun --filter X run Y` does not match anything here).
Turborepo fans out from the root: `bun run build`, `bun run typecheck`.

`bun install` uses isolated installs, so each workspace has its own
`node_modules` with a symlink back to `packages/types`. Nothing is hoisted
to the root except the root devDependencies.

# Env

Env is per-app. There is no `.env` at the repo root.

- `apps/api/.env` – DATABASE_URL, DIRECT_URL, JWT secrets, SUPABASE__, SEED_ADMIN__, REVALIDATE_SECRET, WEB_URL
  Copy from `apps/api/.env.example`.
- `apps/web/.env` – NEXT_PUBLIC_SITE_URL, API_URL, SUPABASE_URL, REVALIDATE_SECRET, JWT_ACCESS_SECRET
  Copy from `apps/web/.env.example`.

`apps/api/src/config/env.ts` loads `apps/api/.env` (fallback to legacy root for CI).
Next.js loads `apps/web/.env` automatically. Both share `REVALIDATE_SECRET` and
`JWT_ACCESS_SECRET` – keep them in sync or revalidation and `/admin` proxy fail.

# Conventions

Prettier and the ESLint configs are authoritative — run
`bun run format` and the per-app `lint` before finishing.

`apps/api/prisma/schema.prisma` and `packages/types/src/index.ts` describe
the same data twice. Change them together or the apps drift apart.

The public site must build and render with the API down: `apps/web/lib/content.ts`
falls back to the static files in `apps/web/content/`. Do not remove that path.
