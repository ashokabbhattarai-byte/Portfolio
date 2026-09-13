import type { MetadataRoute } from 'next';
import { getBlogs, getProjects } from '@/lib/content';
import { siteUrl } from '@/lib/seo';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!siteUrl) return [];
  const [projects, blogs] = await Promise.all([getProjects(), getBlogs()]);
  const now = new Date();
  /* Only canonical, indexable URLs belong here. The `?tab=` views are marked
     noindex on the projects page, so listing them would send Google a pair of
     contradictory signals. */
  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${siteUrl}/projects`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: blogs[0]?.updatedAt ? new Date(blogs[0].updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    },
    ...projects.map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: project.featured ? 0.85 : 0.75,
    })),
    ...blogs.map((b) => ({
      url: `${siteUrl}/blog/${b.slug}`,
      lastModified: b.updatedAt ? new Date(b.updatedAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
