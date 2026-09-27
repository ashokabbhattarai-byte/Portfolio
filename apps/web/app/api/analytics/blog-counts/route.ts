import type { PublicViewCount } from '@portfolio/types';

// Only anonymous totals cross this shared cache. Never forward cookies or IDs.
const apiUrl = process.env.API_URL ?? 'https://api.ashokbhattarai1.com.np';
let failedUntil = 0;
let pending: Promise<PublicViewCount[]> | undefined;
async function loadCounts(): Promise<PublicViewCount[]> {
  const response = await fetch(`${apiUrl}/api/analytics/blog-counts`, {
    next: { revalidate: 30, tags: ['blogs'] },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Counts unavailable');
  return response.json();
}

export async function GET() {
  try {
    if (Date.now() < failedUntil) throw new Error('Counts unavailable');
    // Coalesce cold requests within an instance; Next's Data Cache persists
    // successful fetches between requests. No per-visitor state is stored here.
    pending ??= loadCounts()
      .catch((error) => {
        failedUntil = Date.now() + 5000;
        throw error;
      })
      .finally(() => {
        pending = undefined;
      });
    return Response.json(await pending, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      { error: 'Counts unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' },
      },
    );
  }
}
