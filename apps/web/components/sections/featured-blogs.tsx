import { BlogCounts } from '@/components/analytics/blog-engagement';
import Link from 'next/link';
import { getBlogs } from '@/lib/content';
import { TransitionLink } from '@/components/motion/transition-link';
import { Magnetic } from '@/components/motion/magnetic';

export async function FeaturedBlogs() {
  const blogs = await getBlogs();
  if (blogs.length === 0) {
    return (
      <section
        id="writing"
        className="featured section-shell"
        style={{ marginTop: 48 }}
        aria-labelledby="writing-title"
      >
        <div className="section-heading">
          <h2 id="writing-title">Writing</h2>
          <span className="utility">
            Notes on engineering, applied AI and quality
          </span>
        </div>
        <div
          style={{
            border: '1px dashed var(--line)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--muted)',
          }}
        >
          <p style={{ fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>
            The first articles are in progress — architecture decisions, applied
            AI and the quality assurance behind each release.
          </p>
          <p style={{ fontSize: 14 }}>
            In the meantime, the code is public on{' '}
            <a
              href="https://github.com/ashokabbhattaraii"
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    );
  }
  const flagged = blogs.filter((b) => b.featured);
  const list = (flagged.length ? flagged : blogs).slice(0, 3);

  return (
    <section
      id="writing"
      className="featured section-shell"
      style={{ marginTop: 48 }}
      aria-labelledby="writing-title"
    >
      <div className="section-heading">
        <h2 id="writing-title">Writing</h2>
        <span className="utility">
          Notes on engineering, applied AI and quality
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 18,
          marginTop: 24,
        }}
        className="blog-featured-grid"
      >
        {list.map((post) => {
          const cover =
            post.images?.find(
              (i) => i.placement === 'COVER' || i.placement === 'HERO',
            )?.url ?? post.coverImage;
          const alt =
            post.images?.find(
              (i) => i.placement === 'COVER' || i.placement === 'HERO',
            )?.alt ?? post.title;
          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              data-blog={post.slug}
              className="adm-panel blog-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'transform .35s var(--ease), box-shadow .35s',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 188,
                  overflow: 'hidden',
                  background: '#f4f3ee',
                }}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    loading="lazy"
                    decoding="async"
                    src={cover}
                    alt={alt}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform .6s var(--ease)',
                    }}
                    className="blog-cover"
                  />
                ) : (
                  <div
                    style={{
                      height: '100%',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 36,
                      color: '#292a2e',
                    }}
                  >
                    ✎
                  </div>
                )}
              </div>
              <div
                style={{ padding: '16px 16px 18px', display: 'grid', gap: 8 }}
              >
                <BlogCounts path={`/blog/${post.slug}`} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {post.tags.slice(0, 2).map((t) => (
                    <span
                      key={t}
                      className="adm-role"
                      style={{ fontSize: 10, padding: '2px 6px' }}
                    >
                      {t}
                    </span>
                  ))}
                  {post.featured ? (
                    <span className="adm-role" style={{ fontSize: 10 }}>
                      featured
                    </span>
                  ) : null}
                </div>
                <h3
                  style={{
                    fontSize: 17,
                    lineHeight: 1.3,
                    margin: 0,
                    letterSpacing: -0.02 * 17,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.title}
                </h3>
                <p
                  style={{
                    color: 'var(--muted)',
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.55,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.excerpt}
                </p>
                <span
                  style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2 }}
                >
                  Read article <span aria-hidden="true">↗</span>
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .blog-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
            .blog-card:hover .blog-cover { transform: scale(1.04); }
            @media (max-width: 1024px) { .blog-featured-grid { grid-template-columns: repeat(2, 1fr) !important; } }
            @media (max-width: 640px) { .blog-featured-grid { grid-template-columns: 1fr !important; } }
          `,
        }}
      />

      <div className="more-work">
        <Magnetic>
          <TransitionLink
            className="pill"
            href="/blog"
            aria-label={`Read all ${blogs.length} articles`}
          >
            All articles <sup>{String(blogs.length).padStart(2, '0')}</sup>
            <span aria-hidden="true">↗</span>
          </TransitionLink>
        </Magnetic>
      </div>
    </section>
  );
}
