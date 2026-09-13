import { Hero } from '@/components/sections/hero';
import { Intro } from '@/components/sections/intro';
import { StatsRibbon } from '@/components/sections/stats-ribbon';
import { FeaturedProjects } from '@/components/sections/featured-projects';
import { FeaturedBlogs } from '@/components/sections/featured-blogs';
import { ContactFooter } from '@/components/layout/contact-footer';
import { TrackView } from '@/components/analytics/track-view';
import { getExperience, getProfile, getProjects } from '@/lib/content';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';

export async function generateMetadata() {
  const [profile, projects] = await Promise.all([getProfile(), getProjects()]);
  const keywords = [
    profile.name,
    `${profile.name} portfolio`,
    profile.role,
    `${profile.role} ${profile.location}`,
    'Full-stack developer Nepal',
    'Next.js developer',
    'React developer',
    'TypeScript',
    'AI product engineer',
    'Quality assurance',
    ...projects.slice(0, 4).map((p) => p.title),
  ];
  return pageMetadata(
    `${profile.name} — ${profile.role} in ${profile.location}`,
    `${profile.description} Selected projects: ${projects
      .slice(0, 3)
      .map((p) => p.title)
      .join(', ')}.`,
    '/',
    keywords,
    { type: 'profile', absoluteTitle: true },
  );
}

export default async function Home() {
  const [profile, experience, projects] = await Promise.all([
    getProfile(),
    getExperience(),
    getProjects(),
  ]);
  /* Marks the home page as the canonical profile for the Person in the layout
     graph, and surfaces the project list to crawlers that never run the
     filters. */
  const schema = siteUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${siteUrl}/#profilepage`,
        url: siteUrl,
        name: `${profile.name} — ${profile.role}`,
        description: profile.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#person` },
        about: { '@id': `${siteUrl}/#person` },
        hasPart: projects.slice(0, 6).map((project) => ({
          '@type': 'CreativeWork',
          name: project.title,
          url: `${siteUrl}/projects/${project.slug}`,
          abstract: project.summary,
        })),
      }
    : null;
  return (
    <>
      <TrackView path="/" />
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ) : null}
      <main id="main" tabIndex={-1}>
        <Hero profile={profile} experience={experience} />
        <Intro profile={profile} />
        <StatsRibbon />
        <FeaturedProjects />
        <FeaturedBlogs />
      </main>
      <ContactFooter />
    </>
  );
}
