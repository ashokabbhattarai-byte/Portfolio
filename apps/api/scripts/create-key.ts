/**
 * Issues a publisher API key from the command line.
 *
 *   bun run --filter='@portfolio/api' key:create -- --name "Claude Desktop"
 *   bun run --filter='@portfolio/api' key:create -- --name "Codex" --scopes blog:read,blog:create,blog:publish
 *   bun run --filter='@portfolio/api' key:create -- --list
 *
 * Goes through PublisherKeysService, so the key is hashed and the creation is
 * audited exactly as it would be from the admin UI. The plaintext is printed
 * once and never stored — same as the admin.
 */
import { PrismaClient } from '../node_modules/.prisma/client';
import { PublisherKeysService } from '../src/publishing/publisher-keys.service';
import {
  SCOPES,
  SCOPE_DESCRIPTIONS,
  isScope,
  type Scope,
} from '../src/publishing/scopes';

/** What a writing assistant needs to draft and illustrate, but not publish. */
const DEFAULT_SCOPES: Scope[] = [
  'blog:read',
  'blog:create',
  'blog:update',
  'media:read',
  'media:upload',
];

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index !== -1) return process.argv[index + 1];
  const inline = process.argv.find((value) => value.startsWith(`${flag}=`));
  return inline?.slice(flag.length + 1);
}

const prisma = new PrismaClient();
const keys = new PublisherKeysService(prisma as never);

async function main(): Promise<void> {
  if (process.argv.includes('--help')) {
    console.log(
      [
        'Usage: key:create -- --name <name> [--scopes a,b,c] [--expires <ISO date>]',
        '       key:create -- --list',
        '',
        'Scopes:',
        ...SCOPES.map(
          (scope) => `  ${scope.padEnd(17)} ${SCOPE_DESCRIPTIONS[scope]}`,
        ),
        '',
        `Default: ${DEFAULT_SCOPES.join(', ')}`,
      ].join('\n'),
    );
    return;
  }

  if (process.argv.includes('--list')) {
    const rows = await keys.list();
    if (rows.length === 0) {
      console.log('No API keys yet.');
      return;
    }
    for (const row of rows) {
      console.log(
        `${row.status.padEnd(8)} pf_live_${row.prefix}…  ${row.name}  [${row.scopes.join(', ')}]`,
      );
    }
    return;
  }

  const name = arg('name');
  if (!name) {
    console.error('Pass --name "Claude Desktop". Use --help for options.');
    process.exitCode = 1;
    return;
  }

  const requested = (arg('scopes') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = requested.filter((scope) => !isScope(scope));
  if (invalid.length) {
    console.error(`Unknown scope(s): ${invalid.join(', ')}`);
    console.error(`Valid scopes: ${SCOPES.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  const scopes = requested.length ? (requested as Scope[]) : DEFAULT_SCOPES;

  const issued = await keys.create(
    { name, scopes, expiresAt: arg('expires') ?? null },
    { type: 'ADMIN', id: 'cli', correlationId: `cli-${Date.now()}` },
  );

  console.log(
    '\nKey created. Copy it now — it is not stored and cannot be shown again.\n',
  );
  console.log(`  ${issued.key}\n`);
  console.log(`  name    ${issued.name}`);
  console.log(`  scopes  ${issued.scopes.join(', ')}`);
  console.log(
    `  expires ${issued.expiresAt ? issued.expiresAt.toISOString() : 'never'}\n`,
  );
  console.log('Add it to your MCP client config as PORTFOLIO_API_KEY.\n');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
