# AI publishing

Lets external agents — Claude, ChatGPT, Codex, Cursor — draft, edit, illustrate
and (if you allow it) publish articles on the portfolio, without ever holding
the admin password.

Everything they can do, the admin UI does too, through the same services. There
is one implementation of "create an article"; the two surfaces differ only in
how the caller is authenticated.

```
Claude / Codex ──stdio──> packages/mcp ──HTTPS──> /api/v1/ai ─┐
                                                               ├─> BlogsService
Admin browser ──cookie──> /api/blogs, /api/media ─────────────┘   MediaService
                                                                  AuditService
```

## You do not need an AI provider key

Nothing here calls OpenAI or Anthropic. The key points the other way:

```
Claude / ChatGPT / Codex          your portfolio
  (writes the article) ──────────> (decides what they may do)
         holds PORTFOLIO_API_KEY ──┘  issues PORTFOLIO_API_KEY
```

The assistant does the writing on whatever plan you already use. The
`pf_live_…` key is issued by **your** admin and only says what that assistant
is allowed to do here — draft, edit, schedule, publish. No provider credential
is involved at any point.

The one exception is `generate_image`, which is off unless you set
`IMAGE_PROVIDER`. Without it, agents add pictures with `import_image` (give a
URL, we store our own copy) or you upload them in Admin → Media.

### Which assistants can connect

MCP servers are launched by the client, so the client has to support MCP:

| Client         | Works                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Claude Desktop | Yes — local MCP servers are supported                                                          |
| Claude Code    | Yes                                                                                            |
| Codex CLI      | Yes                                                                                            |
| Cursor         | Yes                                                                                            |
| ChatGPT        | Depends on your plan — custom connectors sit behind Developer Mode, which is not on every tier |

If your ChatGPT plan has no connector support, ask it to write the article and
paste the result into the admin editor — the manual path is fully built and
does not need a key at all.

## Creating a key

A key looks like `pf_live_<8 hex><43 chars>` and is shown **once**; the
database stores the prefix in the clear and a SHA-256 of the secret. Losing a
key means rotating it, not recovering it.

Three ways, all equivalent — they go through the same service and are audited
the same:

**Command line** (easiest — no server or login needed, just the database):

```bash
bun run --filter='@portfolio/api' key:create -- --name "Claude Desktop"
bun run --filter='@portfolio/api' key:create -- --name "Codex" --scopes blog:read,blog:create,blog:publish
bun run --filter='@portfolio/api' key:create -- --list
bun run --filter='@portfolio/api' key:create -- --help
```

With no `--scopes` it grants the draft-and-illustrate set:
`blog:read, blog:create, blog:update, media:read, media:upload`.

**Admin UI**: `bun run dev`, then <http://localhost:3000/admin/ai/api-keys> →
_Create API key_.

**curl** (needs the API running and an admin session):

```bash
# 1. sign in, keeping the cookie
curl -s -c /tmp/pf-cookies.txt -X POST http://localhost:4000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com","password":"…"}'

# 2. issue the key
curl -s -b /tmp/pf-cookies.txt -X POST http://localhost:4000/api/publisher-keys \
  -H 'content-type: application/json' \
  -d '{"name":"Claude Desktop","scopes":["blog:read","blog:create","blog:update","media:read","media:upload"]}'
```

The `key` field in the response is the only copy.

## Scopes

| Scope            | Allows                                        |
| ---------------- | --------------------------------------------- |
| `blog:read`      | List and read articles, including drafts      |
| `blog:create`    | Create articles — always as drafts            |
| `blog:update`    | Edit content, SEO fields and images           |
| `blog:publish`   | Make an article publicly visible now          |
| `blog:schedule`  | Set a future publication time                 |
| `blog:unpublish` | Withdraw a published article                  |
| `media:read`     | List images                                   |
| `media:upload`   | Upload images, or import them from a URL      |
| `media:generate` | Generate images (needs a provider configured) |
| `media:delete`   | Delete unused images                          |

