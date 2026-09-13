Implement a complete, production-ready **AI Blog Publishing System** inside my existing portfolio Admin dashboard.

First inspect the existing project architecture, authentication, ORM/database, API conventions, UI system, linting, formatter, package manager, environment handling, and reusable components. Follow the existing patterns and do not break current functionality.

The goal is to let me manage blogs manually from Admin and also securely allow external AI agents such as Claude, ChatGPT, Codex, or MCP clients to create, edit, upload images, generate images, publish, and schedule posts without exposing my main Admin credentials.

## Core Admin Features

Add a professional Blog Management section with:

- blog list with search, pagination, filters and status
- create/edit blog
- rich text or Markdown editor based on the existing stack
- auto-save drafts
- slug generation and uniqueness validation
- excerpt
- tags/categories
- featured image
- inline images
- Open Graph image
- preview
- duplicate
- archive/delete
- publish/unpublish
- schedule/reschedule

Statuses should support:

- Draft
- Scheduled
- Published
- Unpublished
- Archived

Create appropriate routes such as:

`/admin/blogs`
`/admin/blogs/new`
`/admin/blogs/[id]/edit`

## Media Library

Add:

`/admin/media`

Support:

- upload
- drag/drop
- image preview
- image search
- image selection
- alt text
- caption
- file metadata
- delete protection when an image is in use

Use object storage through an abstraction such as `StorageService`.

Prefer S3-compatible storage so Cloudflare R2, S3, or another provider can be used.

Validate files securely and optimize images where appropriate.

## SEO

Each article should support:

- SEO title
- meta description
- canonical URL
- Open Graph title/description/image
- noindex/nofollow
- social preview
- search preview

Add proper `BlogPosting` or `Article` JSON-LD to public posts.

Create or integrate public routes:

`/blog`
`/blog/[slug]`

Include published posts in sitemap and exclude drafts, previews and scheduled unpublished posts.

## Scheduling

Implement server-side scheduling.

Fields should include:

- status
- scheduledAt
- publishedAt
- updatedAt

Store timestamps in UTC and properly display `Asia/Kathmandu`.

Scheduling must work even when the Admin browser is closed.

Use an appropriate NestJS scheduler, worker, cron, or queue based on the existing deployment.

Scheduled publishing must be idempotent.

## AI Publishing API

Create a separate AI-facing API, conceptually:

`/api/v1/ai`

Support operations such as:

- list blogs
- get blog
- create blog
- update blog
- publish blog
- schedule blog
- unpublish blog
- list media
- upload media
- generate image
- assign featured image

Reuse the same underlying Blog/Media services used by Admin. Do not duplicate business logic.

Default AI-created posts to **Draft**.

## AI API Keys

Add:

`/admin/ai/api-keys`

Allow Admin to:

- create key
- name key
- select scopes
- optionally set expiry
- copy key once
- see prefix
- see last-used timestamp
- revoke key
- rotate key

Generate keys similar to:

`pf_live_xxxxxxxxx`

Never store plaintext API keys.

Generate securely, show the full key once, then store only a secure hash plus a safe prefix.

Suggested scopes:

```text
blog:read
blog:create
blog:update
blog:publish
blog:schedule
blog:unpublish

media:read
media:upload
media:generate
media:delete
```

Enforce scopes on the server.

A client without `blog:publish` must never publish even if it sends:

```json
{
  "status": "published"
}
```

Apply rate limiting to AI endpoints.

## Audit Logs

Add:

`/admin/ai/activity`

Log important actions such as:

- blog created
- blog updated
- blog published
- blog scheduled
- blog unpublished
- media uploaded
- media generated
- API key created/revoked

Track actor type:

- ADMIN
- AI_API_KEY
- SYSTEM

Never log plaintext secrets or authorization headers.

## AI Images

Support both:

1. uploading an existing image
2. generating an image through an AI image provider

Create an abstraction such as:

`ImageGenerationService`

Support purposes such as:

- FEATURED_IMAGE
- INLINE_IMAGE
- OG_IMAGE
- DIAGRAM
- SOCIAL_CARD

Generated images must be uploaded into normal media storage rather than hotlinking temporary provider URLs.

Allow AI tools to attach images to posts and provide alt text.

## MCP / Tool Calling

Expose the same publishing functionality through MCP or another tool-calling layer so Claude, ChatGPT, Codex, or other compatible agents can use commands conceptually like:

```text
list_blogs
get_blog
create_blog
update_blog
publish_blog
schedule_blog
unpublish_blog
list_media
upload_media
generate_image
attach_featured_image
```

The MCP layer must call existing application services instead of implementing duplicate business logic.

Tool descriptions should clearly explain permissions and expected inputs.

## Example Desired Workflow

I should eventually be able to tell an AI:

"Write a professional article explaining how I built SuchanaAI. Include a featured image, architecture diagram, SEO title, description, slug and five tags. Save it as a draft."

