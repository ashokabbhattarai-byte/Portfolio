import { afterEach, describe, expect, test } from 'bun:test';
import { PortfolioApiError, PortfolioClient } from '../src/client.js';
import { tools } from '../src/tools.js';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Replaces fetch and records what the client sent. */
function stub(
  status: number,
  body: unknown,
): { seen: () => { url: string; init: RequestInit } } {
  let captured: { url: string; init: RequestInit } | null = null;
  globalThis.fetch = (async (input: URL | string, init: RequestInit = {}) => {
    captured = { url: String(input), init };
    return new Response(body === undefined ? '' : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return { seen: () => captured! };
}

const client = () =>
  new PortfolioClient('https://portfolio.test/', 'pf_live_abc');

describe('portfolio client', () => {
  test('targets /api/v1/ai and sends the key as a bearer token', async () => {
    const probe = stub(200, { items: [] });
    await client().get('/blogs', { search: 'ai', page: 2, empty: '' });

    const { url, init } = probe.seen();
    expect(url).toBe('https://portfolio.test/api/v1/ai/blogs?search=ai&page=2');
    expect((init.headers as Record<string, string>).authorization).toBe(
      'Bearer pf_live_abc',
    );
  });

  test('surfaces the API error code so the model can act on it', async () => {
    stub(403, {
      error: {
        code: 'MISSING_SCOPE',
        message: 'This API key is missing the "blog:publish" scope.',
      },
    });
    const failure = await client()
      .post('/blogs/x/publish')
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(PortfolioApiError);
    const typed = failure as PortfolioApiError;
    expect(typed.code).toBe('MISSING_SCOPE');
    expect(typed.status).toBe(403);
    expect(typed.message).toContain('blog:publish');
  });

  test('flattens class-validator constraint arrays into one message', async () => {
    stub(400, {
      message: [
        'title must be longer than 2 characters',
        'excerpt should not be empty',
      ],
    });
    const failure = (await client()
      .post('/blogs')
      .catch((error: unknown) => error)) as PortfolioApiError;

    expect(failure.code).toBe('VALIDATION_FAILED');
    expect(failure.message).toBe(
      'title must be longer than 2 characters. excerpt should not be empty',
    );
  });

  test('reports an unreachable API rather than throwing a bare network error', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('connection refused');
    }) as typeof fetch;

    const failure = (await client()
      .get('/blogs')
      .catch((error: unknown) => error)) as PortfolioApiError;

    expect(failure.code).toBe('API_UNREACHABLE');
    expect(failure.message).toContain('PORTFOLIO_API_URL');
  });

  test('handles an empty body on delete', async () => {
    stub(204, undefined);
    expect(await client().delete('/media/x')).toBeNull();
  });
});

describe('tool definitions', () => {
  test('the documented tool set is exposed, with unique names', () => {
    const names = tools.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    for (const expected of [
      'list_blogs',
      'get_blog',
      'create_blog',
      'update_blog',
      'publish_blog',
      'schedule_blog',
      'unpublish_blog',
      'list_media',
      'generate_image',
      'attach_featured_image',
    ]) {
      expect(names).toContain(expected);
    }
  });

  test('every tool names the scope it needs', () => {
    for (const tool of tools) {
      expect(tool.description).toContain('scope');
      expect(tool.description.length).toBeGreaterThan(40);
      expect(Object.keys(tool.schema).length).toBeGreaterThan(0);
    }
  });

  test('create_blog states that it cannot publish', () => {
    const create = tools.find((tool) => tool.name === 'create_blog')!;
    expect(create.description).toContain('draft');
    expect(create.description).toContain('idempotencyKey');
  });

  test('schedule_blog spells out the offset requirement', () => {
    const schedule = tools.find((tool) => tool.name === 'schedule_blog')!;
    expect(schedule.description).toContain('+05:45');
  });
});
