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
    images: [],
  };
}
function service(row: ReturnType<typeof fixture>) {
  let written: Record<string, unknown> = {};
  let query: Record<string, unknown> = {};
  const prisma = {
    blog: {
      findUnique: async () => row,
      findMany: async (input: Record<string, unknown>) => {
        query = input;
        return [row];
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        written = data;
        return { ...row, ...data, images: [] };
      },
      create: async ({ data }: { data: Record<string, unknown> }) => {
        written = data;
        return { ...row, ...data, images: [] };
      },
    },
  };
  return {
    api: new BlogsService(prisma as never, { trigger() {} } as never),
    written: () => written,
    query: () => query,
  };
}
describe('blog publication lifecycle', () => {
  test('drafts and future schedules remain private; elapsed schedules can be read', async () => {
    for (const row of [
      fixture('DRAFT'),
      fixture('ARCHIVED'),
      fixture('SCHEDULED', new Date(Date.now() + 60000)),
    ]) {
      const { api } = service(row);
      await expect(api.getBySlug(row.slug)).rejects.toThrow('Blog not found');
      await expect(api.getById(row.id)).rejects.toThrow('Blog not found');
    }
    const { api, query } = service(
      fixture('SCHEDULED', new Date(Date.now() - 60000)),
    );
    expect((await api.getBySlug('fixture')).status).toBe('SCHEDULED');
    expect((await api.list()).length).toBe(1);
    expect(query().where).toHaveProperty('OR');
  });
  test('saving a published article preserves its publication date', async () => {
    const publishedAt = new Date('2026-01-01T00:00:00Z');
    const row = { ...fixture('PUBLISHED'), publishedAt };
    const { api, written } = service(row as never);
    await api.update(row.id, { status: 'PUBLISHED', title: 'Edited title' });
    expect(written().publishedAt).toEqual(publishedAt);
  });
  test('first publication gets a date and archiving disables publication', async () => {
    const { api, written } = service(fixture('DRAFT'));
    await api.update('fixture', { status: 'PUBLISHED' });
    expect(written().publishedAt).toBeInstanceOf(Date);
    expect(written().published).toBe(true);
    await api.update('fixture', { status: 'ARCHIVED' });
    expect(written().published).toBe(false);
  });
  test('draft status overrides a contradictory legacy published flag on creation', async () => {
    const { api, written } = service(fixture('DRAFT'));
    await api.create({
      ...fixture('DRAFT'),
      status: 'DRAFT',
      published: true,
    } as never);
    expect(written().published).toBe(false);
  });
});
