import type { PageResult, BlogSummary } from '@portfolio/types';
import { cache } from 'react';
/**
 * Server-side reads for the CMS.
 *
 * Server components cannot use the browser client: there is no ambient cookie
 * jar on a fetch from the Next server, and a render is not allowed to set
 * cookies, so it cannot rotate an expired token either. This variant forwards
 * the incoming request's cookie header straight through and treats a 401 as
 * "send them to the login form" — the browser client is the only place where
 * refresh-and-retry happens.
 *
 * It also calls the API origin directly rather than going back out through
 * Next's own `/api/*` rewrite, which would be a pointless round trip.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  AuthUser,
  Blog,
  Certification,
  Education,
  Experience,
  MediaAsset,
  Profile,
  Project,
  Skill,
} from '@portfolio/types';
import { loginUrl } from './auth';

const API_ORIGIN = (process.env.API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

/** The API may serialise these; the wire types do not promise them. */
export type Timestamped = { updatedAt?: string; createdAt?: string };

export type Fetched<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string };

async function cookieHeader(): Promise<string> {
  const jar = await cookies();
  return jar
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');
}

export async function serverGet<T>(path: string): Promise<Fetched<T>> {
  // Keep Next's request-context access outside network-error handling so its
  // dynamic-rendering signal is never mistaken for a database/API outage.
  const cookie = await cookieHeader();
  let response: Response;
  try {
    response = await fetch(`${API_ORIGIN}/api${path}`, {
      headers: { accept: 'application/json', cookie },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      message:
        'The Admin service is temporarily unavailable. Please retry shortly.',
    };
  }
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    let message = `The API answered ${response.status}.`;
    try {
      const body: unknown = text ? JSON.parse(text) : null;
      if (body && typeof body === 'object') {
        const value = (body as Record<string, unknown>).message;
        if (typeof value === 'string' && value.trim()) message = value;
      }
    } catch {
      /* Not JSON. The status line says enough. */
    }
    return { ok: false, status: response.status, message };
  }
  return { ok: true, data: (await response.json()) as T };
}

export const getSignedInUser = cache(async () => {
  const result = await serverGet<AuthUser>('/auth/me');
  if (!result.ok && result.status !== 401) {
    // Only invalid authentication redirects to login. All other failures are
    // caught by the Admin error boundary, without clearing session cookies.
    throw new Error(
      'The Admin service is temporarily unavailable. Please retry shortly.',
    );
  }
  return result;
});
export const getProjects = () =>
  serverGet<PageResult<Project & Timestamped>>('/projects/admin/search');
export const getProject = (id: string) =>
  serverGet<Project>(`/projects/${encodeURIComponent(id)}`);
export const getBlogs = () =>
  serverGet<PageResult<BlogSummary>>('/blogs/admin/search');
export const getBlog = (id: string) =>
  serverGet<Blog>(`/blogs/${encodeURIComponent(id)}`);
export const getProfile = () => serverGet<Profile & Timestamped>('/profile');
export const getExperience = () =>
  serverGet<PageResult<Experience & Timestamped>>('/experience/admin/search');
export const getSkills = () =>
  serverGet<PageResult<Skill & Timestamped>>('/skills/admin/search');
export const getEducation = () =>
  serverGet<PageResult<Education & Timestamped>>('/education/admin/search');
export const getCertifications = () =>
  serverGet<PageResult<Certification & Timestamped>>(
    '/certifications/admin/search',
  );
export const getMedia = () => serverGet<PageResult<MediaAsset>>('/media');

/** A 401 here means the cookie died between the proxy's check and this fetch,
 *  or the account was disabled. Either way the only cure is signing in again. */
export function redirectIfSignedOut(
  result: Fetched<unknown>,
  currentPath: string,
): void {
  if (!result.ok && result.status === 401) redirect(loginUrl(currentPath));
}

/**
 * Loads the signed-in user and the page's data concurrently.
 *
 * Awaiting the auth check first and the data second costs two serial round
 * trips — noticeable when the API and database are a long way off. Issuing
 * both at once is safe because the API authenticates every request on its own:
 * a data fetch made without a valid cookie just 401s, and the result is thrown
 * away when we redirect.
 */
export async function loadAdminPage<T>(
  currentPath: string,
  fetcher: () => Promise<Fetched<T>>,
): Promise<{ user: AuthUser; data: Fetched<T> }> {
  const [me, data] = await Promise.all([getSignedInUser(), fetcher()]);
  if (!me.ok) redirect(loginUrl(currentPath));
  redirectIfSignedOut(data, currentPath);
  return { user: me.data, data };
}
