/**
 * Local-friendly migrate deploy runner.
 * - On Vercel/CI: uses process.env from the platform (no .env file).
 * - Locally: if DB URLs are missing, re-exec with dotenv loading repo-root .env.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dir, '..');
const rootEnv = resolve(__dir, '../../../.env');
const selfPath = fileURLToPath(import.meta.url);

const hasDbUrls = Boolean(process.env.DATABASE_URL && process.env.DIRECT_DATABASE_URL);

if (!hasDbUrls && existsSync(rootEnv) && process.env.__MIGRATE_DEPLOY_REEXEC !== '1') {
  const result = spawnSync('npx', ['dotenv', '-e', rootEnv, '--', 'node', selfPath], {
    stdio: 'inherit',
    cwd: pkgRoot,
    env: { ...process.env, __MIGRATE_DEPLOY_REEXEC: '1' },
  });
  process.exit(result.status ?? 1);
}

const check = spawnSync('node', [resolve(__dir, 'check-migrate-env.mjs')], {
  stdio: 'inherit',
  cwd: pkgRoot,
  env: process.env,
});
if ((check.status ?? 1) !== 0) {
  process.exit(check.status ?? 1);
}

const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  cwd: pkgRoot,
  env: process.env,
});
process.exit(migrate.status ?? 1);