Scopes are enforced server-side on every request, and status is treated as a
privilege rather than a field: a key without `blog:publish` is refused whether
it calls `POST /blogs/:id/publish` or sends `{"status":"PUBLISHED"}` to the
update route. A newly created article is a draft no matter what the body says.

A sensible default grant for a writing assistant is
`blog:read, blog:create, blog:update, media:read, media:upload` — it can do
everything up to the moment of publishing, and you press the button.

## Connecting an agent

Build once, then point the client at the binary:

```bash
bun install
bun run --filter='@portfolio/mcp' build
```

Claude Desktop / Claude Code (`claude_desktop_config.json`, or
`claude mcp add`):

```json
{
  "mcpServers": {
    "portfolio": {
      "command": "node",
      "args": ["/absolute/path/to/Portfilio/packages/mcp/dist/index.js"],
      "env": {
        "PORTFOLIO_API_URL": "https://your-api.example.com",
        "PORTFOLIO_API_KEY": "pf_live_…"
      }
    }
  }
}
```

The same two environment variables work for any MCP-capable client. The server
talks stdio only — it is never exposed on a port.

It is started **by the client**, not by you, which is why it has no `dev` or
`start` script and does not appear in `bun run dev`. To debug it by hand:

```bash
PORTFOLIO_API_KEY=pf_live_… bun run --filter='@portfolio/mcp' serve
```

### Tools

`list_blogs` · `get_blog` · `create_blog` · `update_blog` · `publish_blog` ·
`schedule_blog` · `unpublish_blog` · `attach_featured_image` · `list_media` ·
`import_image` · `generate_image`

Each tool's description names the scope it needs, so an agent can tell you it
lacks permission before writing a whole article rather than after.

## What you can ask for

> "Write an article explaining how I built SuchanaAI. Include a featured image,
> SEO title and description, a slug and five tags. Save it as a draft."

The agent writes the content, calls `import_image` (or `generate_image`) to put
a picture in your media library, `create_blog` to save the draft, and
`attach_featured_image` to wire the two together. It lands in
**Admin → Blogs** as a draft marked `AI`.

> "Schedule it for 20 September 2026 at 8pm Nepal time."

Needs `blog:schedule`. The agent sends `2026-09-20T20:00:00+05:45`. Times
without an offset are rejected — Kathmandu is UTC+05:45 and a bare local time
is ambiguous.

> "Publish it now."

Needs `blog:publish`. Without it the call fails with `MISSING_SCOPE` and the
article stays a draft.

## Images

There are three ways an image reaches the library, and all three end up as the
same thing: a WebP in your own storage, resized to fit 2400px, stripped of
metadata, with a row in `media_assets`.

- **Upload** — drag into Admin → Media, or `POST /api/v1/ai/media/upload`.
- **Import from a URL** — `import_image`. The server downloads it; private,
  loopback and cloud-metadata addresses are refused, redirects are re-checked
  at each hop, and the body is capped at 8 MB while it streams.
- **Generate** — `generate_image`, if `IMAGE_PROVIDER` is configured. With no
  provider it returns `IMAGE_GENERATION_UNAVAILABLE` and the agent is told to
  import or ask you to upload instead.

Generated and imported images are stored locally rather than hotlinked, so a
post does not break when someone else's URL moves.

An image referenced by any article cannot be deleted until the reference is
removed.

## Scheduling

**From the admin:** open an article and press **Schedule…**. A dialog asks for
the time before anything is scheduled — pick a preset (tomorrow 9am / 6pm, next
Monday) or a date and time. The confirmation line
restates the moment in Nepal time with a relative check — _"Goes live Monday,
14 September 2026 at 09:00 in Nepal — in 16 hours"_ — and, when your own clock
differs, what that is where you are. Past times are refused before you can
confirm.

A scheduled article can be changed with **Change time** or returned to a draft
with **Cancel schedule**. The blog list shows when each scheduled post goes
out, so you do not have to open them to find out.

