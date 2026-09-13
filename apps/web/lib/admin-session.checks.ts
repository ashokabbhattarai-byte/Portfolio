import { expect, test, spyOn } from 'bun:test';
import { adminApi, ApiError } from './admin-api';
test('a refresh outage does not redirect or replay the original request', async () => {
  const calls: string[] = [];
  const fetcher = spyOn(globalThis, 'fetch').mockImplementation(
    async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ message: 'unavailable' }), {
        status: calls.length === 1 ? 401 : 503,
        headers: { 'content-type': 'application/json' },
      });
    },
  );
  try {
    let failure: unknown;
    try {
      await adminApi.profile.get();
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ApiError);
    expect((failure as ApiError).status).toBe(503);
    expect(calls).toEqual(['/api/profile', '/api/auth/refresh']);
    // A subsequent request can recover; the failed refresh is not cached.
    fetcher.mockImplementation(
      async () =>
        new Response(JSON.stringify({ name: 'Recovered' }), {
          headers: { 'content-type': 'application/json' },
        }),
    );
    expect((await adminApi.profile.get()).name).toBe('Recovered');
  } finally {
    fetcher.mockRestore();
  }
});
