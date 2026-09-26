import { BlogCounts } from '@/components/analytics/blog-engagement';
import { getBlogs } from '@/lib/content';
import { TransitionLink } from '@/components/motion/transition-link';
import { Magnetic } from '@/components/motion/magnetic';
import { CraftFilm } from './craft-film';
import styles from './featured-writing.module.css';

export async function FeaturedBlogs() {
  const blogs = await getBlogs();
  const flagged = blogs.filter((post) => post.featured);
  const list = (flagged.length ? flagged : blogs).slice(0, 3);
  return (
    <section
      id="writing"
      className={`featured section-shell ${styles.writing}`}
      aria-labelledby="writing-title"
    >
      <p className="section-label">03 / Latest blogs</p>
      <div className="section-heading">
        <h2 id="writing-title">Blogs</h2>
        <span className="utility">
          Notes on engineering, applied AI & quality
        </span>
      </div>
      <div className={styles.layout}>
        <div className={styles.feature}>
          <CraftFilm variant="writing" />
          <p>
            Lessons from the work.
            <br />
            <span>Written to be useful.</span>
          </p>
          <TransitionLink href="/blog" className={styles.all}>
            All blogs <span>↗</span>
          </TransitionLink>
        </div>
        <div className={styles.articles}>
          {list.length ? (
            list.map((post, index) => (
              <article
                key={post.id}
                className={styles.article}
                data-writing-entry
                data-blog={post.slug}
              >
                <TransitionLink
                  href={`/blog/${post.slug}`}
                  className={styles.articleLink}
                >
                  <div className={styles.meta}>
                    <span>
                      0{index + 1} /{' '}
                      {post.tags.slice(0, 2).join(' · ') || 'Engineering'}
                    </span>
                    <span aria-hidden="true">↗</span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <span className={styles.read}>Read article</span>
                </TransitionLink>
                <BlogCounts path={`/blog/${post.slug}`} />
              </article>
            ))
          ) : (
            <p className={styles.empty}>
              The first notes are taking shape. Architecture decisions,
              practical AI, and the details behind a careful release.
            </p>
          )}
        </div>
      </div>
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
