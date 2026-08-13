#!/usr/bin/env node
/**
 * Validate every concierge config against vapi/fleet.json.
 *
 *   node scripts/vapi-lint.mjs            # report, exit 1 on any error
 *   node scripts/vapi-lint.mjs --strict   # warnings count as errors too
 *
 * WHAT THIS CATCHES
 * Six of the seven concierges are structural twins built by cloning. Cloning is
 * fine; cloning and forgetting to finish is what shipped a med spa whose booking
 * tool asks for `colors`. Nothing in an assistant config says what vertical it
 * serves, so nothing could ever detect that mismatch. fleet.json declares it and
 * this enforces it, which is what makes the next clone safe.
 *
 * Reads no credentials. Local JSON only.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = resolve(__dirname, '../vapi/assistants');
const FLEET = resolve(__dirname, '../vapi/fleet.json');
const BASELINE = resolve(__dirname, '../vapi/baseline.json');

const STRICT = process.argv.includes('--strict');
const fleet = JSON.parse(readFileSync(FLEET, 'utf8'));
const baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
const baseSettings = Object.fromEntries(
  Object.entries(baseline.settings).filter(([k]) => !k.startsWith('_'))
);

// Issues already documented in fleet.json are reported as known, not as new
// failures. An accepted problem with a written reason and a fix is not the same
// as an undetected one, and CI should not be red forever over it.
const known = new Map();
for (const issue of fleet._knownIssues ?? []) {
  for (const slug of issue.assistants) known.set(slug, issue);
}

const errors = [];
const warnings = [];
const notes = [];

for (const [slug, decl] of Object.entries(fleet.assistants)) {
  const path = join(CONFIG_DIR, `${slug}.json`);
  if (!existsSync(path)) {
    errors.push(`${slug}: declared in fleet.json but no config at vapi/assistants/${slug}.json`);
    continue;
  }

  const cfg = JSON.parse(readFileSync(path, 'utf8'));
  const family = fleet.families[decl.family];
  if (!family) {
    errors.push(`${slug}: unknown family "${decl.family}"`);
    continue;
  }

  /* Vertical/family compatibility. The vocabulary check below only catches a
   * parameter foreign to the family an agent DECLARES, so an agent that declares
   * the wrong family looks native and slips through. Serabella is exactly that:
   * a med spa declaring painting-project, where `colors` reads as correct. This
   * catches the mismatch one level up, at the declaration itself. */
  if (family.verticals && !family.verticals.includes(decl.vertical)) {
    const msg =
      `${slug}: a ${decl.vertical} running the "${decl.family}" family, which serves ${family.verticals.join(', ')}.` +
      `\n    Everything below reads as native because the family is declared, so treat this as the root cause, not a detail.`;
    (known.has(slug) ? notes : errors).push(msg);
  }

  const toolNames = (cfg.model?.tools ?? []).filter((t) => t.function).map((t) => t.function.name).sort();
  const expected = [...family.tools].sort();

  // Tool set must match the family it declares. A drifted tool set means either
  // the agent grew a capability nobody recorded, or it was cloned from a
  // different family than the one it claims.
  const missing = expected.filter((t) => !toolNames.includes(t));
  const extra = toolNames.filter((t) => !expected.includes(t));
  if (missing.length || extra.length) {
    const msg = `${slug}: tool set does not match family "${decl.family}"` +
      (missing.length ? `\n    missing: ${missing.join(', ')}` : '') +
      (extra.length ? `\n    unexpected: ${extra.join(', ')}` : '');
    (known.has(slug) ? notes : errors).push(msg);
  }

  /* Vocabulary check. Every family declares the parameter names it owns. A
   * parameter belonging to a DIFFERENT family's vocabulary is the signature of
   * an unfinished clone: the descriptions get rewritten for the new client, the
   * field names do not. This is exactly how a med spa ended up asking for
   * colors. */
  const ownVocab = new Set(Object.values(family.vocabulary ?? {}));
  const foreignVocab = new Map();
  for (const [famName, fam] of Object.entries(fleet.families)) {
    if (famName === decl.family) continue;
    for (const term of Object.values(fam.vocabulary ?? {})) {
      if (!ownVocab.has(term)) foreignVocab.set(term, famName);
    }
  }

  for (const tool of cfg.model?.tools ?? []) {
    for (const param of Object.keys(tool.function?.parameters?.properties ?? {})) {
      if (foreignVocab.has(param)) {
        const msg = `${slug} (${decl.vertical}): ${tool.function.name} takes "${param}", which belongs to the ${foreignVocab.get(param)} family`;
        (known.has(slug) ? notes : errors).push(msg);
      }
    }
  }

  // Baseline compliance, for the agents the baseline claims to cover.
  if (baseline.appliesTo.includes(slug)) {
    for (const [k, want] of Object.entries(baseSettings)) {
      if (JSON.stringify(cfg[k]) !== JSON.stringify(want)) {
        warnings.push(`${slug}: ${k} does not match the baseline. Run vapi-baseline.mjs --apply.`);
      }
    }
  }
}

// A config nobody declared is an agent nobody owns.
if (existsSync(CONFIG_DIR)) {
  const { readdirSync } = await import('node:fs');
  const declared = new Set(Object.keys(fleet.assistants));
  const ownedElsewhere = new Set(['mr-mustard']);
  for (const f of readdirSync(CONFIG_DIR).filter((f) => f.endsWith('.json'))) {
    const slug = f.replace(/\.json$/, '');
    const cfg = JSON.parse(readFileSync(join(CONFIG_DIR, f), 'utf8'));
    const isConcierge = (cfg.model?.tools ?? []).some((t) => /^(get_services|get_menu)$/.test(t.function?.name ?? ''));
    if (isConcierge && !declared.has(slug) && !ownedElsewhere.has(slug)) {
      warnings.push(`${slug}: looks like a concierge but is not declared in vapi/fleet.json`);
    }
  }
}

const line = '='.repeat(60);
if (notes.length) {
  console.log(`\n${line}\nKNOWN ISSUES (documented in fleet.json, not failures)\n${line}`);
  for (const n of notes) console.log(`  ${n}`);
  for (const issue of fleet._knownIssues ?? []) console.log(`\n  Fix: ${issue.fix}`);
}
if (warnings.length) {
  console.log(`\n${line}\nWARNINGS\n${line}`);
  for (const w of warnings) console.log(`  ${w}`);
}
if (errors.length) {
  console.log(`\n${line}\nERRORS\n${line}`);
  for (const e of errors) console.log(`  ${e}`);
}

const failed = errors.length || (STRICT && warnings.length);
console.log(
  `\n${errors.length} error(s), ${warnings.length} warning(s), ${notes.length} known issue(s).` +
    (failed ? '\n' : ' Fleet is consistent.\n')
);
process.exitCode = failed ? 1 : 0;
