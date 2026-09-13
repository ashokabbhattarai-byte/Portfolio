import { cache } from 'react';
import {
  contentTags,
  type Blog,
  type Certification,
  type ContentTag,
  type Education,
  type Experience,
  type Profile,
  type Project,
  type SiteContent,
  type Skill,
} from '@portfolio/types';
import {
  certifications,
  education,
  experience,
  profile,
  skills,
} from '@/content/profile';
import { projects } from '@/content/projects';
/* Server-only. The browser never reaches the API directly — it calls /api on
   its own origin and next.config.ts rewrites. */
const apiUrl = process.env.API_URL ?? 'http://localhost:4000';
/* The committed content is the floor, not a placeholder: a dead API degrades
   the site to the last deployed copy instead of taking it offline. */
const committed: SiteContent = {
  profile,
  projects,
  blogs: [],
  experience,
  skills,
  education,
  certifications,
};
async function load<T>(
  path: string,
  tags: readonly ContentTag[],
): Promise<T | null> {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      next: { tags: [...tags], revalidate: tags.includes('blogs') ? 60 : 3600 },
      /* Node's fetch has no default timeout, so an API that accepts the
         connection and then hangs would stall the build rather than fall
         through to the committed content. */
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    console.warn(
      `[content] ${apiUrl}${path} unavailable — serving committed content:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
const ordered = <T extends { position: number }>(items: T[]) =>
  [...items].sort((a, b) => a.position - b.position);
/* A missing key means the API did not send that resource; an empty array means
   the CMS genuinely has none of it. Only the former falls back. */
const list = <T>(value: unknown, committedValue: T[]) =>
  Array.isArray(value) ? (value as T[]) : committedValue;
/** One round trip per render; every other getter reads from this. */
export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const data = await load<Partial<SiteContent>>('/api/content', contentTags);
  if (!data) return committed;
  return {
    profile: data.profile ?? committed.profile,
    projects: ordered(list(data.projects, committed.projects)).filter(
      (project) => project.published,
    ),
    blogs: ordered(list(data.blogs, committed.blogs)).filter(
      (b) =>
        (b.published && b.status === 'PUBLISHED') ||
        (b.status === 'SCHEDULED' &&
          b.scheduledAt &&
          new Date(b.scheduledAt) <= new Date()),
    ),
    experience: ordered(list(data.experience, committed.experience)),
    skills: ordered(list(data.skills, committed.skills)),
    education: ordered(list(data.education, committed.education)),
    certifications: ordered(
      list(data.certifications, committed.certifications),
    ),
  };
});
export const getProfile = async (): Promise<Profile> =>
  (await getSiteContent()).profile;
export const getProjects = async (): Promise<Project[]> =>
  (await getSiteContent()).projects;
export const getBlogs = async (): Promise<Blog[]> =>
  (await getSiteContent()).blogs;
export const getExperience = async (): Promise<Experience[]> =>
  (await getSiteContent()).experience;
export const getSkills = async (): Promise<Skill[]> =>
  (await getSiteContent()).skills;
export const getEducation = async (): Promise<Education[]> =>
  (await getSiteContent()).education;
export const getCertifications = async (): Promise<Certification[]> =>
  (await getSiteContent()).certifications;
/* The listing is already in hand, so the per-slug endpoint is only consulted
   when the slug is not in it — a project the listing omitted rather than one
   that does not exist. */
export const getProject = cache(
  async (slug: string): Promise<Project | undefined> => {
    const known = (await getSiteContent()).projects.find(
      (project) => project.slug === slug,
    );
    if (known) return known;
    const direct = await load<Project>(
      `/api/projects/${encodeURIComponent(slug)}`,
      ['projects'],
    );
    return direct ?? undefined;
  },
);
export const getBlog = cache(
  async (slug: string): Promise<Blog | undefined> => {
    const known = (await getSiteContent()).blogs.find((b) => b.slug === slug);
    if (known) return known;
    const direct = await load<Blog>(`/api/blogs/${encodeURIComponent(slug)}`, [
      'blogs',
    ]);
    return direct ?? undefined;
  },
);