The AI should:

1. generate the content
2. generate/upload required images
3. register images in the media library
4. create the blog
5. attach images
6. add SEO metadata
7. save the post to my portfolio

With `blog:schedule` permission I should also be able to say:

"Schedule it for September 20, 2026 at 8 PM Nepal time."

With `blog:publish` permission:

"Publish it now."

## Security

Implement proper protection against:

- API key leakage
- missing scopes
- XSS/stored XSS
- malicious Markdown/HTML
- malicious file uploads
- oversized uploads
- IDOR
- mass assignment
- duplicate AI retries
- unauthorized publishing
- scheduler duplicate execution

Sanitize public blog content.

Never expose:

- Admin credentials
- API key hashes
- database credentials
- object-storage secrets
- AI provider secrets

Support an optional `idempotencyKey` for AI create operations so retries do not create duplicate posts.

## Data Model

Adapt to the current ORM, but support concepts similar to:

### BlogPost

```text
id
title
slug
excerpt
content
status

featuredImageId
ogImageId

seoTitle
seoDescription
canonicalUrl
noIndex
noFollow

scheduledAt
publishedAt

createdByAI
aiProvider
aiModel

createdAt
updatedAt
deletedAt
```

### MediaAsset

```text
id
filename
mimeType
width
height
size
storageKey
url
altText
caption
source
createdAt
```

### ApiKey

```text
id
name
keyPrefix
keyHash
scopes
expiresAt
lastUsedAt
revokedAt
createdAt
```

Use proper relations for tags, media and authors where appropriate.

Add useful indexes for:

- slug
- status
- scheduledAt
- publishedAt

## API Errors

Return structured errors, for example:

```json
{
  "error": {
    "code": "MISSING_SCOPE",
    "message": "This API key cannot publish blogs."
  }
}
```

Possible codes include:

```text
INVALID_API_KEY
API_KEY_EXPIRED
MISSING_SCOPE
BLOG_NOT_FOUND
BLOG_SLUG_ALREADY_EXISTS
INVALID_SCHEDULE_TIME
UNSUPPORTED_FILE_TYPE
MEDIA_UPLOAD_FAILED
RATE_LIMIT_EXCEEDED
```

Follow existing backend conventions if equivalents already exist.

## Admin UX

Use the existing design system.

Provide:

- loading states
- skeletons
- save indicators
- confirmation dialogs
- toasts
- empty states
- responsive layouts
- accessible forms
- clear status badges

Avoid generic AI-dashboard styling, excessive gradients, oversized icons or unnecessary visual effects.

## Code Quality

Use professional TypeScript.

Requirements:

- no unnecessary `any`
- proper DTO validation
- modular services
- reusable components
- no giant page components
- no duplicated business logic
- no fake/mock functionality in the finished feature
- no widespread `@ts-ignore`

Use the package manager already used by the repository.

Do not rewrite unrelated parts of the application.

## Tests

Add meaningful tests for:

- API key generation
- key validation
- revoked key
- expired key
- scope enforcement
- blog creation
- update
- slug collision
- publish authorization
- scheduling
- scheduled publication
- duplicate scheduler execution
- idempotent AI requests
- image validation
- unauthorized access
- audit logging

Also verify these end-to-end workflows:

Admin:
create → image → SEO → preview → publish

AI:
create draft → upload/generate image → attach → save

Unauthorized AI:
attempt publish without scope → reject

Scheduler:
schedule → automatically publish exactly once

Revoked key:
all future calls → reject

## Implementation Phases

Work in this order:

1. inspect existing repository
2. data model/migrations
3. Blog backend
4. Media/storage
5. Admin Blog UI
6. SEO/public Blog pages
7. scheduling
8. AI API keys/scopes
9. AI publishing API
10. audit/activity UI
11. MCP/tool integration
12. AI image provider abstraction
13. tests/security review
14. lint/type-check/build
15. documentation

Before major changes, inspect existing reusable files and follow existing patterns.

Do not perform destructive database resets.

## Final Verification

Before declaring completion, ensure:

- manual Admin blogging works
- media uploads work
- featured/inline images work
- SEO works
- preview works
- publish/unpublish works
- scheduling works
- AI API key creation works
- keys are shown only once
- scope enforcement works
- revoked/expired keys fail
- AI draft creation works
- AI image upload/generation works
- AI scheduling works with permission
- unauthorized AI publishing fails
- audit logs work
- public blog pages work
- sitemap is correct
- secrets are never exposed
- lint passes
- type-check passes
- tests pass
- production build passes

At completion provide:

1. architecture summary
2. database changes
3. backend modules added
4. frontend routes/components added
5. environment variables added
6. AI/MCP tools exposed
7. security protections
8. tests added
9. commands used to verify the implementation
10. deployment changes required

Build this as a complete production feature, not a proof of concept.
