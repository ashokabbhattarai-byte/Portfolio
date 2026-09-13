import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProject, getProjects } from '@/lib/content';
import { ProjectArt } from '@/components/projects/project-art';
import { TransitionLink } from '@/components/motion/transition-link';
import { Reveal } from '@/components/motion/reveal';
import { ViewCount } from '@/components/analytics/view-count';
import { TrackView } from '@/components/analytics/track-view';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';
export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return {};
  const keywords = [
    p.title,
    `${p.title} case study`,
    `${p.category} project`,
    ...p.focus,
    ...p.features.slice(0, 3),
    'Ashok Bhattarai',
    'Software engineering case study',
  ];
  return pageMetadata(
    `${p.title} — ${p.category} project`,
    `${p.summary} ${p.overview} A ${p.category.toLowerCase()} project built by Ashok Bhattarai — ${p.context}.`,
    `/projects/${p.slug}`,
    keywords,
    /* `image: null` hands og:image to the sibling opengraph-image route, which
       renders this project's own card rather than the site-wide one. */
    { type: 'article', image: null },
  );
}
export default async function CaseStudy({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, projects] = await Promise.all([
    getProject(slug),
    getProjects(),
  ]);
  if (!project) notFound();
  /* Falls back to this project when it is the only one, or when it came from
     the per-slug endpoint and so is not in the listing. */
  const next =
    projects[
      (projects.findIndex((p) => p.slug === slug) + 1) % projects.length
    ] ?? project;
  const breadcrumbLd = siteUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Projects',
            item: `${siteUrl}/projects`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: project.title,
            item: `${siteUrl}/projects/${slug}`,
          },
        ],
      }
    : null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.overview,
    abstract: project.summary,
    headline: project.title,
    about: project.category,
    genre: project.category,
    inLanguage: 'en',
    keywords: [...project.focus, project.category].join(', '),
    creator: siteUrl
      ? { '@id': `${siteUrl}/#person` }
      : { '@type': 'Person', name: 'Ashok Bhattarai' },
    author: siteUrl
      ? { '@id': `${siteUrl}/#person` }
      : { '@type': 'Person', name: 'Ashok Bhattarai' },
    ...(project.live ? { sameAs: project.live } : {}),
    ...(siteUrl
      ? {
          url: `${siteUrl}/projects/${slug}`,
          isPartOf: { '@id': `${siteUrl}/#website` },
          ...(project.image ? { image: `${siteUrl}${project.image}` } : {}),
        }
      : {}),
  };
  return (
    <>
      <TrackView path={`/projects/${project.slug}`} projectId={project.id} />
      <main id="main" tabIndex={-1} className="case-page">
        {/* Via `jsonLd`, which escapes the angle brackets for real: the
            '\u003c' this used to pass to `replace` is parsed as '<' before
            `replace` ever sees it, so it substituted a character for itself. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
        {breadcrumbLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbLd) }}
          />
        ) : null}
        <div className="section-shell inner-page">
          <div className="page-heading">
            <nav aria-label="Breadcrumb" style={{ marginBottom: 16 }}>
              <ol
                style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--muted)',
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                <li>
                  <TransitionLink
                    href="/"
                    className="text-link"
                    style={{ fontSize: 13 }}
                  >
                    Home
                  </TransitionLink>
                </li>
                <li aria-hidden>·</li>
                <li>
                  <TransitionLink
                    href="/projects"
                    className="text-link"
                    style={{ fontSize: 13 }}
                  >
                    Projects
                  </TransitionLink>
                </li>
                <li aria-hidden>·</li>
                <li
                  aria-current="page"
                  style={{
                    color: 'var(--ink)',
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {project.title}
                </li>
              </ol>
            </nav>
            <h1>{project.title}</h1>
            <p className="case-tagline">{project.summary}</p>
          </div>
          <div className="case-meta">
            <div>
              <span>Role</span>
              <p>{project.role}</p>
            </div>
            <div>
              <span>Context</span>
              <p>{project.context}</p>
            </div>
            <div>
              <span>Discipline</span>
              <p>{project.category}</p>
            </div>
            <div>
              <span>Views</span>
              <p>
                <ViewCount path={`/projects/${project.slug}`} />
              </p>
            </div>
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer"
                className="pill"
                aria-label={`Open the live ${project.title} site in a new tab`}
              >
                Visit live site <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>
        <div className="case-visual">
          <ProjectArt project={project} />
        </div>
        <div className="section-shell case-story">
          <Reveal className="story-intro">
            <p className="section-label">Overview</p>
            <h2>{project.overview}</h2>
          </Reveal>
          {project.gallery && (
            <figure className="project-gallery">
              <Image
                src={project.gallery}
                /* Named after the project rather than hard-coded to SuchanaAI —
                   every case study renders through this same figure. */
                alt={`${project.title} interface — ${project.summary}`}
                width={1440}
                height={1000}
                sizes="(max-width: 700px) 100vw, 88vw"
              />
              <figcaption>
                {project.title} in use · {project.context}
              </figcaption>
            </figure>
          )}
          <div className="story-grid">
            <h2>
              A real problem.
              <br />A measured contribution.
            </h2>
            <div>
              <section>
                <h3>The problem</h3>
                <p>{project.challenge}</p>
              </section>
              <section>
                <h3>My contribution</h3>
                <p>{project.contribution}</p>
              </section>
              <section>
                <h3>The outcome</h3>
                <p>{project.outcome}</p>
              </section>
              {project.features.length > 0 && (
                <section>
                  <h3>Key capabilities</h3>
                  <ul>
                    {project.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </section>
              )}
              <section>
                <h3>Focus areas</h3>
                <ul>
                  {project.focus.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </section>
              {/* The provenance note: it used to name SuchanaAI whatever the
                  project was, which misattributed every other case study. */}
              <p className="case-note">
                {project.live ? (
                  <>
                    My role and dates are documented in my résumé. Features and
                    screenshots reflect the{' '}
                    <a
                      className="text-link"
                      href={project.live}
                      target="_blank"
                      rel="noreferrer"
                    >
                      public {project.title} site
                    </a>
                    , reviewed September 2026.
                  </>
                ) : (
                  'This overview reflects the project information in my résumé. The visual is an original illustration; internal implementation details are not published.'
                )}
              </p>
            </div>
          </div>
        </div>
      </main>
      <section className="next-project" aria-labelledby="next-project-label">
        <p id="next-project-label">
          {next.slug === project.slug
            ? 'Explore the portfolio'
            : 'Next project'}
        </p>
        <TransitionLink
          href={`/projects/${next.slug}`}
          data-project={next.slug}
          data-preview="cursor"
          aria-label={`Read the ${next.title} case study`}
        >
          <h2>
            {next.title} <span aria-hidden="true">↗</span>
          </h2>
          <div className="next-art">
            <ProjectArt project={next} />
          </div>
        </TransitionLink>
        <TransitionLink href="/projects" className="text-link">
          Back to all projects
        </TransitionLink>
      </section>
    </>
  );
}
