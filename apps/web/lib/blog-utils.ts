/**
 * Professional blog utilities — reading time, TOC, SEO, formatting.
 * Separated from page components so the CMS, RSS, sitemap, and OG all share the same logic.
 */
import type { Blog, Profile } from '@portfolio/types';
import { siteUrl } from './seo';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
    .replace(/[#*_~>]/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function estimateReadingTime(
  content: string,
  wpm = 225,
): { minutes: number; text: string; words: number } {
  const text = stripMarkdown(content);
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / wpm));
  return { minutes, words, text: `${minutes} min read` };
}

export function formatBlogDate(
  value?: string | null,
  locale = 'en-US',
): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatBlogDateISO(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return undefined;
    return d.toISOString();
  } catch {
    return undefined;
  }
}

export type TocItem = { id: string; text: string; level: number };

export function extractHeadings(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const seen = new Map<string, number>();
  const out: TocItem[] = [];
  let inCode = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = line.match(/^(#{2,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const raw = m[2].trim().replace(/\[([^\]]+)\]\(.*?\)/g, '$1');
    let id = slugify(raw);
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    out.push({ id, text: raw, level });
  }
  return out;
}

export function getBlogDescription(blog: Blog, maxLen = 160): string {
  const base =
    blog.excerpt?.trim() || stripMarkdown(blog.content).slice(0, maxLen);
  return base.length > maxLen ? `${base.slice(0, maxLen - 1).trim()}…` : base;
}

export function getBlogCover(blog: Blog): {
  url: string | null;
  alt: string | null;
  caption: string | null;
} {
  const fromImages = blog.images?.find(
    (i) => i.placement === 'COVER' || i.placement === 'HERO',
  );
  if (fromImages)
    return {
      url: fromImages.url,
      alt: fromImages.alt ?? blog.title,
      caption: fromImages.caption ?? null,
    };
  if (blog.coverImage)
    return { url: blog.coverImage, alt: blog.title, caption: null };
  return { url: null, alt: null, caption: null };
}

export function getBlogKeywords(
  blog: Blog,
  profile?: Profile | null,
): string[] {
  const base = [...(blog.tags ?? [])];
  if (profile) {
    base.push(profile.name, profile.role);
    if (profile.languages)
      base.push(...profile.languages.split(',').map((s) => s.trim()));
  }
  return Array.from(new Set(base.map((s) => s.trim()).filter(Boolean))).slice(
    0,
    12,
  );
}

// ---------- SEO: JSON-LD ----------

export function generateBlogJsonLd(
  blog: Blog,
  profile: Profile | null,
  url: string,
) {
  const cover = getBlogCover(blog);
  const reading = estimateReadingTime(blog.content);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: getBlogDescription(blog),
    image: cover.url ? [cover.url] : undefined,
    datePublished: formatBlogDateISO(
      blog.publishedAt ?? blog.createdAt ?? blog.updatedAt,
    ),
    dateModified: formatBlogDateISO(blog.updatedAt ?? blog.publishedAt),
    author: profile
      ? {
          '@type': 'Person',
          name: profile.name,
          url: siteUrl ?? undefined,
          sameAs: [profile.github, profile.linkedin].filter(Boolean),
        }
      : undefined,
    publisher: profile
      ? {
          '@type': 'Person',
          name: profile.name,
          logo: siteUrl
            ? { '@type': 'ImageObject', url: `${siteUrl}/icon.svg` }
            : undefined,
        }
      : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    keywords: getBlogKeywords(blog, profile).join(', '),
    wordCount: reading.words,
    timeRequired: `PT${reading.minutes}M`,
    articleSection: blog.tags[0] ?? 'Blog',
    inLanguage: 'en-US',
    isAccessibleForFree: true,
  };
}

export function generateBlogBreadcrumbs(
  blog: Blog,
  baseUrl: string | undefined,
) {
  if (!baseUrl) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${baseUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: blog.title,
        item: `${baseUrl}/blog/${blog.slug}`,
      },
    ],
  };
}

export function getRelatedBlogs(current: Blog, all: Blog[], limit = 2): Blog[] {
  const others = all.filter((b) => b.id !== current.id);
  // Score by shared tags, then featured
  const scored = others
    .map((b) => ({
      blog: b,
      score:
        b.tags.filter((t) => current.tags.includes(t)).length * 2 +
        (b.featured ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.blog.position - b.blog.position);
  return scored.slice(0, limit).map((s) => s.blog);
}
