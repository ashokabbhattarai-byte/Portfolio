import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { contentTags, type ContentTag } from '@portfolio/types';
/* Compare fixed-width digests rather than the secrets themselves:
   timingSafeEqual throws on a length mismatch, and a length check would leak
   the secret's length. */
const digest = (value: string) => createHash('sha256').update(value).digest();
function authorised(presented: string | null) {
  const secret = process.env.REVALIDATE_SECRET;
  /* Fail closed: an unconfigured deployment accepts nothing. */
  if (!secret || presented === null) return false;
  return timingSafeEqual(digest(presented), digest(secret));
}
export async function POST(request: Request) {
  if (!authorised(request.headers.get('x-revalidate-secret')))
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Expected JSON' }, { status: 400 });
  }
  const requested = (body as { tags?: unknown } | null)?.tags;
  if (!Array.isArray(requested))
    return Response.json(
      { error: 'Expected { tags: string[] }' },
      { status: 400 },
    );
  const tags = [...new Set(requested)].filter((tag): tag is ContentTag =>
    contentTags.includes(tag as ContentTag),
  );
  if (tags.length === 0)
    return Response.json(
      { error: 'No known tags', known: contentTags },
      { status: 400 },
    );
  /* The write has already happened upstream and updateTag is unavailable
     outside a Server Action, so expire immediately rather than serving stale. */
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
