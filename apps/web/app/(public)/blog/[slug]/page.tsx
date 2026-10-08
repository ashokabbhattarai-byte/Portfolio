import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getBlog, getBlogs, getProfile } from '@/lib/content';
import { TransitionLink } from '@/components/motion/transition-link';
import {
  BlogEngagement,
  BlogFloatingEngagement,
} from '@/components/analytics/blog-engagement';
import { TrackView } from '@/components/analytics/track-view';
import { ContactFooter } from '@/components/layout/contact-footer';
import { siteUrl } from '@/lib/seo';
import {
  estimateReadingTime,
  extractHeadings,
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
import styles from './blog-detail.module.css';

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
    alternates: b.canonicalUrl
      ? { canonical: b.canonicalUrl }
      : siteUrl
        ? { canonical: `/blog/${b.slug}` }
        : undefined,
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
  const contentImageUrls = new Set(
    Array.from(post.content.matchAll(/!\[.*?\]\((.*?)\)/g)).map((m) =>
      m[1].trim(),
    ),
  );
  const inlineImages = (post.images ?? []).filter(
    (i) => i.placement === 'INLINE' && !contentImageUrls.has(i.url.trim()),
  );
  const galleryImages = (post.images ?? []).filter(
    (i) => i.placement === 'GALLERY' && !contentImageUrls.has(i.url.trim()),
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
      <main
        id="main"
        tabIndex={-1}
        className={`${styles.articlePage} section-shell`}
      >
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

        <div className={styles.shell}>
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <TransitionLink href="/">Home</TransitionLink>
            <span aria-hidden="true" className={styles.breadcrumbSep}>
              ›
            </span>
            <TransitionLink href="/blog">Blogs</TransitionLink>
            <span aria-hidden="true" className={styles.breadcrumbSep}>
              ›
            </span>
            <span aria-current="page" className={styles.breadcrumbCurrent}>
              {post.title}
            </span>
          </nav>

          <article>
            <Reveal>
              <header className={styles.heroHeader}>
                <div className={styles.tagsRow}>
                  {post.tags.map((tag) => (
                    <span key={tag} className={styles.tagChip}>
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className={styles.title}>{post.title}</h1>
                <p className={styles.deck}>{post.excerpt}</p>

                <div className={styles.metaStrip}>
                  {profile ? (
                    <div className={styles.byline}>
                      <span className={styles.avatar} aria-hidden="true">
                        {initials}
                      </span>
                      <div className={styles.bylineInfo}>
                        <strong className={styles.authorName}>
                          {profile.name}
                        </strong>
                        <span className={styles.authorRole}>
                          {profile.role}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.metaRight}>
                    <time
                      dateTime={formatBlogDateISO(
                        post.publishedAt ?? post.createdAt,
                      )}
                    >
                      {datePublished}
                    </time>
                    <span className={styles.metaDot} aria-hidden="true">
                      •
                    </span>
                    <span>{readingText}</span>
                    <span className={styles.metaDot} aria-hidden="true">
                      •
                    </span>
                    <BlogEngagement path={`/blog/${post.slug}`} />

                    {post.linkedinUrl ? (
                      <a
                        href={post.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.linkedinBtn}
                      >
                        Discuss on LinkedIn <span aria-hidden="true">↗</span>
                      </a>
                    ) : null}
                  </div>
                </div>

                {coverData.url ? (
                  <figure className={styles.coverFigure}>
                    <div className={styles.coverWrapper}>
                      <Image
                        src={coverData.url}
                        alt={coverData.alt ?? post.title}
                        fill
                        priority
                        unoptimized
                        sizes="(max-width: 1200px) 100vw, 1140px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    {coverData.caption ? (
                      <figcaption className={styles.coverCaption}>
                        {coverData.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ) : null}
              </header>
            </Reveal>

            <div className={styles.bodyGrid}>
              <div className={styles.readingColumn}>
                <BlogContent content={post.content} title={post.title} />

                {inlineImages.map((img, i) => (
                  <figure className="article-image" key={img.id ?? i}>
                    <Image
                      src={img.url}
                      alt={img.alt ?? post.title}
                      width={1000}
                      height={750}
                      unoptimized
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
                          unoptimized
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
                      unoptimized
                      sizes="(max-width: 800px) 90vw, 760px"
                    />
                  </figure>
                ) : null}

                {profile ? (
                  <Reveal>
                    <footer className={styles.authorCard}>
                      <span className={styles.authorAvatar} aria-hidden="true">
                        {initials}
                      </span>
                      <div className={styles.authorContent}>
                        <p className={styles.authorEyebrow}>Written by</p>
                        <h2 className={styles.authorTitle}>{profile.name}</h2>
                        <p className={styles.authorBio}>
                          {profile.description}
                        </p>
                        <TransitionLink
                          href="/about"
                          className={styles.authorLink}
                        >
                          More about {profile.name.split(' ')[0]} ↗
                        </TransitionLink>
                      </div>
                    </footer>
                  </Reveal>
                ) : null}

                <Reveal>
                  <TransitionLink
                    href={
                      next.slug !== post.slug ? `/blog/${next.slug}` : '/blog'
                    }
                    className={styles.nextCard}
                  >
                    <p className={styles.nextEyebrow}>
                      {next.slug !== post.slug ? 'Read next' : 'More articles'}
                    </p>
                    <h2 className={styles.nextTitle}>
                      <span>
                        {next.slug !== post.slug
                          ? next.title
                          : 'Explore all writing'}
                      </span>
                      <span className={styles.nextArrow} aria-hidden="true">
                        ↗
                      </span>
                    </h2>
                  </TransitionLink>
                </Reveal>
              </div>

              <aside className={styles.sidebar}>
                {headings.length > 0 ? (
                  <TableOfContents headings={headings} />
                ) : (
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                    Notes from practice.
                  </p>
                )}
                <TransitionLink href="/blog" className={styles.backLink}>
                  ← Back to all articles
                </TransitionLink>
              </aside>
            </div>
          </article>
        </div>
      </main>
      <BlogFloatingEngagement path={`/blog/${post.slug}`} title={post.title} />
      <ContactFooter />
    </>
  );
}
