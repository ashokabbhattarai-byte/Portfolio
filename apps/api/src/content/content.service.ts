import { Injectable } from '@nestjs/common';
import type { BlogImagePlacement, SiteContent } from '@portfolio/types';
import { PrismaService } from '../prisma/prisma.service';

function toWireCategory(
  value: string,
): SiteContent['projects'][number]['category'] {
  if (value === 'AI') return 'AI';
  if (value === 'FULL_STACK') return 'Full stack';
  return 'Blockchain';
}

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // In-memory 5s coalesce – 10 concurrent SSR hits become 1 Prisma query.
  private cache: { at: number; data: SiteContent } | null = null;
  private readonly TTL_MS = 5_000;

  async getMeta(): Promise<{
    updatedAt: string | null;
    counts: Record<string, number>;
  }> {
    const site = await this.getSiteContent();
    const updatedAt = new Date().toISOString();
    return {
      updatedAt,
      counts: {
        projects: site.projects.length,
        blogs: site.blogs.length,
        experience: site.experience.length,
        skills: site.skills.length,
        education: site.education.length,
        certifications: site.certifications.length,
      },
    };
  }

  async getSiteContent(only?: string): Promise<SiteContent> {
    const now = Date.now();
    if (this.cache && now - this.cache.at < this.TTL_MS && !only)
      return this.cache.data;
    const full = await this.fetchAll();
    if (!only) this.cache = { at: now, data: full };
    if (!only) return full;
    const keys = new Set(
      only
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    // Return sparse SiteContent – caller requested subset for faster TTFB
    const out: Partial<SiteContent> & Pick<SiteContent, 'profile'> = {
      profile: full.profile,
    } as never;
    if (keys.has('projects')) (out as SiteContent).projects = full.projects;
    if (keys.has('blogs')) (out as SiteContent).blogs = full.blogs;
    if (keys.has('experience'))
      (out as SiteContent).experience = full.experience;
    if (keys.has('skills')) (out as SiteContent).skills = full.skills;
    if (keys.has('education')) (out as SiteContent).education = full.education;
    if (keys.has('certifications'))
      (out as SiteContent).certifications = full.certifications;
    // If no known keys, return full
    if (Object.keys(out).length === 1) return full;
    return out as SiteContent;
  }

  private async fetchAll(): Promise<SiteContent> {
    const [
      profileRow,
      projects,
      blogs,
      experience,
      skills,
      education,
      certifications,
    ] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: 'profile' } }),
      this.prisma.project.findMany({
        where: { published: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.blog.findMany({
        where: {
          OR: [
            { published: true, status: 'PUBLISHED' },
            { status: 'SCHEDULED', scheduledAt: { lte: new Date() } },
          ],
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: { images: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.experience.findMany({
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.skill.findMany({
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.education.findMany({
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.certification.findMany({
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    if (!profileRow) throw new Error('Profile not seeded');

    const profile: SiteContent['profile'] = {
      name: profileRow.name,
      role: profileRow.role,
      location: profileRow.location,
      email: profileRow.email,
      github: profileRow.github,
      linkedin: profileRow.linkedin,
      resume: profileRow.resume,
      description: profileRow.description,
      languages: profileRow.languages,
    };

    return {
      profile,
      projects: projects.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        category: toWireCategory(r.category as string),
        role: r.role,
        context: r.context,
        summary: r.summary,
        color: r.color,
        ink: r.ink,
        symbol: r.symbol,
        live: r.live,
        image: r.image,
        gallery: r.gallery,
        overview: r.overview,
        challenge: r.challenge,
        contribution: r.contribution,
        outcome: r.outcome,
        focus: r.focus,
        features: r.features,
        published: r.published,
        featured: r.featured,
        position: r.position,
      })),
      blogs: blogs
        .filter((r) => {
          if (r.status === 'SCHEDULED' && r.scheduledAt)
            return new Date(r.scheduledAt as Date) <= new Date();
          if (r.status === 'SCHEDULED' && !r.scheduledAt) return false;
          return r.status === 'PUBLISHED';
        })
        .map((r) => ({
          id: r.id,
          slug: r.slug,
          title: r.title,
          excerpt: r.excerpt,
          content: r.content,
          coverImage: r.coverImage,
          gallery: r.gallery,
          tags: r.tags,
          published: r.published,
          featured: r.featured,
          position: r.position,
          status: r.status as never,
          scheduledAt: r.scheduledAt
            ? (r.scheduledAt as Date).toISOString()
            : null,
          publishedAt: r.publishedAt
            ? (r.publishedAt as Date).toISOString()
            : null,
          linkedinUrl: r.linkedinUrl,
          linkedinPostId: r.linkedinPostId,
          linkedinStatus: r.linkedinStatus,
          images: ((r as never as { images: unknown[] }).images ?? []).map(
            (img) => {
              const im = img as Record<string, unknown>;
              return {
                id: im.id as string,
                blogId: im.blogId as string,
                url: im.url as string,
                alt: (im.alt as string | null) ?? null,
                caption: (im.caption as string | null) ?? null,
                placement: (im.placement as BlogImagePlacement) ?? 'INLINE',
                position: im.position as number,
              };
            },
          ),
          createdAt: r.createdAt
            ? (r.createdAt as Date).toISOString()
            : undefined,
          updatedAt: r.updatedAt
            ? (r.updatedAt as Date).toISOString()
            : undefined,
        })),
      experience: experience.map((r) => ({
        id: r.id,
        role: r.role,
        company: r.company,
        dates: r.dates,
        detail: r.detail,
        position: r.position,
      })),
      skills: skills.map((r) => ({
        id: r.id,
        name: r.name,
        items: r.items,
        position: r.position,
      })),
      education: education.map((r) => ({
        id: r.id,
        school: r.school,
        award: r.award,
        dates: r.dates,
        notes: r.notes,
        position: r.position,
      })),
      certifications: certifications.map((r) => ({
        id: r.id,
        title: r.title,
        issuer: r.issuer,
        date: r.date,
        url: r.url,
        position: r.position,
      })),
    };
  }
}
