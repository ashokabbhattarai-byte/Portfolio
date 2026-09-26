import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getBlog, getBlogs, getProfile } from '@/lib/content';
import { TransitionLink } from '@/components/motion/transition-link';
import { BlogEngagement } from '@/components/analytics/blog-engagement';
import { TrackView } from '@/components/analytics/track-view';
import { extractHeadings } from '@/lib/blog-utils';
import { siteUrl } from '@/lib/seo';
import {
  estimateReadingTime,
  formatBlogDate,
  formatBlogDateISO,
  generateBlogBreadcrumbs,
  generateBlogJsonLd,
  getBlogCover,
  getBlogDescription,
  getBlogKeywords,
} from '@/lib/blog-utils';
import { TableOfContents } from '@/components/blogs/table-of-contents';
import { BlogContent } from '@/components/blogs/blog-content';
import { ReadingProgress } from '@/components/blogs/reading-progress';
import { Reveal } from '@/components/motion/reveal';
import type { Metadata } from 'next';

export async function generateStaticParams() {
  const blogs = await getBlogs();
  return blogs.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [b, profile] = await Promise.all([
    getBlog(slug),
    getProfile().catch(() => null),
  ]);
  if (!b) return {};
  const cover = getBlogCover(b);
  const url = `${siteUrl ?? 'http://localhost:3000'}/blog/${b.slug}`;
  const keywords = getBlogKeywords(b, profile);
  return {
    title: b.seoTitle || b.title,
    description: getBlogDescription(b),
    keywords,
    authors: profile
      ? [{ name: profile.name, url: profile.github }]
      : undefined,
    /* An explicit canonicalUrl means the article was first published
       elsewhere, so it points there rather than at us. */
    alternates: b.canonicalUrl
      ? { canonical: b.canonicalUrl }
      : siteUrl
        ? { canonical: `/blog/${b.slug}` }
        : undefined,
    /* The per-article switches the editor exposes. Without this the SEO panel
       would record a preference nothing acts on. */
    robots: {
      index: siteUrl ? !b.noIndex : false,
      follow: !b.noFollow,
      googleBot: {
        index: siteUrl ? !b.noIndex : false,
        follow: !b.noFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: b.ogTitle || b.seoTitle || b.title,
      description: b.ogDescription || b.excerpt,
      type: 'article',
      url,
      siteName: profile?.name ?? 'Portfolio',
      locale: 'en_US',
      images: cover.url
        ? [
            {
              url: cover.url,
              width: 1200,
              height: 630,
              alt: cover.alt ?? b.title,
            },
          ]
        : siteUrl
          ? [
              {
                url: `${siteUrl}/opengraph-image`,
                width: 1200,
                height: 630,
                alt: b.title,
              },
            ]
          : undefined,
      publishedTime: formatBlogDateISO(
        b.publishedAt ?? (b.createdAt as unknown as string),
      ),
      modifiedTime: formatBlogDateISO(b.updatedAt as unknown as string),
      authors: profile ? [profile.name] : undefined,
      tags: b.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: b.title,
      description: b.excerpt,
      images: cover.url
        ? [cover.url]
        : siteUrl
          ? [`${siteUrl}/opengraph-image`]
          : undefined,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, blogs, profile] = await Promise.all([
    getBlog(slug),
    getBlogs(),
    getProfile().catch(() => null),
  ]);
  if (!post) notFound();

  const next =
    blogs[(blogs.findIndex((b) => b.slug === slug) + 1) % blogs.length] ?? post;
  const coverData = getBlogCover(post);
  const { text: readingText } = estimateReadingTime(post.content);
  const datePublished = formatBlogDate(
    post.publishedAt ?? (post as unknown as { createdAt?: string }).createdAt,
  );
  const blogUrl = `${siteUrl ?? 'http://localhost:3000'}/blog/${post.slug}`;
  const jsonLd = generateBlogJsonLd(post, profile, blogUrl);
  const breadcrumbs = generateBlogBreadcrumbs(post, siteUrl);
  const inlineImages = (post.images ?? []).filter(
    (i) => i.placement === 'INLINE',
  );
  const galleryImages = (post.images ?? []).filter(
    (i) => i.placement === 'GALLERY',
  );

  const headings = extractHeadings(post.content);
  const initials = profile?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);
  return (
    <>
      <TrackView path={`/blog/${post.slug}`} blogId={post.id} />
      <ReadingProgress />
      <main id="main" tabIndex={-1} className="article-page">
        <style>{`.article-tags span{min-height:44px;display:inline-flex;align-items:center;transition:border-color 0.3s ease, color 0.3s ease;}
.article-tags span:hover{border-color:color-mix(in srgb, var(--accent) 60%, transparent);color:color-mix(in srgb, var(--accent) 60%, transparent);}
.article-breadcrumb{flex-wrap:wrap;}
.article-breadcrumb a{min-height:44px;display:inline-flex;align-items:center;font-size:15px;}
.article-avatar{background:var(--deep) !important;color:var(--paper) !important;}
.article-cover > div{border-radius:22px !important;border:1.5px solid color-mix(in srgb, var(--highlight) calc(0.2 * 100%), transparent) !important;box-shadow:0 22px 64px rgba(12,33,60,0.22);}
.article-author{background:#fff;border:1px solid var(--line);border-radius:22px;padding:32px;transition:transform 0.42s cubic-bezier(0.16,1,0.3,1), border-color 0.34s ease, box-shadow 0.42s cubic-bezier(0.16,1,0.3,1);}
.article-author:hover{transform:translateY(-4px);border-color:rgba(82,119,71,0.35);box-shadow:0 12px 32px rgba(21,38,60,0.08);}
.article-next{background:#fff;border:1px solid var(--line);border-radius:22px;padding:40px;transition:transform 0.42s cubic-bezier(0.16,1,0.3,1), border-color 0.34s ease, box-shadow 0.42s cubic-bezier(0.16,1,0.3,1);}
.article-next:hover{transform:translateY(-4px);border-color:rgba(82,119,71,0.35);box-shadow:0 12px 32px rgba(21,38,60,0.08);}
.article-next h2{font-size:clamp(40px,4.6vw,64px);font-weight:450;}
@media (max-width: 900px){.article-body-layout{grid-template-columns:180px minmax(0,1fr);gap:32px;}}
@media (max-width: 760px){.article-body-layout{grid-template-columns:1fr;}}
@media (max-width: 480px){.article-breadcrumb{font-size:15px;}.article-heading h1{font-size:clamp(32px,9vw,48px);}.blog-prose{font-size:17px;}}
@media (max-width: 360px){.article-author{flex-direction:column;padding:24px;}.article-next{padding:24px;}}`}</style>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
          }}
        />
        {breadcrumbs ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c'),
            }}
          />
        ) : null}
        <div className="article-shell">
          <nav aria-label="Breadcrumb" className="article-breadcrumb">
            <TransitionLink href="/">Home</TransitionLink>
            <span aria-hidden="true" className="breadcrumb-sep">
              ›
            </span>
            <TransitionLink href="/blog">Blogs</TransitionLink>
            <span aria-hidden="true" className="breadcrumb-sep">
              ›
            </span>
            <span aria-current="page">{post.title}</span>
          </nav>
          <article>
            <Reveal>
              <header
                className={`article-hero-grid ${coverData.url ? 'has-cover' : 'no-cover'}`}
              >
                <div className="article-hero-content">
                  <div className="article-tags">
                    {post.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <h1>{post.title}</h1>
                  <p className="article-deck">{post.excerpt}</p>
                  <div className="article-meta">
                    {profile ? (
                      <div className="article-byline">
                        <span className="article-avatar" aria-hidden="true">
                          {initials}
                        </span>
                        <div>
                          <strong>{profile.name}</strong>
                          <span>{profile.role}</span>
                        </div>
                      </div>
                    ) : null}
                    <div className="article-date">
                      <time
                        dateTime={formatBlogDateISO(
                          post.publishedAt ?? post.createdAt,
                        )}
                      >
                        {datePublished}
                      </time>
                      <span className="meta-dot" aria-hidden="true">
                        •
                      </span>
                      <span>{readingText}</span>
                      <span className="meta-dot" aria-hidden="true">
                        •
                      </span>
                      <BlogEngagement path={`/blog/${post.slug}`} />
                    </div>
                    {post.linkedinUrl ? (
                      <a
                        href={post.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="linkedin-pill-btn"
                      >
                        Discuss on LinkedIn <span aria-hidden="true">↗</span>
                      </a>
                    ) : null}
                  </div>
                </div>

                {coverData.url ? (
                  <div className="article-hero-cover">
                    <figure className="article-cover">
                      <div>
                        <Image
                          src={coverData.url}
                          alt={coverData.alt ?? post.title}
                          fill
                          sizes="(max-width: 1024px) 90vw, 680px"
                          style={{ objectFit: 'cover' }}
                          loading="eager"
                        />
                      </div>
                      {coverData.caption ? (
                        <figcaption>{coverData.caption}</figcaption>
                      ) : null}
                    </figure>
                  </div>
                ) : null}
              </header>
            </Reveal>
            <div className="article-body-layout">
              <aside className="article-sidebar">
                {headings.length > 0 ? (
                  <TableOfContents headings={headings} />
                ) : (
                  <p>Notes from practice.</p>
                )}
                <TransitionLink href="/blog" className="text-link">
                  ← All articles
                </TransitionLink>
              </aside>
              <div className="article-reading">
                <BlogContent content={post.content} title={post.title} />
                {inlineImages.map((img, i) => (
                  <figure className="article-image" key={img.id ?? i}>
                    <Image
                      src={img.url}
                      alt={img.alt ?? post.title}
                      width={1000}
                      height={750}
                      sizes="(max-width: 800px) 90vw, 760px"
                    />
                    {img.caption ? (
                      <figcaption>{img.caption}</figcaption>
                    ) : null}
                  </figure>
                ))}
                {galleryImages.length > 0 ? (
                  <div className="article-gallery">
                    {galleryImages.map((img, i) => (
                      <figure className="article-image" key={img.id ?? i}>
                        <Image
                          src={img.url}
                          alt={img.alt ?? post.title}
                          width={800}
                          height={600}
                          sizes="(max-width: 600px) 90vw, 380px"
                        />
                        {img.caption ? (
                          <figcaption>{img.caption}</figcaption>
                        ) : null}
                      </figure>
                    ))}
                  </div>
                ) : post.gallery ? (
                  <figure className="article-image">
                    <Image
                      src={post.gallery}
                      alt={`${post.title} gallery`}
                      width={1000}
                      height={750}
                      sizes="(max-width: 800px) 90vw, 760px"
                    />
                  </figure>
                ) : null}
                {profile ? (
                  <Reveal>
                    <footer className="article-author">
                      <span className="article-avatar" aria-hidden="true">
                        {initials}
                      </span>
                      <div>
                        <p className="article-eyebrow">Written by</p>
                        <h2>{profile.name}</h2>
                        <p>{profile.description}</p>
                        <TransitionLink href="/about" className="text-link">
                          More about {profile.name.split(' ')[0]} ↗
                        </TransitionLink>
                      </div>
                    </footer>
                  </Reveal>
                ) : null}
              </div>
            </div>
          </article>
          <Reveal>
            <section className="article-next">
              <p className="article-eyebrow">
                {next.slug !== post.slug ? 'Read next' : 'More blogs'}
              </p>
              <TransitionLink
                href={next.slug !== post.slug ? `/blog/${next.slug}` : '/blog'}
              >
                <h2>
                  {next.slug !== post.slug ? next.title : 'All articles'}{' '}
                  <span aria-hidden="true">↗</span>
                </h2>
              </TransitionLink>
            </section>
          </Reveal>
        </div>
      </main>
    </>
  );
}
