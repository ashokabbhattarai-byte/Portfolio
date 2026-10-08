import { createHash, timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

const apiUrl =
  process.env.API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:4000'
    : 'https://api.ashokbhattarai1.com.np');

const digest = (value: string) => createHash('sha256').update(value).digest();

function isAuthorized(request: Request): boolean {
  // Vercel cron sets 'x-vercel-cron': '1' automatically on scheduled executions
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1') return true;

  const secret = process.env.CRON_SECRET || process.env.REVALIDATE_SECRET;
  if (!secret) return false;

  const headerSecret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-revalidate-secret');
  const authHeader = request.headers.get('authorization');
  const bearer =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');

  const presented = headerSecret || bearer || queryKey;
  if (!presented) return false;

  return timingSafeEqual(digest(presented), digest(secret));
}

async function handlePublishCron(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = process.env.REVALIDATE_SECRET || process.env.CRON_SECRET || '';

  try {
    const response = await fetch(`${apiUrl}/api/blogs/cron/publish`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-secret': secret,
      },
      signal: AbortSignal.timeout(10000),
    });

    const data = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      published?: number;
    };

    if (data.published && data.published > 0) {
      revalidateTag('blogs', { expire: 0 });
    }

    return Response.json(
      {
        ok: true,
        published: data.published ?? 0,
        service: 'web-cron',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        service: 'web-cron',
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request) {
  return handlePublishCron(request);
}

export async function POST(request: Request) {
  return handlePublishCron(request);
}
