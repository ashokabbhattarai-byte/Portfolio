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

  const supa =
    process.env.SUPABASE_URL ?? 'https://vaxrgatdyazjvtugzstk.supabase.co';
  const bucket = process.env.SUPABASE_BUCKET ?? 'portfolio-storage';
  const coverBase = `${supa}/storage/v1/object/public/${bucket}`;
  const blogs = [
    {
      slug: 'hello-world',
      title: 'Hello, World — Why I Rebuilt My Portfolio',
      excerpt:
        'A short note on why I moved to a real CMS, Supabase, and TanStack Query for a portfolio that stays fast.',
      content:
        '# Hello, World\n\nI rebuilt my portfolio around a real content layer. The public site is still static when the API sleeps — but when it’s live, every project, skill, and now blog post comes from Postgres via Prisma, cached at the edge and hydrated with TanStack Query.\n\n## What changed\n\n- **One CMS** for projects, blogs, profile, experience, skills, education, certifications\n- **Supabase Storage** for images (bucket: portfolio-storage) with presigned uploads\n- **Next 16 + TanStack** with 5m stale, 30m gc, optimistic mutations\n\nThe hero, intro, and featured sections are no longer hardcoded. They read from the same SiteContent that powers /work and /blog.\n\n---\n\n*This post is seeded so you can see the blog flow end-to-end. Edit it in /admin/blogs.*',
      coverImage: `${coverBase}/blogs/hello-world/cover-hello-9c7fe8c6.webp`,
      tags: ['Portfolio', 'Next.js', 'Supabase'],
      published: true,
      featured: true,
      position: 0,
      status: 'PUBLISHED' as const,
      scheduledAt: null,
      publishedAt: new Date().toISOString(),
      linkedinUrl: 'https://www.linkedin.com/in/ashokabbhattaraii/',
      linkedinPostId: null,
      linkedinStatus: 'posted',
    },
    {
      slug: 'supabase-storage-at-the-edge',
      title: 'Supabase Storage at the Edge',
      excerpt:
        'How portfolio-storage stays fast: presigned PUTs, public CDN, and folder-scoped keys.',
      content:
        '# Supabase Storage at the Edge\n\nAll media lives in **portfolio-storage**.\n\n## Folder map\n\n- `projects/{slug}/cover-{uuid}.webp`\n- `blogs/{slug}/cover-{uuid}.webp`\n- `profile/`, `certifications/`, etc.\n\n## Upload flow\n\n1. **Presign** – `POST /api/storage/presign` returns a signedUrl (service_role).\n2. **PUT** – browser PUTs directly to Supabase (zero backend egress).\n3. **Public URL** – `.../object/public/portfolio-storage/{path}` is edge-cached and used in Next <Image> via remotePatterns.\n\nThe bucket is public (`bucket.policy.sql`) with RLS for public read / auth write.',
      coverImage: `${coverBase}/blogs/supabase-storage-at-the-edge/cover-storage-a1b2c3d4.webp`,
      tags: ['Supabase', 'Storage', 'Performance'],
      published: true,
      featured: true,
      position: 1,
      status: 'PUBLISHED' as const,
      scheduledAt: null,
      publishedAt: new Date().toISOString(),
      linkedinUrl: 'https://www.linkedin.com/in/ashokabbhattaraii/',
      linkedinPostId: null,
      linkedinStatus: 'posted',
    },
    {
      slug: 'tanstack-makes-it-instant',
      title: 'TanStack Makes It Instant',
      excerpt:
        'From 123 RSC requests to 5m cached queries — how TanStack keeps the CMS feeling local.',
      content:
        '# TanStack Makes It Instant\n\nThe public site fetches **SiteContent** in one round trip (`GET /api/content`) with `Cache-Control: public, s-maxage=60` and `ETag`.\n\nOn the admin, every resource has a dedicated hook: `useAdminProjects()`, `useAdminBlogs()`, etc., with `staleTime: 5m` and optimistic mutations for reorder/delete.\n\nAfter a write, `RevalidateService` purges the Next tag (`blogs`, `projects`, …) so the next hard navigation is fresh, but the current tab stays instant.\n\n---\n\n*Try it: reorder blogs in /admin/blogs and watch the homepage update after revalidation.*',
      coverImage: `${coverBase}/blogs/tanstack-makes-it-instant/cover-tanstack-e5f6a7b8.webp`,
      tags: ['TanStack', 'React Query', 'UX'],
      published: true,
      featured: true,
      position: 2,
      status: 'PUBLISHED' as const,
      scheduledAt: null,
      publishedAt: new Date().toISOString(),
      linkedinUrl: 'https://www.linkedin.com/in/ashokabbhattaraii/',
      linkedinPostId: null,
      linkedinStatus: 'posted',
    },
  ];

  for (const b of blogs) {
    const blogImages = [
      {
        url: b.coverImage!,
        alt: `${b.title} cover`,
        caption: `Cover for ${b.title}`,
        placement: 'COVER' as const,
        position: 0,
      },
      {
        url: b.coverImage!.replace('cover-', 'inline-'),
        alt: `${b.title} inline`,
        caption: `Inline illustration for ${b.title}`,
        placement: 'INLINE' as const,
        position: 1,
      },
      {
        url: b.coverImage!.replace('cover-', 'gallery-'),
        alt: `${b.title} gallery`,
        caption: `Gallery image for ${b.title}`,
        placement: 'GALLERY' as const,
        position: 2,
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
  console.log(`[seed] ${blogs.length} blogs with 3 images each upserted`);

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
