import { SetMetadata } from '@nestjs/common';

/** The complete scope vocabulary. A key carries a subset; the guard compares
 *  against the scope a route declares. Adding a scope here without granting it
 *  to existing keys is safe — absence always denies. */
export const SCOPES = [
  'blog:read',
  'blog:create',
  'blog:update',
  'blog:publish',
  'blog:schedule',
  'blog:unpublish',
  'media:read',
  'media:upload',
  'media:generate',
  'media:delete',
] as const;

export type Scope = (typeof SCOPES)[number];

export const SCOPE_KEY = 'publishing:scope';

/** Declares the scope a route requires. PublisherGuard reads it; routes with
 *  no decorator are unreachable by API key, which keeps the AI surface
 *  explicitly enumerated rather than implicitly open. */
export const RequireScope = (scope: Scope) => SetMetadata(SCOPE_KEY, scope);

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  'blog:read': 'Read articles, including drafts and scheduled posts.',
  'blog:create':
    'Create new articles. Created articles always start as drafts.',
  'blog:update':
    'Edit the content, SEO fields and images of existing articles.',
  'blog:publish': 'Publish an article immediately, making it publicly visible.',
  'blog:schedule': 'Schedule an article to publish at a future time.',
  'blog:unpublish': 'Withdraw a published article from the public site.',
  'media:read': 'List and inspect images in the media library.',
  'media:upload': 'Upload images, or import them from a public URL.',
  'media:generate': 'Generate images through the configured AI image provider.',
  'media:delete': 'Delete unused images from the media library.',
};

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}

/** The status transitions each scope authorises. Used by the AI surface so a
 *  `status` field in a request body cannot escalate past the key's grant. */
export const STATUS_SCOPE: Record<string, Scope | undefined> = {
  PUBLISHED: 'blog:publish',
  SCHEDULED: 'blog:schedule',
  UNPUBLISHED: 'blog:unpublish',
  ARCHIVED: 'blog:unpublish',
  DRAFT: undefined,
  REVIEW: undefined,
};
