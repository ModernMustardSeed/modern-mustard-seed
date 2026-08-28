#!/usr/bin/env node
/**
 * STRIP THE ENUM OUT OF EVERY ARRAY `items` ON THE LIVE VAPI ORG.
 *
 *   node scripts/vapi-fix-item-enums.mjs             # dry run, prints what it would do
 *   node scripts/vapi-fix-item-enums.mjs --apply     # PATCH the assistants it found
 *   node scripts/vapi-fix-item-enums.mjs --apply --assistant "Mr. Mustard"
 *
 * WHY THIS IS A SCRIPT AND NOT `vapi-sync.mjs --push`
 *
 * `--push` writes the whole repo snapshot over the live assistant. For
 * Mr. Mustard that snapshot is far behind production (a 33k prompt against a
 * 48k one, temperature 0.7 against 0.6, eleven_turbo_v2_5 against the
 * multilingual_v2 that fixed the stutter), so pushing it would roll the live
 * phone line backwards to fix one field. That is a bigger outage than the bug.
 *
 * So this changes ONE thing and proves it changed one thing. It GETs the live
 * assistant, deletes the offending `enum` in memory, walks both copies and
 * lists every path that differs, and REFUSES to send the PATCH if anything
 * turned up that it did not intend to touch. `model` is replaced wholesale by a
 * PATCH, so that guard is the only thing standing between a one-field repair
 * and silently reverting a prompt somebody spent a week on.
 *
 * WHAT THE BUG IS
 *
 * `forge_demo_suite.build` shipped 2026-08-13 declared as
 * `{ type: 'array', items: { type: 'string', enum: [...] } }`. Vapi accepted the
 * PATCH, stored it, and read it back unchanged. Every drift check stayed green.
 * And the model could select that tool but could not fill it, so every call
 * arrived at the webhook as the literal `{}` (not the one field, all ten) for
 * eleven days: 16 attempts, 4 real calls, zero demos built, an apology every
 * time. A plain top-level string enum is fine and is left alone; it is the
 * nested one that empties the arguments object.
 *
 * Related: scripts/vapi-lint.mjs (catches it in the repo before it ships),
 * scripts/vapi-tool-health.mjs (catches it in the call history after it ships).
 *
 * Reads VAPI_API_KEY. Prints no secrets.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  try {
    const out = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

const fileEnv = {
  ...loadEnvFile(resolve(__dirname, '../../modern-mustard-seed-voice-agent/.env')),
  ...loadEnvFile(resolve(__dirname, '../.env.local')),
};

// `vercel env pull` writes the literal "[SENSITIVE]" over write-only vars and it
// is truthy, so it would sail into an Authorization header and come back as a
// confusing 401 rather than an obvious config problem.
const PLACEHOLDER = '[SENSITIVE]';
const env = (k) => {
  const v = process.env[k] ?? fileEnv[k];
  return v === PLACEHOLDER ? undefined : v;
};

const VAPI_API_KEY = env('VAPI_API_KEY');
const APPLY = process.argv.includes('--apply');
const onlyIdx = process.argv.indexOf('--assistant');
const ONLY = onlyIdx === -1 ? null : process.argv[onlyIdx + 1];

if (!VAPI_API_KEY) {
  console.error('\nNo usable VAPI_API_KEY. This reads and writes live assistants and cannot run without it.\n');
  process.exitCode = 2;
} else {
  await main();
}

/** Every path where two JSON values differ. Used as a change guard, not a diff viewer. */
function changedPaths(a, b, path = '', out = []) {
  if (a === b) return out;
  const bothObjects = a && b && typeof a === 'object' && typeof b === 'object';
  if (!bothObjects) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push(path);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    changedPaths(a[k], b[k], path ? `${path}.${k}` : k, out);
  }
  return out;
}

/**
 * Delete every `enum` that sits inside an `items`, recording where it was.
 *
 * ⚠️ Array indices are written `tools.6`, not `tools[6]`, so these paths compare
 * directly against `changedPaths` output. They did not, once, and the guard
 * rejected its own intended edit as unexpected.
 */
function stripItemEnums(node, path, removed) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => stripItemEnums(v, path ? `${path}.${i}` : String(i), removed));
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (node.items && typeof node.items === 'object' && 'enum' in node.items) {
    removed.push({ path: `${path}.items.enum`, values: node.items.enum });
    delete node.items.enum;
  }
  for (const [k, v] of Object.entries(node)) {
    stripItemEnums(v, path ? `${path}.${k}` : k, removed);
  }
}

/**
 * The repo's description for one tool parameter, when the repo has an opinion.
 *
 * Deleting the enum removes the ONLY machine-readable statement of what the
 * legal values are, so the description has to carry them or the model is left
 * guessing. vapi/assistants/<slug>.json is the declared source of truth for
 * tool schemas, so the repaired parameter adopts the repo's wording in the same
 * write. Returns null when the repo has no snapshot, no such tool, or nothing
 * different to say, and the live description is then left exactly alone.
 */
function repoDescriptionFor(assistantName, toolName, paramName) {
  const dir = resolve(__dirname, '../vapi/assistants');
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    // Running from a checkout with no configs is fine; the live description stands.
    return null;
  }
  for (const f of files) {
    let cfg;
    try {
      cfg = JSON.parse(readFileSync(resolve(dir, f), 'utf8'));
    } catch {
      continue;
    }
    if (cfg.name !== assistantName) continue;
    for (const t of cfg.model?.tools ?? []) {
      if (t.function?.name !== toolName) continue;
      const d = t.function?.parameters?.properties?.[paramName]?.description;
      return typeof d === 'string' && d.trim() ? d : null;
    }
  }
  return null;
}

