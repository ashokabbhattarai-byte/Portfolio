import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: siteUrl ? ['/'] : undefined,
        /* /admin/ has its own noindex too, so a misconfigured edge cache cannot
           leak the CMS into the index. The resume PDF stays out on purpose:
           the same history is rendered as HTML on /about, which is canonical. */
        disallow: siteUrl
          ? ['/admin/', '/api/', '/assets/ashok-bhattarai-resume.pdf']
          : ['/'],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/admin/', '/api/'],
      },
    ],
    /* No `host` directive: crawlers discontinued it, so it would only add an
       unrecognised line to robots.txt. */
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