**From an agent:** `schedule_blog` with `blog:schedule`. `scheduledAt` must
carry an explicit offset — `2026-09-20T20:00:00+05:45` for 8pm in Nepal.

`BlogScheduler` runs inside the API process and sweeps for due articles every
`BLOG_SCHEDULER_INTERVAL_MS` (default 15s). It works with every browser closed.
`publishedAt` is set to the time you asked for, not the time the sweep noticed,
so a post scheduled for 20:00 always reads as published at 20:00.

Publishing exactly once is defended three ways:

1. The claim query uses `FOR UPDATE SKIP LOCKED`, so two API replicas sweeping
   the same tick take disjoint rows.
2. The status flip happens in the same transaction, so a committed row is no
   longer due.
3. A re-entrancy flag stops a slow sweep overlapping itself.

Set `BLOG_SCHEDULER_ENABLED=false` on any replica that should not publish.

## Errors

Failures carry a stable code:

```json
{
  "error": {
    "code": "MISSING_SCOPE",
    "message": "This API key is missing the \"blog:publish\" scope."
  }
}
```

`INVALID_API_KEY` · `API_KEY_EXPIRED` · `MISSING_SCOPE` · `BLOG_NOT_FOUND` ·
`BLOG_SLUG_ALREADY_EXISTS` · `INVALID_SCHEDULE_TIME` · `BLOG_INCOMPLETE` ·
`VERSION_CONFLICT` · `IDEMPOTENCY_CONFLICT` · `UNSUPPORTED_FILE_TYPE` ·
`IMAGE_TOO_LARGE` · `UNSAFE_IMAGE_URL` · `MEDIA_UPLOAD_FAILED` ·
`MEDIA_IN_USE` · `IMAGE_GENERATION_UNAVAILABLE` · `RATE_LIMIT_EXCEEDED`

## Retries

`create_blog` accepts an `idempotencyKey`. Sending the same key twice returns
the article created the first time instead of a duplicate; sending it with a
different body is a `409 IDEMPOTENCY_CONFLICT` rather than a silent overwrite.

## Audit

Every create, update, publish, schedule, upload and key change is recorded with
the actor (`ADMIN`, `AI_API_KEY` or `SYSTEM`) and, for a key, its name. Visible
at **Admin → Activity**. Keys, hashes and authorization headers are never
written to it.

## Environment

See `apps/api/.env.example`. The relevant additions:

| Variable                                    | Default       | Purpose                                 |
| ------------------------------------------- | ------------- | --------------------------------------- |
| `MEDIA_STORAGE_PROVIDER`                    | `supabase`    | `supabase` or `s3`                      |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET`   | —             | S3-compatible storage (R2, S3, B2)      |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | —             | Credentials for the above               |
| `S3_FORCE_PATH_STYLE`                       | `false`       | Needed by some providers                |
| `MEDIA_PUBLIC_URL`                          | —             | Public base URL objects are served from |
| `BLOG_SCHEDULER_ENABLED`                    | `true`        | Set `false` on non-publishing replicas  |
| `BLOG_SCHEDULER_INTERVAL_MS`                | `15000`       | Sweep interval                          |
| `AI_RATE_LIMIT`                             | `60`          | Requests per key per window             |
| `AI_RATE_WINDOW_MS`                         | `60000`       | Window length                           |
| `IMAGE_PROVIDER`                            | `none`        | `openai` to enable generation           |
| `IMAGE_PROVIDER_MODEL`                      | `gpt-image-1` | Model for the above                     |
| `OPENAI_API_KEY`                            | —             | Required when `IMAGE_PROVIDER=openai`   |

## Verifying

```bash
bun run --filter='@portfolio/api' test       # unit: keys, lifecycle, scheduler
bun run --filter='@portfolio/mcp' test       # unit: client, tool contract
bun run --filter='@portfolio/api' dev        # then, in another terminal:
bun run --filter='@portfolio/api' test:ai    # live: scopes, SSRF, idempotency
```

`test:ai` needs the API running and `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
set; it skips rather than fails when they are absent.
