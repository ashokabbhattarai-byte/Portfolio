import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/about',
          '/projects',
          '/blog',
          '/contact',
          '/favicon.ico',
          '/favicon-*.png',
          '/apple-touch-icon.png',
          '/assets/',
        ],
        disallow: [
          '/admin-252755/',
          '/admin/',
          '/api/',
          '/assets/ashok-bhattarai-resume.pdf',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/about',
          '/projects',
          '/blog',
          '/contact',
          '/favicon.ico',
          '/favicon-*.png',
          '/apple-touch-icon.png',
          '/assets/',
        ],
        disallow: ['/admin-252755/', '/admin/', '/api/'],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/favicon.ico',
          '/favicon-*.png',
          '/apple-touch-icon.png',
          '/assets/',
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/admin-252755/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
