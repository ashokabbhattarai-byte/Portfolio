import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/projects', '/blog', '/contact'],
        disallow: [
          '/admin-252755/',
          '/admin/',
          '/api/',
          '/_next/',
          '/assets/ashok-bhattarai-resume.pdf',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/about', '/projects', '/blog', '/contact'],
        disallow: ['/admin-252755/', '/admin/', '/api/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/admin-252755/', '/admin/', '/api/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
