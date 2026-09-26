import * as argon2 from 'argon2';
import { PrismaClient } from '../src/prisma/prisma-client';
import { ARGON2_OPTIONS } from '../src/auth/auth.service';

const prisma = new PrismaClient();

type SeedProject =
  (typeof import('../../web/content/projects').projects)[number];

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();
  const name = process.env.SEED_ADMIN_NAME?.trim() || 'Ashok Bhattarai';

  if (!email || !password) {
    console.warn(
      '[seed] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed.',
    );
  } else {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!existing) {
      const hash = await argon2.hash(password, ARGON2_OPTIONS);
      await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          passwordHash: hash,
          role: 'ADMIN',
        },
      });
      console.log(`[seed] Created admin ${email}`);
    } else {
      console.log(`[seed] Admin ${email} already exists — skipping.`);
    }
  }

  // Profile — single row
  const { profile, experience, skills, education, certifications } =
    await import('../../web/content/profile');
  const { projects } = await import('../../web/content/projects');

  await prisma.profile.upsert({
    where: { id: 'profile' },
    update: {
      name: profile.name,
      role: profile.role,
      location: profile.location,
      email: profile.email,
      github: profile.github,
      linkedin: profile.linkedin,
      resume: profile.resume,
      description: profile.description,
      languages: profile.languages,
    },
    create: {
      id: 'profile',
      name: profile.name,
      role: profile.role,
      location: profile.location,
      email: profile.email,
      github: profile.github,
      linkedin: profile.linkedin,
      resume: profile.resume,
      description: profile.description,
      languages: profile.languages,
    },
  });
  console.log('[seed] Profile upserted');

  const toDbCategory = (c: string): 'AI' | 'FULL_STACK' | 'BLOCKCHAIN' => {
    if (c === 'AI') return 'AI';
    if (c === 'Full stack') return 'FULL_STACK';
    return 'BLOCKCHAIN';
  };

  for (const p of projects as SeedProject[]) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        category: toDbCategory(p.category),
        role: p.role,
        context: p.context,
        summary: p.summary,
        color: p.color,
        ink: p.ink,
        symbol: p.symbol,
        live: p.live ?? null,
        image: p.image ?? null,
        gallery: p.gallery ?? null,
        overview: p.overview,
        challenge: p.challenge,
        contribution: p.contribution,
        outcome: p.outcome,
        focus: p.focus,
        features: p.features,
        published: p.published,
        featured: p.featured,
        position: p.position,
      },
      create: {
        slug: p.slug,
        title: p.title,
        category: toDbCategory(p.category),
        role: p.role,
        context: p.context,
        summary: p.summary,
        color: p.color,
        ink: p.ink,
        symbol: p.symbol,
        live: p.live ?? null,
        image: p.image ?? null,
        gallery: p.gallery ?? null,
        overview: p.overview,
        challenge: p.challenge,
        contribution: p.contribution,
        outcome: p.outcome,
        focus: p.focus,
        features: p.features,
        published: p.published,
        featured: p.featured,
        position: p.position,
      },
    });
  }
  console.log(`[seed] ${projects.length} projects upserted`);

  for (const item of experience) {
    await prisma.experience.upsert({
      where: { id: item.id },
      update: {
        role: item.role,
        company: item.company,
        dates: item.dates,
        detail: item.detail,
        position: item.position,
      },
      create: {
        id: item.id,
        role: item.role,
        company: item.company,
        dates: item.dates,
        detail: item.detail,
        position: item.position,
      },
    });
  }
  console.log(`[seed] ${experience.length} experience rows upserted`);

  for (const item of skills) {
    await prisma.skill.upsert({
      where: { id: item.id },
      update: { name: item.name, items: item.items, position: item.position },
      create: {
        id: item.id,
        name: item.name,
        items: item.items,
        position: item.position,
      },
    });
  }
  console.log(`[seed] ${skills.length} skill rows upserted`);

  for (const item of education) {
    await prisma.education.upsert({
      where: { id: item.id },
      update: {
        school: item.school,
        award: item.award,
        dates: item.dates,
        notes: item.notes,
        position: item.position,
      },
      create: {
        id: item.id,
        school: item.school,
        award: item.award,
        dates: item.dates,
        notes: item.notes,
        position: item.position,
      },
    });
  }
  console.log(`[seed] ${education.length} education rows upserted`);

  for (const item of certifications) {
    await prisma.certification.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        issuer: item.issuer,
        date: item.date,
        url: item.url ?? null,
        position: item.position,
      },
      create: {
        id: item.id,
        title: item.title,
        issuer: item.issuer,
        date: item.date,
        url: item.url ?? null,
        position: item.position,
      },
    });
  }
  console.log(`[seed] ${certifications.length} certification rows upserted`);

  const { blogs } = await import('../../web/content/blogs');

  for (const b of blogs) {
    const blogImages =
      b.images && b.images.length > 0
        ? b.images.map((img, idx) => ({
            url: img.url,
            alt: img.alt || `${b.title} illustration ${idx + 1}`,
            caption: img.caption || null,
            placement:
              (img.placement as 'COVER' | 'HERO' | 'INLINE' | 'GALLERY') ||
              'INLINE',
            position: img.position ?? idx,
          }))
        : [
            {
              url:
                b.coverImage ||
                'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
              alt: `${b.title} cover`,
              caption: `Cover image for ${b.title}`,
              placement: 'COVER' as const,
              position: 0,
            },
          ];

    await prisma.blog.upsert({
      where: { slug: b.slug },
      update: {
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        coverImage: b.coverImage,
        tags: b.tags,
        published: b.published,
        featured: b.featured,
        position: b.position,
        status: b.status as never,
        scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
        publishedAt: b.publishedAt ? new Date(b.publishedAt) : null,
        linkedinUrl: b.linkedinUrl,
        linkedinPostId: b.linkedinPostId,
        linkedinStatus: b.linkedinStatus,
        images: {
          deleteMany: {},
          create: blogImages,
        },
      },
      create: {
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt,
        content: b.content,
        coverImage: b.coverImage,
        tags: b.tags,
        published: b.published,
        featured: b.featured,
        position: b.position,
        status: b.status as never,
        scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
        publishedAt: b.publishedAt ? new Date(b.publishedAt) : null,
        linkedinUrl: b.linkedinUrl,
        linkedinPostId: b.linkedinPostId,
        linkedinStatus: b.linkedinStatus,
        images: {
          create: blogImages,
        },
      },
    });
  }
  console.log(`[seed] ${blogs.length} detailed blogs with images upserted`);

  console.log('[seed] Done.');
}

main()
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
