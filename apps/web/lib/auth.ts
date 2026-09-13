/**
 * Auth constants and pure helpers shared by the proxy (edge of the request),
 * server components and the browser client. Deliberately dependency-free so
 * importing it from `proxy.ts` does not drag `next/headers` into that bundle,
 * and importing it from a client component does not ship `jose`.
 */

/** Names the API may use for the access cookie, best guess first. The proxy
 *  only reads it for a UX-level check; the API is the one that decides. */
export const ACCESS_COOKIE_NAMES = [
  'access_token',
  'accessToken',
  'portfolio_access',
] as const;

export const ADMIN_HOME = '/admin';
export const LOGIN_PATH = '/admin/login';

const ADMIN_PATH = /^\/admin(?:[/?#].*)?$/;
const LOGIN_ROUTE = /^\/admin\/login(?:[/?#]|$)/;

/* Backslashes, whitespace and control characters are all smuggling vectors for
   a browser's URL parser; none of them belong in an admin path. */
function smuggled(value: string): boolean {
  if (value.includes('\\')) return true;
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

/** Only bare, same-origin admin paths survive. Anything protocol-relative,
 *  smuggled, dot-segmented or pointing outside /admin collapses to the
 *  dashboard, so `?next=` can never become an open redirect. */
export function safeNext(value: string | null | undefined): string {
  if (!value) return ADMIN_HOME;
  if (smuggled(value)) return ADMIN_HOME;
  if (value.startsWith('//')) return ADMIN_HOME;
  // `..` resolves back out of /admin once the browser normalises the path.
  if (value.split(/[/?#]/).includes('..')) return ADMIN_HOME;
  if (!ADMIN_PATH.test(value)) return ADMIN_HOME;
  // Bouncing back to the login screen after logging in is a loop, not a next.
  if (LOGIN_ROUTE.test(value)) return ADMIN_HOME;
  return value;
}

export function loginUrl(next?: string | null): string {
  const target = safeNext(next);
  return target === ADMIN_HOME
    ? LOGIN_PATH
    : `${LOGIN_PATH}?next=${encodeURIComponent(target)}`;
}

export const adminSections = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/blogs', label: 'Blogs' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/ai/api-keys', label: 'AI keys' },
  { href: '/admin/ai/activity', label: 'Activity' },
  { href: '/admin/profile', label: 'Profile' },
  { href: '/admin/experience', label: 'Experience' },
  { href: '/admin/skills', label: 'Skills' },
  { href: '/admin/education', label: 'Education' },
  { href: '/admin/certifications', label: 'Certifications' },
] as const;
