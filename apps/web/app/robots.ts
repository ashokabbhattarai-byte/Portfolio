import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: siteUrl
          ? ['/', '/projects/', '/blog/', '/about', '/contact']
          : undefined,
        disallow: siteUrl
          ? ['/admin/', '/api/', '/assets/ashok-bhattarai-resume.pdf']
          : ['/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/admin/', '/api/'],
      },
    ],
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml`, host: siteUrl } : {}),
  };
}
