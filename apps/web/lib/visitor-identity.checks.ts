import { afterEach, expect, test } from 'bun:test';
import { trackingVisitorId, visitorId } from './visitor-identity';

const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
afterEach(() => {
  for (const [key, descriptor] of [
    ['localStorage', storage],
    ['navigator', nav],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test('engagement and tracking share the persistent identity and acquisition lock', async () => {
  const values = new Map<string, string>();
  let locks = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      locks: {
        request: async (_key: string, callback: () => string) => {
          locks++;
          return callback();
        },
      },
    },
  });
  const [first, second] = await Promise.all([visitorId(), trackingVisitorId()]);
  expect(first).toBe(second!);
  expect(locks).toBe(2);
  expect(await trackingVisitorId()).toBe(first);
});

test('blocked persistence cannot generate countable reader identities', async () => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new Error('Blocked');
    },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {},
  });
  expect(await trackingVisitorId()).toBeUndefined();
  expect(await visitorId()).toBe(await visitorId());
});
