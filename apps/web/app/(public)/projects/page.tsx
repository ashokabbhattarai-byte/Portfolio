import { Suspense } from 'react';
import { ProjectExplorer } from '@/components/projects/project-explorer';
import { ContactFooter } from '@/components/layout/contact-footer';
import { TrackView } from '@/components/analytics/track-view';
import { Reveal } from '@/components/motion/reveal';
import { StatsCount } from '@/components/sections/stats-count';
import { getProjects } from '@/lib/content';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';

/* Navy stats band in the landing stats-ribbon language (bg var(--deep), 22px
   radius, lime border + 80px grid). Counters reuse the Remotion StatsCount
   pattern; the pulse/grid fallbacks for calm + reduced-motion live here so
   globals.css stays untouched. */
const statsBandStyles = `
.projects-stats-band .stat{transition:background .35s ease}
.projects-stats-band .stat:hover{background:color-mix(in srgb, var(--highlight) calc(0.06 * 100%), transparent)}
.projects-stats-band .live-dot{width:8px;height:8px;align-self:center;border-radius:50%;background:var(--highlight);box-shadow:0 0 0 4px rgba(142,233,177,0.18);animation:projects-live-pulse 1.8s ease-in-out infinite;flex-shrink:0}
@keyframes projects-live-pulse{0%,100%{box-shadow:0 0 0 4px rgba(142,233,177,0.18)}50%{box-shadow:0 0 0 8px rgba(142,233,177,0.06)}}
@media (max-width:600px){.projects-stats-band .stats-grid{grid-template-columns:1fr!important}.projects-stats-band .stat{border-right:0!important;border-bottom:1px solid rgba(255,255,255,0.1)}.projects-stats-band .stat:last-child{border-bottom:0}}
@media (max-width:480px){.projects-stats-band .stat{padding:22px!important}.projects-stats-band .stat-value{font-size:32px!important}}
@media (max-width:360px){.projects-stats-band .stat{padding:18px!important}}
[data-flow='calm'] .projects-stats-band .live-dot{animation:none}
@media (prefers-reduced-motion:reduce){.projects-stats-band .live-dot{animation:none}.projects-stats-band .stat{transition:none}}
`;
const validTabs = ['All', 'Full stack', 'AI', 'Blockchain'] as const;
type Tab = (typeof validTabs)[number];

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { tab: raw } = (await searchParams) ?? {};
  const tab = (validTabs as readonly string[]).includes(raw ?? '')
    ? (raw as Tab)
    : 'All';
  const projects = await getProjects();
  const titles = projects.map((p) => p.title).join(', ');
  const tabSuffix = tab !== 'All' ? `, ${tab}` : '';
  const path =
    tab === 'All' ? '/projects' : `/projects?tab=${encodeURIComponent(tab)}`;
  const keywords = [
    'Ashok Bhattarai projects',
    `${tab} projects`,
    'Software engineering case studies',
    'Full-stack portfolio',
    'AI product portfolio',
    'Blockchain project',
    'Next.js case study',
    ...projects.map((p) => p.title),
  ];
  return pageMetadata(
    `Projects${tabSuffix}`,
    tab === 'All'
      ? `Case studies from ${projects.length} software projects by Ashok Bhattarai: ${titles}. Full-stack, AI and blockchain delivery, with the problem, contribution and outcome.`
      : `${tab} projects by Ashok Bhattarai: ${
          projects
            .filter((p) => p.category === tab)
            .map((p) => p.title)
            .join(', ') || tab
        }. The problem, contribution and outcome for each build.`,
    path,
    keywords,
    /* The filtered views are subsets of the same four case studies. They stay
       crawlable for the internal links but only /projects competes in the
       index, so the tabs cannot cannibalise it. */
    { noindex: tab !== 'All' },
  );
}
const tabCopy: Record<
  Tab,
  { h1: [string, string]; note: (total: number, live: number) => string }
> = {
  All: {
    h1: ['Built end to end.', 'Shipped to production.'],
    note: (total, live) =>
      `${total} projects across full-stack, AI and blockchain, with ${live} live and the rest in delivery. Each one records the problem it solves, the part I built and what shipped.`,
  },
  'Full stack': {
    h1: ['Full-stack delivery.', 'End to end.'],
    note: () =>
      'Data model, API and interface designed together: typed, accessible and fast enough to stay out of the user’s way.',
  },
  AI: {
    h1: ['Intelligent products.', 'Practical outcomes.'],
    note: () =>
      'Classification, summarisation and document search applied to problems people genuinely have, not demos that only work on stage.',
  },
  Blockchain: {
    h1: ['Verifiable by design.', 'Useful in practice.'],
    note: () =>
      'Authenticity and verification work where a ledger earns its place. The trust problem first, the technology second.',
  },
};

