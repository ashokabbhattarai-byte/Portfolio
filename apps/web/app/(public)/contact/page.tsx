import Image from 'next/image';
import { getProfile } from '@/lib/content';
import { ResumeLinks } from '@/components/ui/resume-links';
import { TrackView } from '@/components/analytics/track-view';
import { jsonLd, metadata as pageMetadata, siteUrl } from '@/lib/seo';
export async function generateMetadata() {
  const profile = await getProfile();
  return pageMetadata(
    `Contact ${profile.name} — ${profile.role}`,
    `Get in touch with ${profile.name}, ${profile.role} in ${profile.location}. Available for full-stack, AI and quality assurance work — email ${profile.email} for a reply within a day.`,
    '/contact',
    [
      `Contact ${profile.name}`,
      `Hire ${profile.name}`,
      profile.role,
      `Software developer ${profile.location}`,
      'Hire full-stack developer Nepal',
      'Freelance Next.js developer',
      'Remote software engineer',
      profile.email,
    ],
    { absoluteTitle: true },
  );
}
export default async function Contact() {
  const profile = await getProfile();
  const schema = siteUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: `Contact ${profile.name}`,
        url: `${siteUrl}/contact`,
        inLanguage: 'en',
        isPartOf: { '@id': `${siteUrl}/#website` },
        mainEntity: { '@id': `${siteUrl}/#person` },
      }
    : null;
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
        <div className="page-heading">
          <p className="section-label">Contact</p>
          <h1>
            Let’s talk about
            <br />
            what you’re{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
              building.
            </span>
          </h1>
        </div>
        <div className="contact-page-grid">
          <div>
            <p>
              A product to build, a role to fill,
              <br />
              or a problem worth thinking through —
              <br />
              every message gets a considered reply.
            </p>
            <a
              className="contact-email"
              href={`mailto:${profile.email}`}
              aria-label={`Email ${profile.name} at ${profile.email}`}
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
            <h2>Elsewhere</h2>
            <a
              className="text-link"
              href={profile.github}
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
            <h2>Based in</h2>
            <p>{profile.location}</p>
            <h2>Response time</h2>
            <p>Within one working day (NPT)</p>
          </aside>
        </div>
        <p className="contact-signoff">
          Namaste — let’s make something worth using.
        </p>
      </main>
    </>
  );
}
