/**
 * Prove the free engine actually grades a real site, end to end, before any
 * batch run trusts it.
 *
 *   npx tsx scripts/audit-engine-smoke.mts https://example.com
 *   npx tsx scripts/audit-engine-smoke.mts https://example.com --engine api
 *
 * Prints the engine used, the wall clock, the reported cost, and enough of the
 * report to see it is a real audit and not an empty shell.
 */
import { readFileSync } from 'node:fs';

try {
  for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch { /* no .env.local is fine for the free engine */ }

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--')) ?? 'https://modernmustardseed.com';
const engineFlag = argv.indexOf('--engine');
process.env.AUDIT_ENGINE = engineFlag === -1 ? 'claude-code' : (argv[engineFlag + 1] ?? 'claude-code');

const { runWebsiteAudit } = await import('../lib/website-audit.ts');

console.log(`auditing ${url} via AUDIT_ENGINE=${process.env.AUDIT_ENGINE}`);
const started = Date.now();
const result = await runWebsiteAudit(url);
const secs = ((Date.now() - started) / 1000).toFixed(1);

if (!result.ok) {
  console.error(`FAILED in ${secs}s: [${result.status}] ${result.error}`);
  process.exit(1);
}

const r = result.report;
console.log(`\nOK in ${secs}s  |  engine: ${result.usage.model}  |  tokens billed: ${result.usage.input + result.usage.output}`);
console.log(`overall: ${r.overall_score} (${r.overall_grade ?? '?'})`);
console.log(`headline: ${r.headline}`);
console.log('categories:', Object.entries(r.categories ?? {}).map(([k, v]) => `${k}=${(v as { score: number }).score}`).join(' '));
console.log(`top fixes: ${(r.top_three_fixes ?? []).length}  |  todo items: ${(r.full_todo ?? []).length}`);
console.log(`analysis: ${String(r.overall_analysis ?? '').slice(0, 200)}...`);
