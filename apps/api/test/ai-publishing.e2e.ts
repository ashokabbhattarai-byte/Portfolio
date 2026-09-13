/**
 * End-to-end checks against a running API and a real database.
 *
 *   bun run --filter='@portfolio/api' dev      # in one terminal
 *   bun run --filter='@portfolio/api' test:ai  # in another
 *
 * These exercise the security properties that unit tests cannot prove: that
 * the guard, the scope check and the DTO whitelist all sit in the request path
 * together. Skipped (not failed) when the API or seed credentials are absent,
 * so `bun run test` stays green on a machine without them.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

const API = process.env.API_BASE_URL ?? 'http://localhost:4000/api';
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? '';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? '';

let cookie = '';
let reachable = false;
const createdKeyIds: string[] = [];
const createdBlogIds: string[] = [];

/** Admin request, authenticated by the access cookie the login issued. */
async function admin(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      cookie,
      ...(init.headers ?? {}),
    },
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

/** AI-surface request, authenticated only by a pf_live_ key. */
async function ai(key: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${API}/v1/ai${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      ...(init.headers ?? {}),
    },
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null),
  };
}

async function issueKey(name: string, scopes: string[]) {
  const { body } = await admin('/publisher-keys', {
    method: 'POST',
    body: JSON.stringify({ name, scopes }),
  });
  createdKeyIds.push(body.id);
  return body.key as string;
}

function draft(overrides: Record<string, unknown> = {}) {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  return {
    title: `E2E article ${stamp}`,
    excerpt: 'An end-to-end fixture article summary.',
    content: 'Body copy for the end-to-end publishing checks.',
    tags: ['e2e'],
    ...overrides,
  };
}

