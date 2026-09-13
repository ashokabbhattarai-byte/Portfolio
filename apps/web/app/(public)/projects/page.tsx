import { ProjectExplorer } from '@/components/projects/project-explorer';
import { ContactFooter } from '@/components/layout/contact-footer';
import { TrackView } from '@/components/analytics/track-view';
import { getProjects } from '@/lib/content';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';
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
  const tabSuffix = tab !== 'All' ? ` — ${tab}` : '';
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
      ? `Case studies from ${projects.length} software projects by Ashok Bhattarai — ${titles}. Full-stack, AI and blockchain delivery, each with the problem, the contribution and the outcome.`
      : `${tab} projects by Ashok Bhattarai — ${
          projects
            .filter((p) => p.category === tab)
            .map((p) => p.title)
            .join(', ') || tab
        }. The problem, the contribution and the outcome for each build.`,
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
      `${total} projects across full-stack, AI and blockchain — ${live} live and the rest in delivery. Each one records the problem it solves, the part I built and what shipped.`,
  },
  'Full stack': {
    h1: ['Full-stack delivery.', 'End to end.'],
    note: () =>
      'Data model, API and interface designed together — typed, accessible and fast enough to stay out of the user’s way.',
  },
  AI: {
    h1: ['Intelligent products.', 'Practical outcomes.'],
    note: () =>
      'Classification, summarisation and document search applied to problems people genuinely have, not demos that only work on stage.',
  },
  Blockchain: {
    h1: ['Verifiable by design.', 'Useful in practice.'],
    note: () =>
      'Authenticity and verification work where a ledger earns its place — the trust problem first, the technology second.',
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
        name: `Projects — Ashok Bhattarai`,
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
        <div className="page-heading">
          <p className="section-label">
            {initialTab === 'All'
              ? 'Selected projects'
              : `${initialTab} projects`}{' '}
            / {String(visible.length).padStart(2, '0')}
          </p>
          <h1>
            {copy.h1[0]}
            <br />
            {copy.h1[1]}
          </h1>
          <p className="heading-note">
            {copy.note(projects.length, liveCount)}
          </p>
        </div>
        <ProjectExplorer projects={projects} initialTab={initialTab} />
      </main>
      <ContactFooter />
    </>
  );
}
