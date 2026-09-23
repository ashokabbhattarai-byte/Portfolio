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
  const personId = `${siteUrl ?? ''}/#person`;
  const siteId = `${siteUrl ?? ''}/#website`;
  const [city, country = 'Nepal'] = profile.location
    .split(',')
    .map((part) => part.trim());
  const person = {
    '@type': 'Person',
    '@id': personId,
    name: profile.name,
    givenName: profile.name.split(' ')[0],
    familyName: profile.name.split(' ').slice(1).join(' ') || undefined,
    jobTitle: profile.role,
    description: profile.description,
    email: `mailto:${profile.email}`,
    ...(siteUrl
      ? {
          url: siteUrl,
          image: {
            '@type': 'ImageObject',
            url: `${siteUrl}/assets/portrait.webp`,
            caption: `${profile.name} — ${profile.role}`,
          },
        }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: city,
      addressCountry: country,
    },
    nationality: { '@type': 'Country', name: country },
    knowsLanguage: profile.languages
      .split(',')
      .map((value) => value.replace(/\(.*?\)/, '').trim())
      .filter(Boolean),
    sameAs: [profile.github, profile.linkedin].filter(Boolean) as string[],
    knowsAbout: skills
      .flatMap((s) => s.items.split(',').map((i) => i.trim()))
      .filter(Boolean)
      .slice(0, 14),
    worksFor: experience[0]
      ? { '@type': 'Organization', name: experience[0].company }
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
        ...(siteUrl ? { url: siteUrl } : {}),
        name: `${profile.name} — ${profile.role}`,
        description: profile.description,
        inLanguage: 'en',
        publisher: { '@id': personId },
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
