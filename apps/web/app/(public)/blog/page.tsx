import { ContactFooter } from '@/components/layout/contact-footer';
import { BlogList } from '@/components/blogs/blog-list';
import { Reveal } from '@/components/motion/reveal';
import { TrackView } from '@/components/analytics/track-view';
import { getBlogs, getProfile } from '@/lib/content';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';

export async function generateMetadata() {
  const blogs = await getBlogs();
  const topics = [...new Set(blogs.flatMap((b) => b.tags))].slice(0, 6);
  return pageMetadata(
    'Engineering Notes on Shipping Software — Ashok Bhattarai',
    `Technical blog and engineering notes by Ashok Bhattarai (ashokbhattarai) on full-stack architecture, Next.js, applied AI, and quality assurance${
      blogs.length ? `, featuring ${blogs.length} articles` : ''
    }${topics.length ? ` on ${topics.join(', ')}` : ''}.`,
    '/blog',
    [
      'Ashok Bhattarai',
      'ashokbhattarai',
      'Ashok Bhattarai blog',
      'Ashok Bhattarai writing',
      'Ashok Bhattarai Nepal',
      'Software engineering blog',
      'Full-stack engineering notes',
      'AI product development',
      'Next.js articles',
      'Quality assurance writing',
      ...topics,
    ],
  );
}

export default async function BlogIndex() {
  const [blogs, profile] = await Promise.all([getBlogs(), getProfile()]);
  /* A Blog node with its posts listed is what earns the "from this site"
     article treatment; individual posts carry their own BlogPosting. */
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${siteUrl}/blog#blog`,
    name: `${profile.name}: Engineering Blog`,
    url: `${siteUrl}/blog`,
    description:
      'Blogs on full-stack engineering, applied AI and quality assurance by Ashok Bhattarai.',
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
    author: { '@id': `${siteUrl}/#person` },
    publisher: { '@id': `${siteUrl}/#person` },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Blog',
          item: `${siteUrl}/blog`,
        },
      ],
    },
    blogPost: blogs.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      url: `${siteUrl}/blog/${post.slug}`,
      datePublished: post.publishedAt ?? undefined,
      dateModified: post.updatedAt ?? undefined,
      keywords: post.tags.join(', '),
      author: { '@id': `${siteUrl}/#person` },
    })),
  };

  return (
    <>
      <TrackView path="/blog" />
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ) : null}
      <main id="main" tabIndex={-1} className="inner-page section-shell">
        <style>{`.blog-index-label{font-size:12px !important;letter-spacing:0.16em !important;font-weight:600 !important;color:color-mix(in srgb, var(--accent) 60%, transparent) !important;}
.blog-index-label::before{width:28px !important;height:2px !important;background:linear-gradient(90deg, color-mix(in srgb, var(--accent) 60%, transparent), var(--highlight)) !important;}
.blog-count{font-size:15px;color:#556479;font-variant-numeric:tabular-nums;margin:18px 0 0;}
@media (max-width: 760px){.blog-count{font-size:15px;}}
@media (max-width: 480px){.blog-index-wrap h1{font-size:clamp(32px, 9vw, 48px);}}`}</style>
        <div className="page-heading blog-index-wrap">
          <p
            className="section-label blog-index-label"
            style={{
              fontSize: 12,
              letterSpacing: '0.16em',
              fontWeight: 600,
              color: 'color-mix(in srgb, var(--accent) 60%, transparent)',
            }}
          >
            Blogs / {String(blogs.length).padStart(2, '0')}
          </p>
          <h1>
            Notes from
            <br />
            the build.
          </h1>
          <p className="heading-note">
            What shipping actually looks like: architecture decisions, applied
            AI, and the quality assurance that keeps products dependable.
            <br />
            Longer than a commit message, shorter than a whitepaper.
          </p>
          <p className="blog-count" aria-live="off">
            {blogs.length} {blogs.length === 1 ? 'article' : 'articles'} and
            counting.
          </p>
        </div>

        <Reveal>
          <BlogList blogs={blogs} />
        </Reveal>
      </main>
      <ContactFooter />
    </>
  );
}
