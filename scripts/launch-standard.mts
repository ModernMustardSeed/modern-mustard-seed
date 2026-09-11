/**
 * CREATE THE STANDARD LAUNCH FOR A CLIENT, FROM THE TERMINAL.
 *
 * The checklist for a business with no Google Business Profile yet: our steps
 * and theirs in one runbook, theirs visible in their portal, ours on
 * /admin/golive. Idempotent on the client's email, so running it twice returns
 * the same runbook rather than giving them two lists.
 *
 *   npx tsx scripts/launch-standard.mts --config clients/kyler.json
 *   npx tsx scripts/launch-standard.mts --config clients/kyler.json --dry
 *
 * The config is a JSON file holding { title, clientEmail, repoPath, facts }.
 * Keeping it in a file rather than in flags means the exact facts a runbook was
 * built from are recorded next to it and can be replayed.
 */
import fs from 'node:fs';
import { createStandardLaunch, getRunbook, progressOf } from '../lib/golive';
import { standardLaunchGroups, clientItems, adminItems, type LaunchFacts } from '../data/launch-standard';

type Config = {
  title: string;
  clientEmail: string;
  repoPath?: string;
  facts: LaunchFacts;
};

const args = process.argv.slice(2);
const at = args.indexOf('--config');
const dry = args.includes('--dry');
if (at < 0 || !args[at + 1]) {
  console.error('usage: launch-standard.mts --config <file.json> [--dry]');
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(args[at + 1], 'utf8')) as Config;
if (!cfg.clientEmail || !cfg.facts?.business) {
  console.error('config needs clientEmail and facts.business');
  process.exit(1);
}

const groups = standardLaunchGroups(cfg.facts);
const theirs = clientItems(groups).flatMap((g) => g.items);
const ours = adminItems(groups).flatMap((g) => g.items);

console.log(`${cfg.facts.business}  <${cfg.clientEmail}>`);
console.log(`${groups.length} groups, ${ours.length} ours, ${theirs.length} theirs\n`);
for (const g of groups) {
  console.log(g.name);
  for (const i of g.items) console.log(`   [${i.who.padEnd(6)}] ${i.what}`);
  console.log();
}

if (dry) {
  console.log('dry run, nothing written');
  process.exit(0);
}

const slug = await createStandardLaunch({
  title: cfg.title || cfg.facts.business,
  clientEmail: cfg.clientEmail,
  facts: cfg.facts,
  repo_path: cfg.repoPath ?? null,
  prod_url: cfg.facts.siteUrl,
});

if (!slug) {
  console.error('create failed. Is SUPABASE_SERVICE_ROLE_KEY set in this shell?');
  process.exit(1);
}

/* Read it back rather than trusting the write, and report from what is stored. */
const rb = await getRunbook(slug);
if (!rb) {
  console.error(`created ${slug} but could not read it back`);
  process.exit(1);
}
const p = progressOf(rb);
console.log(`runbook  /admin/golive/${slug}`);
console.log(`stored   ${p.total} steps, ${p.done} already done`);
console.log(`client   ${cfg.clientEmail} sees ${theirs.length} of them in their portal`);
