#!/usr/bin/env node
/**
 * Apply the shared call-quality baseline to every client concierge config.
 *
 *   node scripts/vapi-baseline.mjs            # report what would change
 *   node scripts/vapi-baseline.mjs --apply    # write it into vapi/assistants/*.json
 *
 * Then review with `vapi-sync.mjs --diff` and ship with `vapi-sync.mjs --push`.
 *
 * WHY THIS IS SEPARATE FROM THE PROMPTS
 * Each concierge's prompt and tool set is bespoke: a roofer books jobs, a med
 * spa books consults, a restaurant takes orders. That variation is the product.
 * What should NOT vary is the call-handling plumbing that decides whether a
 * caller gets clipped, cut off at fifteen minutes, or drowned out by their own
 * television. All seven shipped without any of it. This applies that layer and
 * touches nothing else, so a client's tuned prompt is never at risk.
 *
 * Reads no credentials. It only edits local JSON.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, '../vapi/assistants');
const BASELINE = resolve(__dirname, '../vapi/baseline.json');

const APPLY = process.argv.includes('--apply');

if (!existsSync(BASELINE)) {
  console.error(`\nMissing ${BASELINE}\n`);
  process.exit(1);
}

const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));

// Keys prefixed with _ are the rationale for the setting that follows them.
// They live next to the value on purpose, so the reason travels with the number
// instead of rotting in a commit message nobody reads again.
const settings = Object.fromEntries(
  Object.entries(baseline.settings).filter(([k]) => !k.startsWith('_'))
);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let changedFiles = 0;
let totalChanges = 0;

for (const slug of baseline.appliesTo) {
  const path = join(CONFIG_DIR, `${slug}.json`);
  if (!existsSync(path)) {
    console.log(`\n${slug}\n  NOT FOUND at ${path}. Run vapi-sync.mjs --pull first.`);
    continue;
  }

  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  const diffs = [];

  for (const [key, want] of Object.entries(settings)) {
    if (!same(cfg[key], want)) {
      diffs.push({ key, from: cfg[key], to: want });
      if (APPLY) cfg[key] = want;
    }
  }

  if (!diffs.length) continue;
  changedFiles++;
  totalChanges += diffs.length;

  console.log(`\n${slug}`);
  for (const d of diffs) {
    const show = (v) => (v === undefined ? '(absent)' : JSON.stringify(v));
    const from = show(d.from);
    console.log(`  ${d.key}`);
    console.log(`    was:  ${from.length > 90 ? from.slice(0, 90) + '...' : from}`);
    console.log(`    now:  ${JSON.stringify(d.to).length > 90 ? JSON.stringify(d.to).slice(0, 90) + '...' : JSON.stringify(d.to)}`);
  }

  if (APPLY) {
    /* Match exactly what vapi-sync --pull writes: id first, then _generatedBy,
     * then everything else alphabetically. Sorting all keys uniformly instead
     * would move `id` into alphabetical position, and the next --pull would move
     * it straight back, so every pull and every baseline run would fight each
     * other and produce diff churn on files nobody actually changed. */
    const { id, _generatedBy, ...rest } = cfg;
    const ordered = {
      id,
      ...(_generatedBy ? { _generatedBy } : {}),
      ...Object.fromEntries(Object.keys(rest).sort().map((k) => [k, rest[k]])),
    };
    writeFileSync(path, JSON.stringify(ordered, null, 2) + '\n');
  }
}

if (!changedFiles) {
  console.log(`\nEvery concierge already matches the baseline.\n`);
} else if (APPLY) {
  console.log(`\nApplied ${totalChanges} change(s) across ${changedFiles} concierge(s).`);
  console.log(`Nothing was sent to Vapi. Review with:`);
  console.log(`  git diff vapi/assistants/`);
  console.log(`  node scripts/vapi-sync.mjs --diff`);
  console.log(`Then ship with:  node scripts/vapi-sync.mjs --push --all\n`);
} else {
  console.log(`\n${totalChanges} change(s) across ${changedFiles} concierge(s). Re-run with --apply to write them.\n`);
}
