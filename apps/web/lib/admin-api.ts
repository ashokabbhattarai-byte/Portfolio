/**
 * Browser-side client for the NestJS API.
 *
 * The browser always talks to its own origin: `next.config.ts` rewrites
 * `/api/*` to Nest, so the auth cookies are first-party and there is no
 * preflight. Every call therefore uses a relative URL and `credentials:
 * 'include'`.
 *
 * Server components use `lib/admin-server.ts` instead; it forwards the
 * incoming cookie header and cannot refresh (a render may not set cookies).
 */
import type {
  Blog,
  Certification,
  Education,
  Experience,
  Profile,
  Project,
  Skill,
} from '@portfolio/types';
import { LOGIN_PATH, loginUrl } from './auth';

export class ApiError extends Error {
  readonly status: number;
  /** Field-level messages, when the API returns a validation envelope. */
  readonly fields: Record<string, string>;
  constructor(
    message: string,
    status: number,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

type Json = Record<string, unknown>;

function messageFrom(body: unknown, fallback: string): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    const message = (body as Json).message;
    if (typeof message === 'string' && message.trim()) return message;
    /* class-validator returns an array of constraint strings. */
    if (Array.isArray(message) && message.length) {
      return message.filter((line) => typeof line === 'string').join('. ');
    }
    const error = (body as Json).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}

function fieldsFrom(body: unknown): Record<string, string> {
  if (!body || typeof body !== 'object') return {};
  const errors = (body as Json).errors;
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors as Json)) {
    if (typeof value === 'string') out[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string')
      out[key] = value[0];
  }
  return out;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/* One refresh at a time. Ten widgets can 401 in the same tick — a reorder
   fires a PATCH per row — and they must all wait on the same rotation rather
   than racing to rotate the refresh token out from under each other. */
let inFlightRefresh: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  inFlightRefresh ??= fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { accept: 'application/json' },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      inFlightRefresh = null;
    });
  return inFlightRefresh;
}

function bounceToLogin(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (pathname === LOGIN_PATH) return;
  window.location.assign(loginUrl(pathname + search));
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the API. Check that it is running.', 0);
  }

  /* Access tokens are short-lived by design. Rotate once, replay the original
     request, and only then give up — `retried` makes a refresh loop
     impossible even if the API keeps answering 401 after a fresh cookie. */
  if (response.status === 401 && !retried) {
    if (await refreshSession()) return request<T>(path, options, true);
    bounceToLogin();
    throw new ApiError('Your session has expired. Sign in again.', 401);
  }

  const payload = await readBody(response);
  if (!response.ok) {
    throw new ApiError(
      messageFrom(payload, `Request failed (${response.status}).`),
      response.status,
      fieldsFrom(payload),
    );
  }
  return payload as T;
}

/** Ordered, positioned records: everything the CMS lists and reorders. */
export type Ordered = { id: string; position: number };

export type AdminResource<T extends Ordered> = {
  list(): Promise<T[]>;
  get(id: string): Promise<T>;
  create(input: Omit<T, 'id'>): Promise<T>;
  update(id: string, input: Partial<Omit<T, 'id'>>): Promise<T>;
  remove(id: string): Promise<void>;
  /** Writes `position` to match the given order. The API exposes plain CRUD,
   *  so ordering is a positional write per row rather than a bulk endpoint. */
  reorder(ids: string[]): Promise<void>;
};

function resource<T extends Ordered>(base: string): AdminResource<T> {
  return {
    list: () => request<T[]>(base),
    get: (id) => request<T>(`${base}/${encodeURIComponent(id)}`),
    create: (input) => request<T>(base, { method: 'POST', body: input }),
    update: (id, input) =>
      request<T>(`${base}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: input,
      }),
    remove: async (id) => {
      await request<void>(`${base}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    reorder: async (ids) => {
      await Promise.all(
        ids.map((id, index) =>
          request(`${base}/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: { position: index },
          }),
        ),
      );
    },
  };
}

export const adminApi = {
  projects: resource<Project>('/projects'),
  blogs: resource<Blog>('/blogs'),
  experience: resource<Experience>('/experience'),
  skills: resource<Skill>('/skills'),
  education: resource<Education>('/education'),
  certifications: resource<Certification>('/certifications'),
  analytics: {
    overview: (days: string = '30') =>
      request<import('@portfolio/types').PortfolioAnalytics>(
        `/analytics/overview?days=${encodeURIComponent(days)}`,
      ),
    blogs: (days: string = 'all') =>
      request<
        | import('@portfolio/types').BlogAnalytics[]
        | Array<{ blog: Blog; views: number; unique: number }>
      >(`/analytics/blogs?days=${encodeURIComponent(days)}`),
    blog: (id: string, days: string = '30') =>
      request<import('@portfolio/types').BlogAnalytics>(
        `/analytics/blogs/${encodeURIComponent(id)}?days=${encodeURIComponent(days)}`,
      ),
    routes: (days: string = '30') =>
      request<import('@portfolio/types').RoutesAnalytics>(
        `/analytics/routes?days=${encodeURIComponent(days)}`,
      ),
    route: (path: string, days: string = '30') =>
      request<import('@portfolio/types').RouteAnalytics>(
        `/analytics/route?path=${encodeURIComponent(path)}&days=${encodeURIComponent(days)}`,
      ),
  },
  profile: {
    get: () => request<Profile>('/profile'),
    update: (input: Profile) =>
      request<Profile>('/profile', { method: 'PATCH', body: input }),
  },
  auth: {
    /* Login and logout bypass `request` on purpose: a 401 here is the answer,
       not a stale token, so it must never trigger a refresh or a redirect. */
    async login(email: string, password: string): Promise<Response> {
      return fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    },
    async logout(everywhere = false): Promise<void> {
      await fetch(`/api/auth/${everywhere ? 'logout-all' : 'logout'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { accept: 'application/json' },
      }).catch(() => undefined);
    },
  },
};

export { readBody as readApiBody, messageFrom as apiMessage };
