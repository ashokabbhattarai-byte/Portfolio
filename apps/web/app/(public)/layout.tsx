import { PageEntrance } from '@/components/motion/page-entrance';
import { MotionProvider } from '@/components/motion/motion-provider';
import { SiteHeader } from '@/components/layout/site-header';
import { ProjectCursor } from '@/components/projects/project-cursor';
import { BlogCursor } from '@/components/blogs/blog-cursor';
import { getSiteContent } from '@/lib/content';
import { jsonLd, siteUrl } from '@/lib/seo';
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, projects, blogs, skills, education, experience } =
    await getSiteContent();
  /* One @graph rather than several loose blocks: it lets the Person, the site
     and the professional service reference each other by @id, which is what
     Google uses to build the knowledge panel for a personal name query. */
  const personId = `${siteUrl}/#person`;
  const siteId = `${siteUrl}/#website`;
  const [city, country = 'Nepal'] = profile.location
    .split(',')
    .map((part) => part.trim());

  const sameAsProfiles = Array.from(
    new Set(
      [
        profile.github,
        'https://github.com/ashokabbhattaraii',
        'https://github.com/ashokabbhattarai-byte',
        profile.linkedin,
        siteUrl,
      ].filter(Boolean) as string[],
    ),
  );

  const person = {
    '@type': 'Person',
    '@id': personId,
    name: profile.name,
    alternateName: [
      'ashokbhattarai',
      'Ashok Bhattarai Nepal',
      'ashokabbhattarai',
      'ashokabbhattaraii',
      'Ashok Prasad Bhattarai',
    ],
    givenName: profile.name.split(' ')[0],
    familyName: profile.name.split(' ').slice(1).join(' ') || undefined,
    jobTitle: profile.role,
    description: profile.description,
    disambiguatingDescription:
      'Software Developer, Full-Stack Engineer and AI Product Developer based in Lalitpur, Nepal',
    email: profile.email,
    url: siteUrl,
    mainEntityOfPage: siteUrl,
    image: {
      '@type': 'ImageObject',
      url: `${siteUrl}/assets/hero-portrait.webp`,
      caption: `${profile.name} — ${profile.role}`,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressRegion: 'Bagmati',
      addressCountry: country,
    },
    nationality: { '@type': 'Country', name: country },
    knowsLanguage: profile.languages
      .split(',')
      .map((value) => value.replace(/\(.*?\)/, '').trim())
      .filter(Boolean),
    sameAs: sameAsProfiles,
    knowsAbout: [
      'Software Engineering',
      'Full-Stack Web Development',
      'Next.js',
      'React.js',
      'TypeScript',
      'JavaScript',
      'AI Product Development',
      'NestJS',
      'Node.js',
      'Quality Assurance',
      'PostgreSQL',
      'Prisma ORM',
      'REST APIs',
      ...skills
        .flatMap((s) => s.items.split(',').map((i) => i.trim()))
        .filter(Boolean),
    ].slice(0, 20),
    worksFor: experience[0]
      ? {
          '@type': 'Organization',
          name: experience[0].company,
        }
      : undefined,
    hasOccupation: {
      '@type': 'Occupation',
      name: profile.role,
      occupationLocation: { '@type': 'City', name: city },
      skills: skills.map((s) => s.items).join(', '),
    },
    alumniOf: education.map((item) => ({
      '@type': 'EducationalOrganization',
      name: item.school,
    })),
  };

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      person,
      {
        '@type': 'WebSite',
        '@id': siteId,
        url: siteUrl,
        name: `${profile.name} — Official Portfolio`,
        alternateName: [
          'Ashok Bhattarai',
          'ashokbhattarai',
          'Ashok Bhattarai Portfolio',
        ],
        description: profile.description,
        inLanguage: 'en',
        publisher: { '@id': personId },
        author: { '@id': personId },
        copyrightHolder: { '@id': personId },
      },
    ],
  };
  return (
    <>
      <noscript>
        <style
          dangerouslySetInnerHTML={{
            __html: '.transition-curtain{display:none}',
          }}
        />
      </noscript>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <MotionProvider
        titles={Object.fromEntries(
          projects.map((project) => [
            `/projects/${project.slug}`,
            project.title,
          ]),
        )}
      >
        <SiteHeader
          github={profile.github}
          resume={profile.resume}
          name={profile.name}
        />
        <PageEntrance />
        {children}
        <ProjectCursor
          projects={projects.map(
            ({
              image,
              title,
              slug,
              color,
              ink,
              symbol,
              focus,
              category,
              context,
            }) => ({
              image,
              title,
              slug,
              color,
              ink,
              symbol,
              focus,
              category,
              context,
            }),
          )}
        />
        <BlogCursor
          blogs={blogs.map(({ slug, title, tags, coverImage, images }) => ({
            slug,
            title,
            tags,
            coverImage,
            images,
          }))}
        />
      </MotionProvider>
    </>
  );
}
