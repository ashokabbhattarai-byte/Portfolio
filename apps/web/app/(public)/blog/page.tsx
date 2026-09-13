import { ContactFooter } from '@/components/layout/contact-footer';
import { BlogList } from '@/components/blogs/blog-list';
import { TrackView } from '@/components/analytics/track-view';
import { getBlogs, getProfile } from '@/lib/content';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';

export async function generateMetadata() {
  const blogs = await getBlogs();
  const topics = [...new Set(blogs.flatMap((b) => b.tags))].slice(0, 6);
  return pageMetadata(
    'Engineering blog',
    `Writing on full-stack engineering, applied AI and quality assurance by Ashok Bhattarai${
      blogs.length ? ` — ${blogs.length} posts` : ''
    }${topics.length ? ` on ${topics.join(', ')}` : ''}.`,
    '/blog',
    [
      'Ashok Bhattarai blog',
      'Software engineering blog',
      'Full-stack engineering notes',
      'AI product development',
      'Quality assurance writing',
      'Next.js articles',
      ...topics,
    ],
  );
}

export default async function BlogIndex() {
  const [blogs, profile] = await Promise.all([getBlogs(), getProfile()]);
  /* A Blog node with its posts listed is what earns the "from this site"
     article treatment; individual posts carry their own BlogPosting. */
  const schema = siteUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        '@id': `${siteUrl}/blog#blog`,
        name: `${profile.name} — Engineering blog`,
        url: `${siteUrl}/blog`,
        description:
          'Writing on full-stack engineering, applied AI and quality assurance.',
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
        author: { '@id': `${siteUrl}/#person` },
        publisher: { '@id': `${siteUrl}/#person` },
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
      }
    : null;

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
        <div className="page-heading">
          <p className="section-label">
            Writing / {String(blogs.length).padStart(2, '0')}
          </p>
          <h1>
            Notes from
            <br />
            the build.
          </h1>
          <p className="heading-note">
            What shipping actually looks like — architecture decisions, applied
            AI, and the quality assurance that keeps products dependable.
            <br />
            Longer than a commit message, shorter than a whitepaper.
          </p>
        </div>

        <BlogList blogs={blogs} />
      </main>
      <ContactFooter />
    </>
  );
}