export default async function Projects({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { tab: raw } = (await searchParams) ?? {};
  const initialTab = (validTabs as readonly string[]).includes(raw ?? '')
    ? (raw as Tab)
    : 'All';
  const projects = await getProjects();
  const copy = tabCopy[initialTab];
  const visible =
    initialTab === 'All'
      ? projects
      : projects.filter((p) => p.category === initialTab);
  const liveCount = projects.filter((p) => p.live).length;
  const trackPath =
    initialTab === 'All'
      ? '/projects'
      : `/projects?tab=${encodeURIComponent(initialTab)}`;
  /* An ItemList gives the listing a shot at a carousel result; without it
     Google only ever sees four links in a table. */
  const schema = siteUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `Projects by Ashok Bhattarai`,
        url: `${siteUrl}/projects`,
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#person` },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: visible.length,
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          itemListElement: visible.map((project, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${siteUrl}/projects/${project.slug}`,
            name: project.title,
          })),
        },
      }
    : null;
  return (
    <>
      <TrackView path={trackPath} />
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ) : null}
      <main id="main" tabIndex={-1} className="inner-page section-shell">
        <style>{statsBandStyles}</style>
        <Reveal className="page-heading">
          <p className="section-label">
            {initialTab === 'All'
              ? 'Selected projects'
              : `${initialTab} projects`}{' '}
            / {String(visible.length).padStart(2, '0')}
          </p>
          <h1
            style={{ fontSize: 'clamp(40px,4.6vw,64px)', color: 'var(--deep)' }}
          >
            {copy.h1[0]}
            <br />
            {copy.h1[1]}
          </h1>
          <p
            className="heading-note"
            style={{
              marginLeft: 0,
              maxWidth: '64ch',
              fontSize: 17,
              lineHeight: 1.7,
              color: '#556479',
            }}
          >
            {copy.note(projects.length, liveCount)}
          </p>
        </Reveal>
        <div
          className="projects-stats-band"
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'var(--deep)',
            border:
              '1px solid color-mix(in srgb, var(--highlight) calc(0.18 * 100%), transparent)',
            borderRadius: 22,
            marginBottom: 48,
            boxShadow:
              '0 22px 64px rgba(12,33,60,0.22), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(color-mix(in srgb, var(--highlight) calc(0.11 * 100%), transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--highlight) calc(0.11 * 100%), transparent) 1px, transparent 1px)',
              backgroundSize: '80px 80px',
              opacity: 0.14,
              maskImage:
                'radial-gradient(ellipse at 50% 0%, #000, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse at 50% 0%, #000, transparent 75%)',
              pointerEvents: 'none',
            }}
          />
          <div
            className="stats-grid"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
            }}
          >
            <div
              className="stat"
              style={{
                padding: '28px 32px',
                borderRight: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span
                className="stat-value"
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  color: 'var(--paper)',
                  fontSize: 'clamp(34px,4vw,52px)',
                  letterSpacing: '-0.04em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <StatsCount value={projects.length} />
                <em
                  style={{
                    color: 'var(--highlight)',
                    fontStyle: 'normal',
                    fontSize: 15,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  total
                </em>
              </span>
              <span style={{ color: '#b7c8bc', fontSize: 15 }}>
                Projects documented end to end
              </span>
            </div>
            <div className="stat live" style={{ padding: '28px 32px' }}>
              <span
                className="stat-value"
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  color: 'var(--paper)',
                  fontSize: 'clamp(34px,4vw,52px)',
                  letterSpacing: '-0.04em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span className="live-dot" aria-hidden="true" />
                <StatsCount value={liveCount} />
                <em
                  style={{
                    color: 'var(--highlight)',
                    fontStyle: 'normal',
                    fontSize: 15,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  live
                </em>
              </span>
              <span style={{ color: '#b7c8bc', fontSize: 15 }}>
                Live in production today
              </span>
            </div>
          </div>
        </div>
        {/* Suspense boundary required: ProjectExplorer reads useSearchParams(),
            which needs a client-rendered boundary so the route can prerender
            instead of hanging on "Rendering…". */}
        <Suspense
          fallback={
            <div
              className="work-toolbar"
              aria-hidden="true"
              style={{ minHeight: 60 }}
            />
          }
        >
          <ProjectExplorer projects={projects} initialTab={initialTab} />
        </Suspense>
      </main>
      <ContactFooter />
    </>
  );
}
