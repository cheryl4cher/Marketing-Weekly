/**
 * scripts/cron.ts
 *
 * Daily orchestration entry: runs the crawler, then the analyzer, sequentially.
 * Wire this into a system cron / scheduler, e.g.:
 *
 *   0 8 * * *  cd /path/to/marketing_weekly && pnpm cron >> logs/cron.log 2>&1
 *
 * Usage:  pnpm cron   or   tsx scripts/cron.ts
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function run(label: string, file: string, extraArgs: string[] = []): boolean {
  console.log(`\n[${new Date().toISOString()}] === ${label} ===`);
  const res = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['tsx', resolve(ROOT, file), ...extraArgs],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    },
  );

  if (res.status !== 0) {
    console.error(`[${label}] exited with code ${res.status}`);
    return false;
  }
  return true;
}

async function main() {
  console.log(`[${new Date().toISOString()}] cron: crawl + analyze start`);

  // Step 1 — crawl
  const crawlOk = run('crawler', 'scripts/crawler.ts');
  if (!crawlOk) {
    console.error('crawler step failed; continuing to analyze existing pending cases.');
  }

  // Step 2 — analyze (works on any pending cases, including older ones)
  run('analyzer', 'scripts/analyzer.ts');

  console.log(`[${new Date().toISOString()}] cron: done`);
  process.exit(0);
}

main();