async function main() {
  const H = { Authorization: `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' };
  const assistants = await (await fetch('https://api.vapi.ai/assistant?limit=200', { headers: H })).json();

  let touched = 0;
  let failed = 0;

  for (const live of assistants) {
    if (ONLY && live.name !== ONLY) continue;
    if (!live.model?.tools?.length) continue;

    const before = JSON.parse(JSON.stringify(live.model));
    const model = JSON.parse(JSON.stringify(live.model));
    const removed = [];
    stripItemEnums(model.tools, 'tools', removed);
    if (!removed.length) continue;

    touched++;
    console.log(`\n${'='.repeat(70)}\n${live.name}  (${live.id})\n${'='.repeat(70)}`);

    /* Deleting the enum removes the only machine-readable statement of the legal
     * values, so the description has to carry them instead. Where the repo
     * snapshot has a newer wording for exactly that parameter, adopt it in the
     * same write rather than leaving live and repo disagreeing about a schema
     * the repo is supposed to own. */
    const alsoChanged = [];
    for (const r of removed) {
      console.log(`  removing enum at model.${r.path}`);
      console.log(`    values were: ${JSON.stringify(r.values)}`);

      const m = /^tools\.(\d+)\.function\.parameters\.properties\.([^.]+)\.items\.enum$/.exec(r.path);
      if (!m) {
        console.log(`    ⚠️ nested deeper than a top level parameter, so the description was not`);
        console.log(`       touched. Name those values in it by hand or the model is now guessing.`);
        continue;
      }
      const [, idx, paramName] = m;
      const toolName = model.tools[Number(idx)]?.function?.name;
      const wanted = repoDescriptionFor(live.name, toolName, paramName);
      const param = model.tools[Number(idx)].function.parameters.properties[paramName];
      const names = String(param.description ?? '');
      if (wanted && wanted !== param.description) {
        param.description = wanted;
        alsoChanged.push(`tools.${idx}.function.parameters.properties.${paramName}.description`);
        console.log(`    description synced from the repo snapshot, which names the legal values.`);
      } else if (r.values.every((v) => names.includes(String(v)))) {
        console.log(`    description already names all ${r.values.length} legal values, left alone.`);
      } else {
        console.log(`    ⚠️ the description does NOT name every legal value and the repo has no`);
        console.log(`       better one. Fix the description or the model is now guessing.`);
      }
    }

    /* The guard. A PATCH of `model` replaces the whole object, so anything that
     * differs here and was not deliberate would be shipped as a silent
     * regression: a rolled-back prompt, a dropped tool, a reverted temperature. */
    const diffs = changedPaths(before, model);
    const expected = [...removed.map((r) => r.path), ...alsoChanged];
    const unexpected = diffs.filter((d) => !expected.includes(d));
    if (unexpected.length) {
      console.error(`\n  REFUSING TO PATCH ${live.name}: ${unexpected.length} unintended change(s):`);
      for (const u of unexpected) console.error(`    ${u}`);
      failed++;
      continue;
    }
    console.log(`\n  guard passed: exactly ${diffs.length} field(s) changed, all intended.`);
    console.log(`  prompt chars ${before.messages?.reduce((n, m) => n + (m.content?.length ?? 0), 0) ?? 0}, ` +
      `tools ${model.tools.length}, model ${model.model}, temp ${model.temperature}`);

    if (!APPLY) {
      console.log('\n  DRY RUN. Re-run with --apply to send this PATCH.');
      continue;
    }

    const res = await fetch(`https://api.vapi.ai/assistant/${live.id}`, {
      method: 'PATCH',
      headers: H,
      body: JSON.stringify({ model }),
    });
    if (!res.ok) {
      console.error(`  PATCH failed: ${res.status} ${JSON.stringify(await res.json()).slice(0, 800)}`);
      failed++;
      continue;
    }

    /* ⚠️ A 200 PROVES THE CONFIG IS VALID AND NOTHING ELSE. This fleet has
     * already lost a phone line to a change every API response called a success
     * (OpenAI TTS PATCHed clean and then failed mid-call), so read it back. */
    const after = await (await fetch(`https://api.vapi.ai/assistant/${live.id}`, { headers: H })).json();
    const stillThere = [];
    stripItemEnums(JSON.parse(JSON.stringify(after.model.tools)), 'tools', stillThere);
    console.log(`  PATCH ${res.status}. Read back:`);
    console.log(`    nested item enums remaining : ${stillThere.length}`);
    console.log(`    tools                       : ${after.model.tools.map((t) => t.function?.name ?? t.type).join(', ')}`);
    console.log(`    prompt chars                : ${after.model.messages?.reduce((n, m) => n + (m.content?.length ?? 0), 0) ?? 0}`);
    console.log(`    model / temperature         : ${after.model.model} / ${after.model.temperature}`);
    console.log(`    voice                       : ${after.voice?.provider} ${after.voice?.voiceId} (${after.voice?.model})`);
    console.log(`    webhook secret set          : ${after.isServerUrlSecretSet}`);
    if (stillThere.length) {
      console.error('    the enum survived the write. Do not trust this assistant until it is gone.');
      failed++;
    }
  }

  if (!touched) {
    console.log('\nNo assistant on the org has an enum nested inside array items. Nothing to do.\n');
  } else {
    console.log(
      `\n${touched} assistant(s) affected, ${failed} failure(s).` +
        (APPLY
          ? '\n⚠️ Place a real call and confirm the tool arrives with arguments:' +
            '\n   node scripts/vapi-tool-health.mjs --days 1\n'
          : '\nNothing was written. Re-run with --apply.\n')
    );
  }
  process.exitCode = failed ? 1 : 0;
}
