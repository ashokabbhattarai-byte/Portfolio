import Image from 'next/image';
import { getProfile } from '@/lib/content';
import { ResumeLinks } from '@/components/ui/resume-links';
import { Reveal } from '@/components/motion/reveal';
import { TrackView } from '@/components/analytics/track-view';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';
export async function generateMetadata() {
  const profile = await getProfile();
  return pageMetadata(
    `Contact ${profile.name} — ${profile.role} in ${profile.location}`,
    `Get in touch with ${profile.name} (ashokbhattarai), ${profile.role} based in ${profile.location}. Reach out at ${profile.email} for full-stack engineering, applied AI, or software development opportunities.`,
    '/contact',
    [
      'Ashok Bhattarai',
      'ashokbhattarai',
      `Contact ${profile.name}`,
      `Hire ${profile.name}`,
      'Ashok Bhattarai email',
      'Ashok Bhattarai contact',
      'Ashok Bhattarai Nepal',
      profile.role,
      `Software developer ${profile.location}`,
      'Hire full-stack developer Nepal',
      'Freelance Next.js developer',
      'Remote software engineer Nepal',
      profile.email,
    ],
    { absoluteTitle: true },
  );
}
export default async function Contact() {
  const profile = await getProfile();
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${siteUrl}/contact#contactpage`,
    name: `Contact ${profile.name}`,
    headline: `Contact ${profile.name} — ${profile.role}`,
    url: `${siteUrl}/contact`,
    description: `Contact ${profile.name} for software engineering and AI projects.`,
    inLanguage: 'en',
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: { '@id': `${siteUrl}/#person` },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: siteUrl,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Contact',
          item: `${siteUrl}/contact`,
        },
      ],
    },
  };
  return (
    <>
      <TrackView path="/contact" />
      {schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
        />
      ) : null}
      <main
        id="main"
        tabIndex={-1}
        className="inner-page section-shell contact-page"
      >
        <Reveal>
          <div className="page-heading">
            <p className="section-label">Contact</p>
            <h1 style={{ fontSize: 'clamp(40px,4.6vw,64px)' }}>
              Let’s talk about
              <br />
              what you’re{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
                building.
              </span>
            </h1>
          </div>
        </Reveal>
        <Reveal>
          <div className="contact-page-grid">
            <div>
              <p>
                A product to build, a role to fill,
                <br />
                or a problem worth thinking through.
                <br />
                Every message gets a considered reply.
              </p>
              <a
                className="contact-email"
                href={`mailto:${profile.email}`}
                aria-label={`Email ${profile.name} at ${profile.email}`}
                style={{ minHeight: 44 }}
              >
                {profile.email}
                <span aria-hidden="true">↗</span>
              </a>
              <ResumeLinks />
            </div>
            <aside>
              <Image
                src="/assets/portrait.webp"
                alt={`${profile.name}, ${profile.role}`}
                width={150}
                height={150}
              />
              <h2
                className="section-label"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  fontWeight: 600,
                  color: 'color-mix(in srgb, var(--accent) 60%, transparent)',
                }}
              >
                Elsewhere
              </h2>
              <a
                className="text-link"
                href={profile.github}
                target="_blank"
                rel="noreferrer"
                style={{
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                GitHub ↗
              </a>
              <h2
                className="section-label"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  fontWeight: 600,
                  color: 'color-mix(in srgb, var(--accent) 60%, transparent)',
                }}
              >
                Based in
              </h2>
              <p>{profile.location}</p>
              <h2
                className="section-label"
                style={{
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  fontWeight: 600,
                  color: 'color-mix(in srgb, var(--accent) 60%, transparent)',
                }}
              >
                Response time
              </h2>
              <p>Within one working day (NPT)</p>
            </aside>
          </div>
        </Reveal>
        <Reveal>
          <p
            className="contact-signoff"
            style={{ fontSize: 16, color: '#556479' }}
          >
            Namaste. Let’s make something worth using.
          </p>
        </Reveal>
      </main>
    </>
  );
}
