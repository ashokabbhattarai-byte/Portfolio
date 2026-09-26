import type { NextConfig } from 'next';
const apiUrl = process.env.API_URL ?? 'https://api.ashokbhattarai1.com.np';
const supabaseHost = (() => {
  try {
    const u =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    return new URL(u).hostname || undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  /* Both dev overlays default to the bottom-left corner, so Next's route badge
     landed on top of the React Query devtools button — the stack read as one
     widget permanently saying "Rendering…", which looks like a hung page. They
     get a corner each. Dev only; neither ships to production. */
  devIndicators: { position: 'bottom-right' },
  images: {
    // Supabase Storage is the CMS media CDN – edge-cached, WebP, 60d immutable
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: 'https' as const, hostname: supabaseHost }]
        : []),
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  /* The browser only ever talks to its own origin. Everything under /api that
      Next does not handle itself is proxied to Nest, so the admin's auth
      cookies stay first-party and no CORS preflight is involved. `afterFiles`
      means Next's own route handlers (/api/revalidate) still win. */
  async redirects() {
    return [
      { source: '/work', destination: '/projects', permanent: true },
      {
        source: '/work/:path*',
        destination: '/projects/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      ],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: '/assets/ashok-bhattarai-resume.pdf',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, noarchive' },
          { key: 'Content-Type', value: 'application/pdf' },
        ],
      },
      /* The CMS is never a search result and never framed. */
      {
        source: '/admin-252755/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default nextConfig;
