/**
 * Centralised query keys. Grouped by resource so invalidations are cheap:
 *   qk.projects()           → ['projects']
 *   qk.project(id)          → ['projects', id]
 *   qk.siteContent          → ['siteContent']
 *   qk.siteContentPartial(['projects']) → ['siteContent', 'projects']
 */
export const qk = {
  siteContent: (only?: string[]) =>
    only && only.length
      ? (['siteContent', ...only.sort()] as const)
      : (['siteContent'] as const),
  projects: () => ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  blogs: () => ['blogs'] as const,
  blog: (id: string) => ['blogs', id] as const,
  profile: () => ['profile'] as const,
  experience: () => ['experience'] as const,
  skills: () => ['skills'] as const,
  education: () => ['education'] as const,
  certifications: () => ['certifications'] as const,
  auth: () => ['auth', 'me'] as const,
  storageList: (prefix: string) => ['storage', 'list', prefix] as const,
} as const;
