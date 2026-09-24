import { Fragment } from 'react';
import Image from 'next/image';
import { ContactFooter } from '@/components/layout/contact-footer';
import { ResumeLinks } from '@/components/ui/resume-links';
import { Reveal } from '@/components/motion/reveal';
import { StatsCount } from '@/components/sections/stats-count';
import { TrackView } from '@/components/analytics/track-view';
import {
  getCertifications,
  getEducation,
  getExperience,
  getProfile,
  getSkills,
} from '@/lib/content';
import { getProjects } from '@/lib/content';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';
export async function generateMetadata() {
  const [profile, skills, experience] = await Promise.all([
    getProfile(),
    getSkills(),
    getExperience(),
  ]);
  const keywords = [
    `About ${profile.name}`,
    profile.name,
    profile.role,
    `${profile.role} ${profile.location}`,
    'Software developer biography',
    'Full-stack engineer Nepal',
    ...skills
      .flatMap((s) => s.items.split(',').map((i) => i.trim()))
      .slice(0, 10),
    ...experience.map((e) => e.company),
  ];
  return pageMetadata(
    `About ${profile.name} — ${profile.role}`,
    `${profile.description} Based in ${profile.location}, with experience at ${experience
      .map((e) => `${e.company} as ${e.role}`)
      .join(' and ')}.`,
    '/about',
    keywords,
    { type: 'profile', absoluteTitle: true },
  );
}
export default async function About() {
  /* All six resolve from the one cached /api/content round trip. */
  const [profile, experience, skills, education, certifications, projects] =
    await Promise.all([
      getProfile(),
      getExperience(),
      getSkills(),
      getEducation(),
      getCertifications(),
      getProjects(),
    ]);
  const firstName = profile.name.split(' ')[0];
  const country = profile.location.split(',').pop()?.trim() ?? profile.location;
  const liveCount = projects.filter((p) => p.live).length;
  const schema = siteUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        name: `About ${profile.name}`,
        url: `${siteUrl}/about`,
        description: profile.description,
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#person` },
        /* The résumé history lives here rather than in the layout graph so the
           dates sit on the page that actually renders them. */
        mentions: experience.map((item) => ({
          '@type': 'OrganizationRole',
          roleName: item.role,
          description: item.detail,
          memberOf: { '@type': 'Organization', name: item.company },
        })),
      }
    : null;
  return (
    <>
      <TrackView path="/about" />
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ) : null}
      <main id="main" tabIndex={-1} className="inner-page section-shell">
        <div className="page-heading">
          <p className="section-label">About</p>
          <h1>
            {profile.role},
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 400 }}>
              based in {country}.
            </span>
          </h1>
          <p className="heading-note">
            The full picture — how I work, what I have shipped, and the
            experience and education behind it.
          </p>
        </div>
        <section className="about-intro" aria-labelledby="about-intro-title">
          <div className="about-photo">
            <Image
              src="/assets/hero-portrait.webp"
              alt={`${profile.name}, ${profile.role} based in ${profile.location}`}
              fill
              sizes="(max-width: 700px) 100vw, 45vw"
            />
          </div>
          <Reveal>
            <div>
              <span
                className="direction-arrow"
                aria-hidden="true"
                style={{ fontSize: 50 }}
              >
                ↘
              </span>
              <h2 id="about-intro-title">
                I’m {firstName}.
                <br />
                <span style={{ color: 'var(--accent)' }}>
                  I turn scattered information into usable products.
                </span>
              </h2>
              <p>{profile.description}</p>
              {projects.length > 0 ? (
                <p>
                  Across <StatsCount value={projects.length} /> projects —{' '}
                  <StatsCount value={liveCount} /> of them live — I have worked
                  on{' '}
                  {projects
                    .map((p) => p.title)
                    .slice(0, 2)
                    .join(' and ')}
                  , covering full-stack delivery, applied AI and blockchain
                  verification. Every one of them started from a problem someone
                  actually had.
                </p>
              ) : null}
              {skills.length > 0 ? (
                <p>
                  Day to day that means{' '}
                  {skills[0]?.items.split(',').slice(0, 3).join(', ')} on the
                  build side, and structured quality assurance on the other —
                  because a feature is not finished until it holds up in
                  production.
                </p>
              ) : null}
              <ResumeLinks />
            </div>
          </Reveal>
        </section>
        <Reveal>
          <section
            className="experience-section"
            aria-labelledby="experience-title"
          >
            <h2 id="experience-title">Experience</h2>
            {experience.map((item) => (
              <article className="experience-row" key={item.id}>
                <p>
                  {item.company}
                  <br />
                  <span>{item.dates}</span>
                </p>
                <div>
                  <h3 style={{ fontSize: 'clamp(20px,1.6vw,26px)' }}>
                    {item.role}
                  </h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </section>
        </Reveal>
        <Reveal>
          <section className="skills-section" aria-labelledby="skills-title">
            <h2 id="skills-title">
              Skills
              <br />
              and tooling.
            </h2>
            <div>
              {skills.map((skill) => (
                <div className="skill-row" key={skill.id}>
                  <h3>{skill.name}</h3>
                  <p>{skill.items}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
        <Reveal>
          <section
            className="education-section"
            aria-labelledby="education-title"
          >
            <h2 id="education-title">Education and certifications</h2>
            <div>
              {education.map((item) => (
                <Fragment key={item.id}>
                  <h3>{item.award}</h3>
                  {/* One dateline: school, then whatever else is recorded. */}
                  <p>
                    {[item.school, item.dates, ...item.notes]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </Fragment>
              ))}
              {certifications.length > 0 && (
                <>
                  <h3>Certifications</h3>
                  <ul>
                    {certifications.map((item) => (
                      <li key={item.id}>
                        {item.url ? (
                          <a
                            className="text-link"
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              minHeight: 44,
                              display: 'inline-flex',
                              alignItems: 'center',
                            }}
                          >
                            {item.title}
                          </a>
                        ) : (
                          item.title
                        )}{' '}
                        — {item.issuer}, {item.date}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h3>Languages</h3>
              <p>{profile.languages}</p>
            </div>
          </section>
        </Reveal>
      </main>
      <ContactFooter />
    </>
  );
}