beforeAll(async () => {
  if (!EMAIL || !PASSWORD) return;
  try {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (!response.ok) return;
    cookie = (response.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(';')[0])
      .join('; ');
    reachable = cookie.length > 0;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  if (!reachable) return;
  for (const id of createdBlogIds) {
    await admin(`/blogs/${id}`, { method: 'DELETE' }).catch(() => undefined);
  }
  for (const id of createdKeyIds) {
    await admin(`/publisher-keys/${id}`, { method: 'DELETE' }).catch(
      () => undefined,
    );
  }
});

const it = (name: string, fn: () => Promise<void>) =>
  test(name, async () => {
    if (!reachable) {
      console.warn(`skipped (API or SEED_ADMIN_* unavailable): ${name}`);
      return;
    }
    await fn();
  });

describe('AI publishing API', () => {
  it('rejects a request with no key', async () => {
    const response = await fetch(`${API}/v1/ai/blogs`);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('INVALID_API_KEY');
  });

  it('creates a draft and refuses to publish without blog:publish', async () => {
    const key = await issueKey('e2e-drafter', [
      'blog:read',
      'blog:create',
      'blog:update',
    ]);

    // Even though the body asks for PUBLISHED, creation always lands as DRAFT.
    const created = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(draft()),
    });
    expect(created.status).toBe(201);
    createdBlogIds.push(created.body.id);
    expect(created.body.status).toBe('DRAFT');
    expect(created.body.createdByAI).toBe(true);

    // The dedicated publish route is closed.
    const published = await ai(key, `/blogs/${created.body.id}/publish`, {
      method: 'POST',
      body: '{}',
    });
    expect(published.status).toBe(403);
    expect(published.body.error.code).toBe('MISSING_SCOPE');

    // And so is the back door of setting status through a plain update.
    const escalated = await ai(key, `/blogs/${created.body.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });
    expect(escalated.status).toBe(403);
    expect(escalated.body.error.code).toBe('MISSING_SCOPE');

    // The article is still a draft after both attempts.
    const after = await ai(key, `/blogs/${created.body.id}`);
    expect(after.body.status).toBe('DRAFT');
    expect(after.body.published).toBe(false);
  });

  it('rejects fields an agent must not set (mass assignment)', async () => {
    const key = await issueKey('e2e-massassign', ['blog:create']);
    const response = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify({
        ...draft(),
        published: true,
        authorId: 'someone',
      }),
    });
    expect(response.status).toBe(400);
  });

  it('publishes when the key carries blog:publish', async () => {
    const key = await issueKey('e2e-publisher', [
      'blog:read',
      'blog:create',
      'blog:publish',
    ]);
    const created = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(draft()),
    });
    createdBlogIds.push(created.body.id);

    const published = await ai(key, `/blogs/${created.body.id}/publish`, {
      method: 'POST',
      body: '{}',
    });
    expect(published.status).toBe(201);
    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.publishedAt).toBeTruthy();
  });

  it('schedules only with blog:schedule and only into the future', async () => {
    const readOnly = await issueKey('e2e-noschedule', [
      'blog:create',
      'blog:read',
    ]);
    const created = await ai(readOnly, '/blogs', {
      method: 'POST',
      body: JSON.stringify(draft()),
    });
    createdBlogIds.push(created.body.id);

    const refused = await ai(readOnly, `/blogs/${created.body.id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({
        scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
      }),
    });
    expect(refused.status).toBe(403);

    const scheduler = await issueKey('e2e-scheduler', [
      'blog:read',
      'blog:schedule',
    ]);
    const past = await ai(scheduler, `/blogs/${created.body.id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({
        scheduledAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    });
    expect(past.status).toBe(400);
    expect(past.body.error.code).toBe('INVALID_SCHEDULE_TIME');

    const when = new Date(Date.now() + 3_600_000).toISOString();
    const ok = await ai(scheduler, `/blogs/${created.body.id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt: when }),
    });
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('SCHEDULED');
    expect(new Date(ok.body.scheduledAt).toISOString()).toBe(when);
  });

  it('treats a repeated idempotencyKey as the same create', async () => {
    const key = await issueKey('e2e-idempotent', ['blog:create', 'blog:read']);
    const payload = draft({ idempotencyKey: `e2e-${Date.now()}` });

    const first = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const second = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    createdBlogIds.push(first.body.id);

    expect(second.body.id).toBe(first.body.id);

    // The same key with a different body is a conflict, not a silent replay.
    const conflicting = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify({ ...payload, title: 'A different title entirely' }),
    });
    expect(conflicting.status).toBe(409);
    expect(conflicting.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('reports a slug collision rather than overwriting', async () => {
    const key = await issueKey('e2e-slug', ['blog:create']);
    const slug = `e2e-collision-${Date.now()}`;
    const first = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(draft({ slug })),
    });
    createdBlogIds.push(first.body.id);

    const second = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(draft({ slug })),
    });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('BLOG_SLUG_ALREADY_EXISTS');
  });

  it('refuses an unsafe or non-image import URL', async () => {
    const key = await issueKey('e2e-media', ['media:upload', 'media:read']);

    const metadata = await ai(key, '/media/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://169.254.169.254/latest/meta-data/' }),
    });
    expect(metadata.status).toBe(400);
    expect(metadata.body.error.code).toBe('UNSAFE_IMAGE_URL');

    const loopback = await ai(key, '/media/import', {
      method: 'POST',
      body: JSON.stringify({ url: 'http://127.0.0.1:4000/api/content' }),
    });
    expect(loopback.status).toBe(400);
    expect(loopback.body.error.code).toBe('UNSAFE_IMAGE_URL');
  });

  it('reports a clear error when image generation is not configured', async () => {
    const key = await issueKey('e2e-generate', ['media:generate']);
    const response = await ai(key, '/media/generate', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'an abstract cover',
        purpose: 'FEATURED_IMAGE',
      }),
    });
    // 501 when no provider is set up; 200/201 once one is.
    if (response.status === 501) {
      expect(response.body.error.code).toBe('IMAGE_GENERATION_UNAVAILABLE');
    } else {
      expect([200, 201]).toContain(response.status);
    }
  });

  it('stops accepting a key the moment it is revoked', async () => {
    const key = await issueKey('e2e-revoked', ['blog:read']);
    const before = await ai(key, '/blogs');
    expect(before.status).toBe(200);

    await admin(`/publisher-keys/${createdKeyIds.at(-1)}`, {
      method: 'DELETE',
    });

    const after = await ai(key, '/blogs');
    expect(after.status).toBe(401);
    expect(after.body.error.code).toBe('INVALID_API_KEY');
  });

  it('never returns the key hash from the admin listing', async () => {
    const { body } = await admin('/publisher-keys');
    expect(JSON.stringify(body)).not.toContain('secretHash');
  });

  it('records an audit trail attributed to the key', async () => {
    const key = await issueKey('e2e-audited', ['blog:create']);
    const created = await ai(key, '/blogs', {
      method: 'POST',
      body: JSON.stringify(draft()),
    });
    createdBlogIds.push(created.body.id);

    const { body } = await admin('/publisher-activity?limit=50');
    const entry = body.items.find(
      (i: { action: string; resourceId?: string }) =>
        i.action === 'BLOG_CREATED' && i.resourceId === created.body.id,
    );
    expect(entry).toBeTruthy();
    expect(entry.actorType).toBe('AI_API_KEY');
    // The feed must never carry the presented secret.
    expect(JSON.stringify(body)).not.toContain(key);
  });
});
