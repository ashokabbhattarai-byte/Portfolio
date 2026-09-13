'use client';

/**
 * TanStack hooks grouped by resource. All queries share the same cache
 * defaults from makeQueryClient (5m stale, 30m gc) so the public portfolio
 * fetches SiteContent once and every page reuses it. Admin mutations
 * invalidate their resource key and trigger a revalidation of the
 * corresponding Next cache tag via the API's RevalidateService.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  Blog,
  Certification,
  Education,
  Experience,
  Project,
  SiteContent,
  Skill,
} from '@portfolio/types';
import { adminApi, ApiError } from '@/lib/admin-api';
import { qk } from './keys';

// ---------------------------------------------------------------------------
// Public – no credentials, uses the edge-cached /api/content
// ---------------------------------------------------------------------------
async function fetchSiteContent(only?: string[]): Promise<SiteContent> {
  const suffix = only && only.length ? `?only=${only.join(',')}` : '';
  const res = await fetch(`/api/content${suffix}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
    // Let Next's fetch cache handle revalidation; TanStack is the second layer
    cache: 'no-store',
  });
  if (!res.ok)
    throw new ApiError(`Site content fetch failed (${res.status})`, res.status);
  return (await res.json()) as SiteContent;
}

export function useSiteContent(
  only?: string[],
  options?: Omit<UseQueryOptions<SiteContent>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: qk.siteContent(only),
    queryFn: () => fetchSiteContent(only),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    ...options,
  });
}

export function usePublicProjects() {
  return useQuery({
    queryKey: qk.projects(),
    queryFn: () => fetchSiteContent(['projects']).then((c) => c.projects),
    staleTime: 1000 * 60 * 5,
  });
}

export function usePublicBlogs() {
  return useQuery({
    queryKey: qk.blogs(),
    queryFn: () => fetchSiteContent(['blogs']).then((c) => c.blogs),
    staleTime: 1000 * 60 * 5,
  });
}

// ---------------------------------------------------------------------------
// Admin – credentialed, uses adminApi (auto-refresh on 401)
// ---------------------------------------------------------------------------
export function useAdminProjects() {
  return useQuery({
    queryKey: qk.projects(),
    queryFn: () => adminApi.projects.list() as Promise<Project[]>,
  });
}

export function useAdminProfile() {
  return useQuery({
    queryKey: qk.profile(),
    queryFn: () => adminApi.profile.get(),
  });
}

export function useAdminExperience() {
  return useQuery({
    queryKey: qk.experience(),
    queryFn: () => adminApi.experience.list() as Promise<Experience[]>,
  });
}

export function useAdminSkills() {
  return useQuery({
    queryKey: qk.skills(),
    queryFn: () => adminApi.skills.list() as Promise<Skill[]>,
  });
}

export function useAdminEducation() {
  return useQuery({
    queryKey: qk.education(),
    queryFn: () => adminApi.education.list() as Promise<Education[]>,
  });
}

export function useAdminCertifications() {
  return useQuery({
    queryKey: qk.certifications(),
    queryFn: () => adminApi.certifications.list() as Promise<Certification[]>,
  });
}

export function useAdminBlogs() {
  return useQuery({
    queryKey: qk.blogs(),
    queryFn: () => adminApi.blogs.list() as Promise<Blog[]>,
  });
}

// ---------------------------------------------------------------------------
// Mutations – optimistic where safe, otherwise invalidate
// ---------------------------------------------------------------------------
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Project, 'id'>) =>
      adminApi.projects.create(input as never),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects() });
      qc.invalidateQueries({ queryKey: qk.siteContent() });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<Omit<Project, 'id'>>;
    }) => adminApi.projects.update(id, input as never),
    onMutate: async ({ id, input }) => {
      await qc.cancelQueries({ queryKey: qk.projects() });
      const prev = qc.getQueryData<Project[]>(qk.projects());
      if (prev)
        qc.setQueryData<Project[]>(
          qk.projects(),
          prev.map((p) => (p.id === id ? { ...p, ...input } : p)),
        );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.projects() });
      qc.invalidateQueries({ queryKey: qk.siteContent() });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.projects.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.projects() });
      const prev = qc.getQueryData<Project[]>(qk.projects());
      if (prev)
        qc.setQueryData(
          qk.projects(),
          prev.filter((p) => p.id !== id),
        );
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.projects() });
      qc.invalidateQueries({ queryKey: qk.siteContent() });
    },
  });
}

export function useReorderProjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => adminApi.projects.reorder(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: qk.projects() });
      const prev = qc.getQueryData<Project[]>(qk.projects());
      if (prev) {
        const map = new Map(prev.map((p) => [p.id, p]));
        qc.setQueryData(
          qk.projects(),
          ids
            .map((id, idx) => ({ ...map.get(id)!, position: idx }) as Project)
            .filter(Boolean),
        );
      }
      return { prev };
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.projects(), ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.projects() });
      qc.invalidateQueries({ queryKey: qk.siteContent() });
    },
  });
}

// Generic resource mutations (experience/skills/education/certifications/profile)
function resourceMutations<T extends { id: string }>(
  key: readonly unknown[],
  api: {
    create: (x: Omit<T, 'id'>) => Promise<T>;
    update: (id: string, x: Partial<Omit<T, 'id'>>) => Promise<T>;
    remove: (id: string) => Promise<void>;
    reorder: (ids: string[]) => Promise<void>;
  },
) {
  return {
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (input: Omit<T, 'id'>) => api.create(input),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: key });
          qc.invalidateQueries({ queryKey: qk.siteContent() });
        },
      });
    },
    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: ({
          id,
          input,
        }: {
          id: string;
          input: Partial<Omit<T, 'id'>>;
        }) => api.update(id, input),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: key });
          qc.invalidateQueries({ queryKey: qk.siteContent() });
        },
      });
    },
    useDelete: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: (id: string) => api.remove(id),
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: key });
          qc.invalidateQueries({ queryKey: qk.siteContent() });
        },
      });
    },
  };
}

export const experienceMutations = resourceMutations<Experience>(
  qk.experience(),
  adminApi.experience as never,
);
export const skillsMutations = resourceMutations<Skill>(
  qk.skills(),
  adminApi.skills as never,
);
export const educationMutations = resourceMutations<Education>(
  qk.education(),
  adminApi.education as never,
);
export const certificationsMutations = resourceMutations<Certification>(
  qk.certifications(),
  adminApi.certifications as never,
);
export const blogsMutations = resourceMutations<Blog>(
  qk.blogs(),
  adminApi.blogs as never,
);

// Analytics — 1m stale, admin-only — default 30d, filter to all time via ?days=all
export type AnalyticsDays = '7' | '30' | '90' | 'all';

export function useAnalyticsOverview(days: AnalyticsDays = '30') {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: () => adminApi.analytics.overview(days),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsBlog(id: string, days: AnalyticsDays = '30') {
  return useQuery({
    queryKey: ['analytics', 'blog', id, days],
    queryFn: () => adminApi.analytics.blog(id, days),
    enabled: !!id,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useAnalyticsRoutes(days: AnalyticsDays = '30') {
  return useQuery({
    queryKey: ['analytics', 'routes', days],
    queryFn: () => adminApi.analytics.routes(days),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAnalyticsRoute(path: string, days: AnalyticsDays = '30') {
  return useQuery({
    queryKey: ['analytics', 'route', path, days],
    queryFn: () => adminApi.analytics.route(path, days),
    enabled: !!path,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}
