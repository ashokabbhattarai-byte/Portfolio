import styles from './landing.module.css';
import Image from 'next/image';
import { TransitionLink } from '@/components/motion/transition-link';
import { Hero } from '@/components/sections/hero';
import { LandingScroll } from '@/components/motion/landing-scroll';
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
    'Ashok Bhattarai',
    'ashokbhattarai',
    'Ashok Bhattarai Portfolio',
    'Ashok Bhattarai Nepal',
    'Ashok Bhattarai Developer',
    'Ashok Bhattarai Software Engineer',
    'Ashok Bhattarai Lalitpur',
    'Ashok Bhattarai Rumsan',
    'ashokabbhattarai',
    'ashokabbhattaraii',
    profile.name,
    `${profile.name} developer`,
    `${profile.name} portfolio`,
    `${profile.name} website`,
    profile.role,
    `${profile.role} ${profile.location}`,
    'Full-stack developer Nepal',
    'Next.js developer Nepal',
    'React developer Nepal',
    'TypeScript engineer Nepal',
    'AI product engineer Nepal',
    'Software engineer Lalitpur',
    ...projects.slice(0, 4).map((p) => p.title),
  ];
  return pageMetadata(
    `${profile.name} — ${profile.role} & AI Engineer | Official Portfolio`,
    `Official portfolio of ${profile.name} (ashokbhattarai), ${profile.role} based in ${profile.location}. Explore featured projects (${projects
      .slice(0, 3)
      .map((p) => p.title)
      .join(', ')}), software engineering experience, and technical writing.`,
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
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': `${siteUrl}/#profilepage`,
    url: siteUrl,
    name: `${profile.name} — ${profile.role} Portfolio`,
    headline: `${profile.name} — Software Developer & AI Product Engineer`,
    description: profile.description,
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: { '@id': `${siteUrl}/#person` },
    about: { '@id': `${siteUrl}/#person` },
    primaryImageOfPage: `${siteUrl}/assets/hero-portrait.webp`,
    hasPart: projects.slice(0, 6).map((project) => ({
      '@type': 'CreativeWork',
      name: project.title,
      url: `${siteUrl}/projects/${project.slug}`,
      abstract: project.summary,
      creator: { '@id': `${siteUrl}/#person` },
    })),
  };
  return (
    <>
      <TrackView path="/" />
      <LandingScroll />
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ) : null}
      <main id="main" tabIndex={-1} className={styles.landing}>
        <Hero profile={profile} experience={experience} />
        <Intro profile={profile} />
        <StatsRibbon />
        <FeaturedProjects />
        <section
          className={styles.interlude}
          data-interlude
          aria-labelledby="personal-title"
        >
          <div className={styles.personalCopy} data-landing-reveal>
            <div className={styles.eyebrowBadge}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              <span>A PERSON BEHIND EVERY PROJECT</span>
            </div>
            <h2 id="personal-title">
              Curiosity first.
              <br />
              <span className={styles.highlightText}>Craft, always.</span>
            </h2>
            <p className={styles.personalLead}>
              From the first question to the final detail, I care about how
              software feels to the people who use it. Building reliable AI
              products and responsive full-stack web experiences from Kathmandu
              to the world.
            </p>
            <div className={styles.personalGrid}>
              <div className={styles.personalGridItem}>
                <span className={styles.gridTag}>01 / Impact</span>
                <h4>Applied AI & Systems</h4>
                <p>
                  Architecting SuchanaAI to make public notice information
                  instantly searchable across Nepal.
                </p>
              </div>
              <div className={styles.personalGridItem}>
                <span className={styles.gridTag}>02 / Discipline</span>
                <h4>Full-Stack & QA</h4>
                <p>
                  Engineered with end-to-end type safety, fluid 60fps motion,
                  and accessible responsive interfaces.
                </p>
              </div>
            </div>
            <div className={styles.personalActions}>
              <TransitionLink href="/about" className={styles.ctaPrimary}>
                Get to know me <span aria-hidden="true">↗</span>
              </TransitionLink>
              <TransitionLink href="/projects" className={styles.ctaSecondary}>
                View selected work <span aria-hidden="true">→</span>
              </TransitionLink>
            </div>
          </div>
          <div className={styles.portraitStrip} data-portrait-window>
            <Image
              src="/assets/interlude-portrait.webp"
              alt={`${profile.name} presenting SuchanaAI research at Lord Buddha Education Foundation`}
              fill
              sizes="(max-width: 760px) 92vw, (max-width: 1200px) 45vw, 460px"
              className={styles.interludePhoto}
            />
            <div className={styles.portraitOverlay} aria-hidden="true" />
            <span className={styles.portraitCaption}>
              <span className={styles.captionName}>ASHOK BHATTARAI</span>
              <span className={styles.captionMeta}>
                RESEARCH & ENGINEERING ↗
              </span>
            </span>
          </div>
        </section>
        <FeaturedBlogs />
      </main>
      <ContactFooter />
    </>
  );
}
