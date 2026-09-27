import { afterEach, expect, test } from 'bun:test';
import { recordPageView, TrackingError } from './track-page-view';
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const event = () => ({
  path: `/blog/${crypto.randomUUID()}`,
  visitorId: crypto.randomUUID(),
  eventId: crypto.randomUUID(),
});

test('50 rapid visits with different event IDs produce one POST', async () => {
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return Response.json({ ok: true, recorded: true });
  }) as typeof fetch;
  const payload = event();
  await Promise.all(
    Array.from({ length: 50 }, () =>
      recordPageView({ ...payload, eventId: crypto.randomUUID() }),
    ),
  );
  await recordPageView({ ...payload, eventId: crypto.randomUUID() });
  expect(calls).toBe(1);
  await recordPageView(event());
  expect(calls).toBe(2);
});

test('failed delivery can retry, while rate limiting cannot trigger an immediate retry', async () => {
  const payload = event();
  globalThis.fetch = (async () =>
    new Response('', { status: 503 })) as typeof fetch;
  await expect(recordPageView(payload)).rejects.toMatchObject({
    retryable: true,
  });
  globalThis.fetch = (async () =>
    Response.json({ ok: true, recorded: true })) as typeof fetch;
  expect((await recordPageView(payload)).recorded).toBe(true);
  globalThis.fetch = (async () =>
    new Response('', { status: 429 })) as typeof fetch;
  try {
    await recordPageView(event());
    throw new Error('Expected rejection');
  } catch (error) {
    expect(error).toBeInstanceOf(TrackingError);
    expect((error as TrackingError).retryable).toBe(false);
  }
});

test('reload cooldown uses session storage and expires after ten seconds', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'sessionStorage',
  );
  const payload = event();
  const key = `portfolio-view:${payload.visitorId}:${payload.path}`;
  const stored = new Map([
    [
      key,
      JSON.stringify({ at: Date.now(), result: { ok: true, recorded: true } }),
    ],
  ]);
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (name: string) => stored.get(name) ?? null,
      setItem: (name: string, value: string) => stored.set(name, value),
    },
  });
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    return Response.json({ ok: true, recorded: true });
  }) as typeof fetch;
  try {
    await recordPageView(payload);
    expect(calls).toBe(0);
    stored.set(
      key,
      JSON.stringify({ at: Date.now() - 11000, result: { ok: true } }),
    );
    await recordPageView(payload);
    expect(calls).toBe(1);
  } finally {
    if (descriptor)
      Object.defineProperty(globalThis, 'sessionStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
