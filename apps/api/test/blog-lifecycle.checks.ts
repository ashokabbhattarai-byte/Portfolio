import { describe, expect, test } from 'bun:test';
import { BlogsService } from '../src/blogs/blogs.service';

function fixture(status: string, scheduledAt: Date | null = null) {
  return {
    id: 'fixture',
    slug: 'fixture',
    title: 'Fixture article',
    excerpt: 'An example article summary.',
    content: 'Example article content for a test.',
    tags: [],
    position: 0,
    featured: false,
    status,
    scheduledAt,
    published: status === 'PUBLISHED',
    publishedAt: null,
    version: 1,
    deletedAt: null,
    images: [],
    inlineMedia: [],
    featuredImage: null,
    ogImage: null,
    author: null,
  };
}

/**
 * In-memory Prisma double. BlogsService writes through `$transaction` and
 * takes row locks with `$queryRaw`, so the double has to provide both — a
 * stub that only implements `blog.*` no longer reaches the write at all.
 */
function service(row: ReturnType<typeof fixture>) {
  let written: Record<string, unknown> = {};
  let query: Record<string, unknown> = {};
  const audits: string[] = [];

  const client = {
    blog: {
      findUnique: async () => row,
      /* Honours the where clause, so the visibility filters the service builds
         are actually exercised rather than assumed. The double holds one row,
         so slug/id always match. */
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const matches = Object.entries(where).every(([key, value]) =>
          key === 'slug' || key === 'id'
            ? true
            : (row as Record<string, unknown>)[key] === value,
        );
        return matches ? row : null;
      },
      findUniqueOrThrow: async () => row,
      findMany: async (input: Record<string, unknown>) => {
        query = input;
        return [row];
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        written = data;
        return { ...row, ...data, images: [], inlineMedia: [] };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        written = data;
        return { ...row, ...data, images: [], inlineMedia: [] };
      },
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        written = data;
        return { count: 1 };
      },
    },
    tag: { upsert: async ({ create }: { create: unknown }) => create },
    mediaAsset: { findMany: async () => [] },
    blogRevision: { create: async () => ({}) },
    blogPreview: { updateMany: async () => ({ count: 0 }) },
    publishingRequest: {
      findUnique: async () => null,
      create: async () => ({}),
    },
    auditEvent: {
      create: async ({ data }: { data: { action: string } }) => {
        audits.push(data.action);
        return data;
      },
    },
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
  };

  const prisma = {
    ...client,
    $transaction: async <T>(fn: (tx: typeof client) => Promise<T>) =>
      fn(client),
  };

  return {
    api: new BlogsService(prisma as never, { trigger() {} } as never),
    written: () => written,
    query: () => query,
    audits: () => audits,
  };
}

const actor = {
  type: 'ADMIN' as const,
  id: 'admin-1',
  correlationId: 'corr-1',
};

describe('blog publication lifecycle', () => {
  /* Anything that is not PUBLISHED is private, including a schedule whose time
     has already passed: the scheduler flipping the row to PUBLISHED is what
     makes it readable, so there is exactly one definition of "public". */
  test('only published articles are readable without admin rights', async () => {
    for (const status of ['DRAFT', 'ARCHIVED', 'UNPUBLISHED', 'REVIEW']) {
      const { api } = service(fixture(status));
      expect(await api.getBySlug('fixture').catch(() => 'hidden')).toBe(
        'hidden',
      );
      expect(await api.getById('fixture').catch(() => 'hidden')).toBe('hidden');
    }
    for (const scheduledAt of [
      new Date(Date.now() + 60_000),
      new Date(Date.now() - 60_000),
    ]) {
      const { api } = service(fixture('SCHEDULED', scheduledAt));
      expect(await api.getBySlug('fixture').catch(() => 'hidden')).toBe(
        'hidden',
      );
    }
  });

  test('the public listing filters on published status, the admin listing does not', async () => {
    const publicSide = service(fixture('PUBLISHED'));
    await publicSide.api.list();
    expect(publicSide.query().where).toMatchObject({
      deletedAt: null,
      status: 'PUBLISHED',
      published: true,
    });

    const adminSide = service(fixture('DRAFT'));
    await adminSide.api.list(true);
    expect(adminSide.query().where).toEqual({ deletedAt: null });
  });

  test('saving a published article preserves its publication date', async () => {
    const publishedAt = new Date('2026-01-01T00:00:00Z');
    const row = { ...fixture('PUBLISHED'), publishedAt };
    const { api, written } = service(row as never);
    await api.update(
      row.id,
      { status: 'PUBLISHED', title: 'Edited title' },
      actor,
    );
    expect(written().publishedAt).toEqual(publishedAt);
  });

  test('first publication gets a date and archiving disables publication', async () => {
    const { api, written } = service(fixture('DRAFT'));
    await api.update('fixture', { status: 'PUBLISHED' }, actor);
    expect(written().publishedAt).toBeInstanceOf(Date);
    expect(written().published).toBe(true);

    const archived = service(fixture('PUBLISHED'));
    await archived.api.update('fixture', { status: 'ARCHIVED' }, actor);
    expect(archived.written().published).toBe(false);
  });

  test('draft status overrides a contradictory legacy published flag on creation', async () => {
    const { api, written } = service(fixture('DRAFT'));
    await api.create(
      {
        title: 'Fixture article',
        slug: 'fixture',
        excerpt: 'An example article summary.',
        content: 'Example article content for a test.',
        tags: [],
        status: 'DRAFT',
        published: true,
      },
      actor,
    );
    expect(written().published).toBe(false);
    expect(written().status).toBe('DRAFT');
  });

  test('scheduling requires a future instant carrying a timezone offset', async () => {
    const { api } = service(fixture('DRAFT'));
    for (const scheduledAt of [
      new Date(Date.now() - 60_000).toISOString(), // past
      '2030-01-01T10:00:00', // no offset — ambiguous
      'not-a-date',
    ]) {
      await expect(
        api.update('fixture', { status: 'SCHEDULED', scheduledAt }, actor),
      ).rejects.toThrow('future ISO 8601 time');
    }
  });

  test('publishing an article that is too thin is refused', async () => {
    const thin = { ...fixture('DRAFT'), excerpt: 'short', content: 'tiny' };
    const { api } = service(thin);
    await expect(
      api.update('fixture', { status: 'PUBLISHED' }, actor),
    ).rejects.toThrow('Publishing requires');
  });

  test('a stale expectedVersion is rejected rather than overwriting', async () => {
    const { api } = service({ ...fixture('DRAFT'), version: 4 });
    await expect(
      api.update('fixture', { title: 'Edited', expectedVersion: 2 }, actor),
    ).rejects.toThrow('changed elsewhere');
  });

  test('every write records an audit event', async () => {
    const { api, audits } = service(fixture('DRAFT'));
    await api.update('fixture', { title: 'Edited title' }, actor);
    expect(audits()).toContain('BLOG_UPDATED');
  });
});
