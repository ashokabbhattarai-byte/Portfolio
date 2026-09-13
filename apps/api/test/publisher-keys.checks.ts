import { describe, expect, test } from 'bun:test';
import {
  hashSecret,
  PublisherKeysService,
} from '../src/publishing/publisher-keys.service';
import { STATUS_SCOPE, SCOPES, isScope } from '../src/publishing/scopes';

type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  secretHash: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  createdBy: string;
};

/** In-memory stand-in for the two tables the service touches. Mirrors the
 *  shapes Prisma returns rather than the client's full surface. */
function harness(seed: KeyRow[] = []) {
  const keys = [...seed];
  const audit: { action: string; resourceId?: string; metadata?: unknown }[] =
    [];
  const tx = {
    publisherKey: {
      create: async ({ data }: { data: Omit<KeyRow, 'id'> }) => {
        const row = { id: `key-${keys.length + 1}`, ...data } as KeyRow;
        keys.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) =>
        keys.find((k) => k.id === where.id) ?? null,
      findFirst: async ({ where }: { where: { prefix: string } }) =>
        keys.find((k) => k.prefix === where.prefix) ?? null,
      findMany: async () => [...keys],
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<KeyRow>;
      }) => {
        const row = keys.find((k) => k.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
    },
    auditEvent: {
      create: async ({
        data,
      }: {
        data: { action: string; resourceId?: string; metadata?: unknown };
      }) => {
        audit.push(data);
        return data;
      },
    },
  };
  const prisma = {
    ...tx,
    $transaction: async <T>(fn: (client: typeof tx) => Promise<T>) => fn(tx),
  };
  return {
    service: new PublisherKeysService(prisma as never),
    keys,
    audit,
  };
}

const actor = {
  type: 'ADMIN' as const,
  id: 'admin-1',
  correlationId: 'corr-1',
};

describe('publisher API keys', () => {
  test('issues a pf_live_ key, returns it once, and stores only a hash', async () => {
    const { service, keys, audit } = harness();
    const issued = await service.create(
      { name: 'Codex', scopes: ['blog:read', 'blog:create'] },
      actor,
    );

    expect(issued.key).toMatch(/^pf_live_[0-9a-f]{8}[A-Za-z0-9_-]{43}$/);
    expect(issued.prefix).toHaveLength(8);

    const stored = keys[0];
    // The plaintext must appear nowhere in the persisted row.
    expect(JSON.stringify(stored)).not.toContain(issued.key);
    expect(stored.secretHash).not.toContain(issued.key);
    expect(stored.secretHash).toBe(
      hashSecret(issued.key.slice(`pf_live_${issued.prefix}`.length)),
    );
    expect(audit.map((a) => a.action)).toContain('API_KEY_CREATED');
  });

  test('listing never exposes the stored hash', async () => {
    const { service } = harness();
    await service.create({ name: 'Codex', scopes: ['blog:read'] }, actor);
    const listed = await service.list();
    expect(JSON.stringify(listed)).not.toContain('secretHash');
    expect(listed[0]).not.toHaveProperty('secretHash');
  });

  test('authenticates a valid key and reports its scopes', async () => {
    const { service } = harness();
    const issued = await service.create(
      { name: 'Codex', scopes: ['blog:read', 'media:upload'] },
      actor,
    );
    const resolved = await service.authenticate(issued.key);
    expect(resolved.scopes).toEqual(['blog:read', 'media:upload']);
  });

  test('rejects malformed, unknown and tampered keys', async () => {
    const { service } = harness();
    const issued = await service.create(
      { name: 'K', scopes: ['blog:read'] },
      actor,
    );

    await expect(service.authenticate('nonsense')).rejects.toThrow('malformed');
    await expect(
      service.authenticate(`pf_live_${'0'.repeat(8)}${'A'.repeat(43)}`),
    ).rejects.toThrow('not recognised');

    // Same prefix, wrong secret: must fail the constant-time compare.
    const tampered = `${issued.key.slice(0, 16)}${issued.key
      .slice(16)
      .replace(/^./, (c) => (c === 'A' ? 'B' : 'A'))}`;
    await expect(service.authenticate(tampered)).rejects.toThrow(
      'not recognised',
    );
  });

  test('a revoked key stops authenticating', async () => {
    const { service, keys } = harness();
    const issued = await service.create(
      { name: 'K', scopes: ['blog:read'] },
      actor,
    );
    await service.revoke(keys[0].id, actor);
    await expect(service.authenticate(issued.key)).rejects.toThrow('revoked');
  });

  test('an expired key stops authenticating', async () => {
    const { service, keys } = harness();
    const issued = await service.create(
      { name: 'K', scopes: ['blog:read'] },
      actor,
    );
    keys[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.authenticate(issued.key)).rejects.toThrow('expired');
  });

  test('expiry must be in the future', async () => {
    const { service } = harness();
    await expect(
      service.create(
        {
          name: 'K',
          scopes: ['blog:read'],
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        },
        actor,
      ),
    ).rejects.toThrow('future');
  });

  test('rotation invalidates the previous secret and issues a new one', async () => {
    const { service, keys } = harness();
    const first = await service.create(
      { name: 'K', scopes: ['blog:read'] },
      actor,
    );
    const second = await service.rotate(keys[0].id, {}, actor);

    expect(second.key).not.toBe(first.key);
    await expect(service.authenticate(first.key)).rejects.toThrow();
    const resolved = await service.authenticate(second.key);
    expect(resolved.scopes).toEqual(['blog:read']);
  });

  test('a revoked key cannot be rotated back into service', async () => {
    const { service, keys } = harness();
    await service.create({ name: 'K', scopes: ['blog:read'] }, actor);
    await service.revoke(keys[0].id, actor);
    await expect(service.rotate(keys[0].id, {}, actor)).rejects.toThrow(
      'revoked',
    );
  });

  test('revocation is idempotent', async () => {
    const { service, keys } = harness();
    await service.create({ name: 'K', scopes: ['blog:read'] }, actor);
    const once = await service.revoke(keys[0].id, actor);
    const twice = await service.revoke(keys[0].id, actor);
    expect(twice.revokedAt).toEqual(once.revokedAt);
  });
});

describe('scope vocabulary', () => {
  test('publishing statuses map to the scope that authorises them', () => {
    expect(STATUS_SCOPE.PUBLISHED).toBe('blog:publish');
    expect(STATUS_SCOPE.SCHEDULED).toBe('blog:schedule');
    expect(STATUS_SCOPE.UNPUBLISHED).toBe('blog:unpublish');
    // Drafting is the default and needs nothing beyond create/update.
    expect(STATUS_SCOPE.DRAFT).toBeUndefined();
    expect(STATUS_SCOPE.REVIEW).toBeUndefined();
  });

  test('every mapped scope is a real scope', () => {
    for (const scope of Object.values(STATUS_SCOPE)) {
      if (scope) expect(isScope(scope)).toBe(true);
    }
    expect(SCOPES).toContain('blog:publish');
    expect(isScope('blog:everything')).toBe(false);
  });
});
