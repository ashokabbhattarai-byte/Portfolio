/**
 * Ensures the CMS admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD exists
 * and can sign in. Touches ONLY the user row: never content tables.
 * Run: bun --filter='@portfolio/api' ensure-admin (or bun scripts/ensure-admin.ts)
 */
import * as argon2 from 'argon2';
import { PrismaClient } from '../src/prisma/prisma-client';
import { ARGON2_OPTIONS } from '../src/auth/auth.service';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    console.error(
      '[ensure-admin] SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD missing.',
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = await argon2.hash(password, ARGON2_OPTIONS);
    await prisma.user.create({
      data: {
        email,
        name: process.env.SEED_ADMIN_NAME?.trim() || 'Ashok Bhattarai',
        passwordHash: hash,
        role: 'ADMIN',
      },
    });
    console.log(`[ensure-admin] Created admin ${email}.`);
    return;
  }

  const updates: Record<string, unknown> = {};
  let matches = false;
  try {
    matches = await argon2.verify(existing.passwordHash, password);
  } catch {
    matches = false;
  }
  if (!matches) {
    updates.passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
    console.log(
      '[ensure-admin] Stored hash did not match env password; hash updated.',
    );
  }
  if (existing.failedLogins > 0 || existing.lockedUntil) {
    updates.failedLogins = 0;
    updates.lockedUntil = null;
    console.log('[ensure-admin] Cleared failed-login counter and lockout.');
  }
  if (existing.disabledAt) {
    console.log(
      '[ensure-admin] WARNING: account is disabled (disabledAt set). Leaving as-is.',
    );
  }
  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id: existing.id }, data: updates });
  }
  console.log(
    `[ensure-admin] Admin ${email} OK (password matches env: ${matches || 'hash' in updates}).`,
  );
}

main()
  .catch((error) => {
    console.error('[ensure-admin] Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
