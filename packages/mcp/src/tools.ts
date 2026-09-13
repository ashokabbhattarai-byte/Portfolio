import { z } from 'zod';
import type { PortfolioClient } from './client.js';

/**
 * Tool definitions. Each one declares the scope its key must carry, because
 * the failure mode we most want to avoid is an agent discovering it cannot
 * publish only after writing a whole article.
 */

/** Arguments arrive already validated against `schema` by the MCP SDK, so a
 *  runner only has to name the fields it reads. */
export type ToolArgs = Record<string, unknown>;

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  schema: z.ZodRawShape;
  run: (client: PortfolioClient, args: ToolArgs) => Promise<unknown>;
}

/** Splits the article id out of a tool's arguments; everything else is body. */
function withId(args: ToolArgs): { id: string; body: ToolArgs } {
  const { id, ...body } = args as { id: string } & ToolArgs;
  return { id: encodeURIComponent(id), body };
}

const scopeNote = (scope: string) =>
  `Requires the "${scope}" scope on your API key. If the key lacks it the call fails with MISSING_SCOPE — ask the portfolio owner to grant it rather than retrying.`;

const blogFields = {
  title: z.string().min(2).max(200).describe('Article headline.'),
  excerpt: z
    .string()
    .max(400)
    .describe(
      'One- or two-sentence summary used in listings and as the meta description fallback.',
    ),
  content: z
    .string()
    .max(200_000)
    .describe(
      'Article body in Markdown. Headings, lists, code fences and images are supported.',
    ),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120)
    .optional()
    .describe('URL slug. Derived from the title when omitted. Must be unique.'),
  tags: z.array(z.string().max(60)).max(20).optional().describe('Topic tags.'),
  seoTitle: z
    .string()
    .max(200)
    .optional()
    .describe('Overrides the <title> tag.'),
  seoDescription: z.string().max(400).optional().describe('Meta description.'),
  canonicalUrl: z.string().url().max(500).optional(),
  ogTitle: z.string().max(200).optional(),
  ogDescription: z.string().max(400).optional(),
  noIndex: z
    .boolean()
    .optional()
    .describe('Ask search engines not to index this article.'),
  featuredImageId: z
    .string()
    .max(100)
    .optional()
    .describe('Media library id from upload_media or import_image.'),
  ogImageId: z
    .string()
    .max(100)
    .optional()
    .describe('Media library id for the social card.'),
};

