import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { isDuration } from '../common/duration';

/* Each app owns its env. At runtime __dirname is apps/api/dist/config,
   at seed it is apps/api/prisma or apps/api/src/config. We try the
   per-app file first, then fall back to the legacy monolithic root. */
import { existsSync } from 'node:fs';

const candidates = [
  // Per-app (preferred) – apps/api/.env
  join(__dirname, '..', '..', '.env'),
  join(__dirname, '..', '.env'), // prisma/.env → apps/api/.env
  join(process.cwd(), 'apps/api/.env'),
  join(process.cwd(), '.env'),
  // Legacy root
  join(__dirname, '..', '..', '..', '..', '.env'),
  join(__dirname, '..', '..', '..', '.env'),
  join(process.cwd(), '..', '..', '.env'),
];
export const rootEnvPath =
  candidates.find((p) => existsSync(p)) ?? candidates[0];
// Back-compat alias
export const apiEnvPath = rootEnvPath;

const REQUIRED = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;
const MIN_SECRET_LENGTH = 32;

export type EnvRecord = Record<string, unknown>;

/** Boots or refuses to boot: a missing signing secret must never be silently
    replaced by a default. */
export function validateEnv(config: EnvRecord): EnvRecord {
  const read = (key: string) => {
    const value = config[key];
    return typeof value === 'string' ? value.trim() : '';
  };

  const missing = REQUIRED.filter((key) => read(key) === '');
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        `Copy apps/api/.env.example to apps/api/.env and fill them in ` +
        `(generate secrets with: openssl rand -base64 48). ` +
        `Tried ${rootEnvPath}.`,
    );
  }

  const access = read('JWT_ACCESS_SECRET');
  const refresh = read('JWT_REFRESH_SECRET');
  const weak = (['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const).filter(
    (key) => read(key).length < MIN_SECRET_LENGTH,
  );
  if (weak.length > 0) {
    throw new Error(
      `${weak.join(' and ')} must be at least ${MIN_SECRET_LENGTH} characters. ` +
        `Generate with: openssl rand -base64 48.`,
    );
  }
  if (access === refresh) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ, so a leaked access secret cannot mint refresh tokens.',
    );
  }

  for (const key of ['ACCESS_TOKEN_TTL', 'REFRESH_TOKEN_TTL'] as const) {
    if (!isDuration(read(key) || undefined)) {
      throw new Error(
        `${key} must look like "15m" or "30d", got "${read(key)}".`,
      );
    }
  }

  /* Revalidation is best-effort by design, so a missing secret degrades to
     stale pages rather than a failed boot. */
  if (read('REVALIDATE_SECRET') === '' || read('WEB_URL') === '') {
    new Logger('Config').warn(
      'REVALIDATE_SECRET or WEB_URL is unset: content writes will not purge the Next cache.',
    );
  }

  return config;
}
