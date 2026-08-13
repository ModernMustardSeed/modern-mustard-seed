/**
 * Set or replace a key in .env.local without printing its value and without
 * disturbing anything else in the file.
 *
 *   npx tsx scripts/acq-set-env.mts KEY=value [KEY=value...]
 *
 * ⚠️ Never run `vercel env pull` against this file. It redacts secret-flagged
 * values on the way down and writes the literal string [SENSITIVE] over the
 * real ones, which is how 63 of 85 variables here got destroyed once already.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const pairs = process.argv.slice(2).map((a) => {
  const i = a.indexOf('=');
  if (i < 1) throw new Error(`Not a KEY=value pair: ${a.slice(0, 20)}`);
  return [a.slice(0, i), a.slice(i + 1)] as const;
});
if (!pairs.length) {
  console.error('Usage: npx tsx scripts/acq-set-env.mts KEY=value [KEY=value...]');
  process.exit(1);
}

const path = '.env.local';
const lines = readFileSync(path, 'utf8').split(/\r?\n/);

for (const [key, value] of pairs) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const line = `${key}=${value}`;
  if (idx >= 0) lines[idx] = line;
  else lines.push(line);
  console.log(`  ${key} set (${value.length} characters)`);
}

writeFileSync(path, lines.join('\n'));
console.log(`\n${path} updated. Values were never printed.\n`);
