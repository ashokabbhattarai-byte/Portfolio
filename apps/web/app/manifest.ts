import type { MetadataRoute } from 'next';
import { getProfile } from '@/lib/content';
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const profile = await getProfile().catch(
    () =>
      ({
        name: 'Ashok Bhattarai',
        description: 'Software developer in Nepal',
      }) as never,
  );
  return {
    name: `${profile.name}, ${profile.role ?? 'Software Developer'}`,
    short_name: profile.name.split(' ')[0] ?? 'Ashok',
    description: profile.description ?? 'Software developer in Nepal',
    id: '/',
    scope: '/',
    start_url: '/',
    display: 'standalone',
    lang: 'en',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    background_color: 'var(--paper)',
    theme_color: '#292a2e',
    icons: [
      /* Served from app/icon.svg, whose route is /icon (no extension). */
      { src: '/icon', sizes: 'any', type: 'image/svg+xml' },
      { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
