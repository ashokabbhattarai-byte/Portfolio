import { expect, test } from 'bun:test';
import { ContentService } from '../src/content/content.service';

function fixture() {
  let reads = 0;
  let fail = false;
  let title = 'Original';
  let where: unknown;
  const empty = { findMany: async () => [] };
  const service = new ContentService({
    profile: {
      findUnique: async () => {
        reads++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        if (fail) throw new Error('offline');
        return { name: title, languages: 'English' };
      },
    },
    project: empty,
    experience: empty,
    skill: empty,
    education: empty,
    certification: empty,
    blog: {
      findMany: async (query: { where: unknown }) => {
        where = query.where;
        return [
          {
            id: 'published',
            title,
            status: 'PUBLISHED',
            published: true,
            seoTitle: 'Search title',
            noIndex: true,
            featuredImage: {
              id: 'media',
              url: 'https://example.com/cover.webp',
            },
            images: [],
            inlineMedia: [],
            ogImage: null,
            author: null,
            deletedAt: null,
          },
        ];
      },
    },
  } as never);
  return {
    service,
    reads: () => reads,
    where: () => where,
    rename: () => {
      title = 'Updated';
    },
    fail: (value: boolean) => {
      fail = value;
    },
  };
}

test('simultaneous full and partial content requests share one database read', async () => {
  const f = fixture();
  const result = await Promise.all([
    f.service.getSiteContent(),
    f.service.getSiteContent('blogs'),
    f.service.getSiteContent(),
  ]);
  expect(f.reads()).toBe(1);
  expect(result[0].blogs).toHaveLength(1);
  expect(result[1].projects).toBeUndefined();
  expect(f.where()).toEqual({
    deletedAt: null,
    status: 'PUBLISHED',
    published: true,
  });
  expect(result[0].blogs[0]).toMatchObject({
    seoTitle: 'Search title',
    noIndex: true,
    coverImage: 'https://example.com/cover.webp',
  });
});

test('completed reads do not mask subsequent content edits', async () => {
  const f = fixture();
  expect((await f.service.getSiteContent()).profile.name).toBe('Original');
  f.rename();
  expect((await f.service.getSiteContent()).profile.name).toBe('Updated');
  expect(f.reads()).toBe(2);
});

test('failed content reads release the shared request and can recover', async () => {
  const f = fixture();
  f.fail(true);
  const results = await Promise.allSettled([
    f.service.getSiteContent(),
    f.service.getSiteContent(),
  ]);
  expect(results.every((r) => r.status === 'rejected')).toBe(true);
  expect(f.reads()).toBe(1);
  f.fail(false);
  expect((await f.service.getSiteContent()).profile.name).toBe('Original');
});
