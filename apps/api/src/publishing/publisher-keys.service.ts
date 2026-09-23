import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { auditData } from './audit.service';
import { type Actor, fail } from './common';
import { CreateKeyDto, RotateKeyDto } from './publisher-keys.dto';
import type { Scope } from './scopes';
import { AdminPageQuery, pageOrder } from '../common/admin-page.dto';

/* Key format: pf_live_<prefix><secret>.
   The prefix is stored in the clear so the admin UI and audit log can name a
   key; the secret never is. Lookup is by prefix, then a constant-time compare
   of the SHA-256 of the secret — SHA-256 rather than argon2 because this runs
   on every AI request and the secret is 32 bytes of CSPRNG output, so there is
   no low-entropy guess for a slow hash to defend against. */
const LIVE_PREFIX = 'pf_live_';
const PREFIX_BYTES = 4; // 8 hex chars
const SECRET_BYTES = 32;
const KEY_PATTERN = /^pf_live_([0-9a-f]{8})([A-Za-z0-9_-]{43})$/;

export interface IssuedKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
  /** Returned exactly once, at creation and rotation. Never persisted. */
  key: string;
}

export const hashSecret = (secret: string): string =>
  createHash('sha256').update(secret).digest('hex');

@Injectable()
export class PublisherKeysService {
  private readonly logger = new Logger(PublisherKeysService.name);

  constructor(private readonly prisma: PrismaService) {}

  private mint(): { prefix: string; secret: string; key: string } {
    const prefix = randomBytes(PREFIX_BYTES).toString('hex');
    const secret = randomBytes(SECRET_BYTES).toString('base64url');
    return { prefix, secret, key: `${LIVE_PREFIX}${prefix}${secret}` };
  }

  private expiry(value?: string | null): Date | null {
    if (value === undefined || value === null || value === '') return null;
    const at = new Date(value);
    if (!Number.isFinite(at.getTime()) || at.getTime() <= Date.now()) {
      fail('INVALID_EXPIRY', 'Key expiry must be a future date.', 400);
    }
    return at;
  }

  /** The only method that ever returns a usable key string. */
  async create(dto: CreateKeyDto, actor: Actor): Promise<IssuedKey> {
    const expiresAt = this.expiry(dto.expiresAt);
    const { prefix, secret, key } = this.mint();
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.publisherKey.create({
        data: {
          name: dto.name.trim(),
          prefix,
          secretHash: hashSecret(secret),
          scopes: dto.scopes,
          expiresAt,
          createdBy: actor.id,
        },
      });
      await tx.auditEvent.create({
        data: auditData(actor, 'API_KEY_CREATED', 'API_KEY', created.id, true, {
          name: created.name,
          prefix: created.prefix,
          scopes: created.scopes,
        }),
      });
      return created;
    });
    this.logger.log(
      `Issued publisher key ${prefix} with ${dto.scopes.length} scope(s).`,
    );
    return { ...this.present(row), key };
  }

  /** Revokes the old secret and issues a new one under the same name and
   *  scopes, so a leaked key can be replaced without editing the client's
   *  configuration twice. */
  async rotate(
    id: string,
    dto: RotateKeyDto,
    actor: Actor,
  ): Promise<IssuedKey> {
    const expiresAt = this.expiry(dto.expiresAt);
    const { prefix, secret, key } = this.mint();
    const row = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.publisherKey.findUnique({ where: { id } });
      if (!existing) fail('API_KEY_NOT_FOUND', 'API key not found.', 404);
      if (existing.revokedAt) {
        fail(
          'API_KEY_REVOKED',
          'A revoked key cannot be rotated. Create a new one.',
          409,
        );
      }
      const updated = await tx.publisherKey.update({
        where: { id },
        data: {
          prefix,
          secretHash: hashSecret(secret),
          expiresAt:
            dto.expiresAt === undefined ? existing.expiresAt : expiresAt,
          lastUsedAt: null,
        },
      });
      await tx.auditEvent.create({
        data: auditData(actor, 'API_KEY_ROTATED', 'API_KEY', id, true, {
          name: updated.name,
          prefix: updated.prefix,
        }),
      });
      return updated;
    });
    return { ...this.present(row), key };
  }

  async revoke(id: string, actor: Actor) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.publisherKey.findUnique({ where: { id } });
      if (!existing) fail('API_KEY_NOT_FOUND', 'API key not found.', 404);
      if (existing.revokedAt) return this.present(existing);
      const updated = await tx.publisherKey.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: auditData(actor, 'API_KEY_REVOKED', 'API_KEY', id, true, {
          name: updated.name,
          prefix: updated.prefix,
        }),
      });
      return this.present(updated);
    });
  }

  async list() {
    const rows = await this.prisma.publisherKey.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.present(row));
  }

  async search(q: AdminPageQuery) {
    const where = q.search
      ? { name: { contains: q.search, mode: 'insensitive' as const } }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.publisherKey.findMany({
        where,
        orderBy: pageOrder(q),
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.publisherKey.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.present(row)),
      total,
      page: q.page,
      limit: q.limit,
    };
  }

  /** Strips `secretHash` on the way out. Every read path goes through here so
   *  the hash cannot reach a response by being added to a select later. */
  private present(row: {
    id: string;
    name: string;
    prefix: string;
    scopes: string[];
    expiresAt: Date | null;
    revokedAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      scopes: row.scopes,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt,
      lastUsedAt: row.lastUsedAt,
      createdAt: row.createdAt,
      status: row.revokedAt
        ? ('revoked' as const)
        : row.expiresAt && row.expiresAt <= new Date()
          ? ('expired' as const)
          : ('active' as const),
    };
  }

  /** Resolves a presented key to its record, or throws the specific reason it
   *  is unusable. Distinguishing expired from revoked from unknown is safe
   *  here: the caller already proved possession of a 256-bit secret. */
  async authenticate(
    presented: string,
  ): Promise<{ id: string; scopes: Scope[] }> {
    const match = KEY_PATTERN.exec(presented.trim());
    if (!match) fail('INVALID_API_KEY', 'The API key is malformed.', 401);
    const [, prefix, secret] = match;

    const row = await this.prisma.publisherKey.findFirst({ where: { prefix } });
    if (!row) fail('INVALID_API_KEY', 'The API key is not recognised.', 401);

    const expected = Buffer.from(row.secretHash, 'hex');
    const actual = Buffer.from(hashSecret(secret), 'hex');
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      fail('INVALID_API_KEY', 'The API key is not recognised.', 401);
    }
    if (row.revokedAt)
      fail('INVALID_API_KEY', 'This API key has been revoked.', 401);
    if (row.expiresAt && row.expiresAt <= new Date()) {
      fail('API_KEY_EXPIRED', 'This API key has expired.', 401);
    }

    /* Fire-and-forget: a failed bookkeeping write must not fail the request
       the caller is actually making. */
    void this.prisma.publisherKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() =>
        this.logger.warn(`Could not record last use of key ${prefix}.`),
      );

    return { id: row.id, scopes: row.scopes as Scope[] };
  }
}