export const tools: ToolDefinition[] = [
  {
    name: 'list_blogs',
    title: 'List articles',
    description: `List articles with their status, slug and timestamps, newest first. Includes drafts and scheduled posts. ${scopeNote('blog:read')}`,
    schema: {
      search: z
        .string()
        .max(150)
        .optional()
        .describe('Match against title, excerpt or slug.'),
      status: z
        .enum([
          'DRAFT',
          'REVIEW',
          'PUBLISHED',
          'SCHEDULED',
          'UNPUBLISHED',
          'ARCHIVED',
        ])
        .optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    run: (client, args) => client.get('/blogs', args),
  },
  {
    name: 'get_blog',
    title: 'Get an article',
    description: `Fetch one article in full, including its Markdown body, SEO fields and attached images. ${scopeNote('blog:read')}`,
    schema: { id: z.string().max(100).describe('Article id.') },
    run: (client, args) => client.get(`/blogs/${withId(args).id}`),
  },
  {
    name: 'create_blog',
    title: 'Create a draft article',
    description:
      'Create a new article. It is ALWAYS saved as a draft and is not publicly visible, whatever else you send — publishing is a separate, separately-permissioned step. ' +
      'Pass a stable idempotencyKey so that retrying after a network error returns the original article instead of creating a duplicate. ' +
      scopeNote('blog:create'),
    schema: {
      ...blogFields,
      idempotencyKey: z
        .string()
        .max(100)
        .optional()
        .describe('Reuse the same value when retrying the same create.'),
    },
    run: (client, args) => client.post('/blogs', args),
  },
  {
    name: 'update_blog',
    title: 'Update an article',
    description: `Edit an existing article's content, SEO fields or images. Only the fields you send change. ${scopeNote('blog:update')}`,
    schema: {
      id: z.string().max(100),
      ...Object.fromEntries(
        Object.entries(blogFields).map(([key, schema]) => [
          key,
          (schema as z.ZodTypeAny).optional(),
        ]),
      ),
      expectedVersion: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe(
          'Fails with VERSION_CONFLICT if the article changed since you read it.',
        ),
    },
    run: (client, args) => {
      const { id, body } = withId(args);
      return client.patch(`/blogs/${id}`, body);
    },
  },
  {
    name: 'publish_blog',
    title: 'Publish an article now',
    description:
      "Make an article publicly visible immediately. This is irreversible from the reader's point of view — the URL goes live and may be indexed. " +
      'Confirm with the user before calling it unless they explicitly asked to publish. ' +
      scopeNote('blog:publish'),
    schema: {
      id: z.string().max(100),
      expectedVersion: z.number().int().min(1).optional(),
    },
    run: (client, args) => {
      const { id, body } = withId(args);
      return client.post(`/blogs/${id}/publish`, body);
    },
  },
  {
    name: 'schedule_blog',
    title: 'Schedule an article',
    description:
      'Schedule an article to publish automatically at a future time. The server publishes it even if nobody is signed in. ' +
      'scheduledAt MUST be ISO 8601 with an explicit offset — for 8pm Nepal time use "2026-09-20T20:00:00+05:45". A time in the past is rejected. ' +
      scopeNote('blog:schedule'),
    schema: {
      id: z.string().max(100),
      scheduledAt: z
        .string()
        .describe(
          'ISO 8601 with offset, e.g. 2026-09-20T20:00:00+05:45 for Nepal time.',
        ),
      timezone: z
        .string()
        .max(80)
        .optional()
        .describe('IANA zone recorded for display, e.g. Asia/Kathmandu.'),
      expectedVersion: z.number().int().min(1).optional(),
    },
    run: (client, args) => {
      const { id, body } = withId(args);
      return client.post(`/blogs/${id}/schedule`, body);
    },
  },
  {
    name: 'unpublish_blog',
    title: 'Unpublish an article',
    description: `Withdraw a published article from the public site. It becomes a draft again and keeps its content. ${scopeNote('blog:unpublish')}`,
    schema: {
      id: z.string().max(100),
      expectedVersion: z.number().int().min(1).optional(),
    },
    run: (client, args) => {
      const { id, body } = withId(args);
      return client.post(`/blogs/${id}/unpublish`, body);
    },
  },
  {
    name: 'attach_featured_image',
    title: 'Attach an image to an article',
    description:
      "Set an article's featured image or social (Open Graph) card from an image already in the media library. " +
      'Upload or import the image first to get its id. Always supply alt text describing what the image shows. ' +
      scopeNote('blog:update'),
    schema: {
      id: z.string().max(100).describe('Article id.'),
      mediaId: z.string().max(100).describe('Media asset id.'),
      slot: z
        .enum(['FEATURED_IMAGE', 'OG_IMAGE'])
        .optional()
        .describe('Defaults to FEATURED_IMAGE.'),
      alt: z.string().max(200).optional().describe('Sets the image alt text.'),
    },
    run: (client, args) => {
      const { id, body } = withId(args);
      return client.post(`/blogs/${id}/images`, body);
    },
  },
  {
    name: 'list_media',
    title: 'List media',
    description: `List images in the media library with their ids, dimensions and alt text. ${scopeNote('media:read')}`,
    schema: {
      search: z.string().max(150).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    run: (client, args) => client.get('/media', args),
  },
  {
    name: 'import_image',
    title: 'Import an image from a URL',
    description:
      'Download a publicly reachable image and store a copy in the media library, returning its id. ' +
      'This is the normal way to add an image you found elsewhere — the copy keeps working if the original moves. ' +
      'Private, loopback and cloud-metadata addresses are refused. PNG, JPEG, WebP and AVIF only, up to 8 MB. ' +
      scopeNote('media:upload'),
    schema: {
      url: z
        .string()
        .url()
        .max(2000)
        .describe('Public https URL of the image.'),
      alt: z
        .string()
        .max(200)
        .optional()
        .describe('Describe what the image shows.'),
      caption: z.string().max(500).optional(),
      filename: z.string().max(200).optional(),
    },
    run: (client, args) => client.post('/media/import', args),
  },
  {
    name: 'generate_image',
    title: 'Generate an image',
    description:
      'Generate an image with the configured AI image provider and store it in the media library. ' +
      'If no provider is configured this returns IMAGE_GENERATION_UNAVAILABLE — in that case use import_image with a URL, or ask the user to upload one. ' +
      scopeNote('media:generate'),
    schema: {
      prompt: z.string().max(4000).describe('What the image should show.'),
      purpose: z.enum([
        'FEATURED_IMAGE',
        'INLINE_IMAGE',
        'OG_IMAGE',
        'DIAGRAM',
        'SOCIAL_CARD',
      ]),
      alt: z.string().max(200).optional(),
      caption: z.string().max(500).optional(),
      width: z.union([z.literal(1024), z.literal(1536)]).optional(),
      height: z.union([z.literal(1024), z.literal(1536)]).optional(),
    },
    run: (client, args) => client.post('/media/generate', args),
  },
];
