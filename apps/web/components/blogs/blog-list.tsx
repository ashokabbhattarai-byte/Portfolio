import { BlogCounts } from '@/components/analytics/blog-engagement';
import Image from 'next/image';
import { TransitionLink } from '@/components/motion/transition-link';
import type { Blog } from '@portfolio/types';

function formatDate(value?: string | null): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

export function BlogList({ blogs }: { blogs: Blog[] }) {
  if (blogs.length === 0) {
    return (
      <div className="adm-panel" style={{ marginTop: 24 }}>
        <p style={{ color: 'var(--muted)' }}>
          The first articles are in progress — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="project-collection list" style={{ marginTop: 28 }}>
      <div className="work-columns utility">
        <span>Article</span>
        <span>Published</span>
        <span>Read</span>
      </div>
      {blogs.map((post) => (
        <TransitionLink
          key={post.id}
          href={`/blog/${post.slug}`}
          className="project-entry"
          data-blog={post.slug}
          data-flip-id={post.slug}
        >
          <div className="project-thumbnail">
            {(() => {
              const cover =
                post.images?.find(
                  (i) =>
                    i.placement === 'COVER' ||
                    i.placement === 'THUMBNAIL' ||
                    i.placement === 'HERO',
                )?.url ?? post.coverImage;
              const alt =
                post.images?.find(
                  (i) => i.placement === 'COVER' || i.placement === 'THUMBNAIL',
                )?.alt ?? post.title;
              return cover ? (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    src={cover}
                    alt={alt}
                    fill
                    sizes="(max-width: 700px) 100vw, 400px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div
                  className="project-art"
                  style={{
                    background: '#f4f3ee',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 32,
                    color: '#292a2e',
                  }}
                >
                  ✎
                </div>
              );
            })()}
          </div>
          <div className="project-title">
            <h3>{post.title}</h3>
            <BlogCounts path={`/blog/${post.slug}`} />
            <span
              className="project-context"
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span>{post.excerpt.slice(0, 64)}…</span>
              {post.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="adm-role"
                  style={{ fontSize: 10, padding: '2px 6px' }}
                >
                  {t}
                </span>
              ))}
            </span>
          </div>
          <span
            className="project-category"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: 12,
            }}
          >
            <span>
              {post.status === 'SCHEDULED'
                ? 'Scheduled'
                : post.status === 'DRAFT'
                  ? 'Draft'
                  : 'Published'}
            </span>
            <span style={{ color: 'var(--muted)' }}>
              {post.scheduledAt
                ? formatDate(post.scheduledAt)
                : formatDate(post.publishedAt)}
            </span>
          </span>
          <span className="project-arrow" aria-hidden="true">
            ↗
          </span>
        </TransitionLink>
      ))}
    </div>
  );
}
