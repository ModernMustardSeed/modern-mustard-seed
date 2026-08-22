/**
 * ⚠️ THE GUARD THAT MAKES "ALL FUTURE AGENTS" TRUE.
 *
 * Every voice agent the studio ships carries the readback standard. Two things
 * can quietly break that, and neither shows up as a failing build:
 *
 *   1. Someone writes a NEW voice persona that does not pass through a funnel
 *      which applies the standard.
 *   2. Someone edits a funnel and drops the call that applies it.
 *
 * Both happened in miniature already: the forged demo personas carried their
 * own older copy of these rules for months, and that copy contradicted the
 * standard in the one way that mattered, so demos spelled things back without
 * anchor words and a caller's email went out as busyai2023.
 *
 * This is a SOURCE check, and it is deliberately separate from
 * vapi-readback-audit.mjs, which reads live agents off Vapi. The audit tells
 * you the fleet is compliant today. This tells you the code cannot ship a
 * non-compliant agent tomorrow. Run both.
 *
 * Exits non-zero on any finding so it can gate a build.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => (existsSync(resolve(root, p)) ? readFileSync(resolve(root, p), 'utf8') : null);

/**
 * The funnels. Every voice system prompt in the product reaches Vapi through
 * one of these, and each must apply the standard. `must` is matched literally
 * against the file, so renaming the helper without updating a funnel fails here
 * rather than in a customer's ear.
 */
const FUNNELS = [
  {
    file: 'lib/sidekick.ts',
    must: 'ensureReadbackStandard(systemPrompt)',
    why: 'demoModel() builds every forged demo, desk call and interview agent.',
  },
  {
    file: 'lib/factory/agent.ts',
    must: 'READBACK_STANDARD',
    why: 'The Client Factory builds every tenant agent.',
  },
  {
    file: 'scripts/setup-vapi-mustard.mjs',
    must: 'READBACK_STANDARD',
    why: 'Mr. Mustard himself, whose prompt is generated rather than stored.',
  },
];

/**
 * Files allowed to build a Vapi assistant without a funnel, each with a reason.
 * Anything NOT listed that posts an assistant to Vapi is reported, because the
 * default answer for a new one is "route it through a funnel", not "add it
 * here". Adding a line to this list should feel like a decision.
 */
const EXEMPT = new Map([
  ['scripts/vapi-spelling.mjs', 'It installs the standard; it is the tool, not a consumer.'],
  ['scripts/vapi-readback-audit.mjs', 'It reads agents back to verify the standard.'],
  ['scripts/voice-standard-check.mjs', 'This file.'],
  ['scripts/vapi-sync.mjs', 'Pushes reviewed snapshots that already carry the standard.'],
  ['scripts/vapi-baseline.mjs', 'Reads and snapshots existing agents.'],
  ['scripts/vapi-assistants.mjs', 'Lists agents.'],
  ['scripts/vapi-lint.mjs', 'Reads agents to lint them.'],
  ['scripts/make-voice-concierge-playbook.mjs', 'Generates human-readable documentation, not an agent.'],
  /* These four do NOT author a prompt. Each fetches the LIVE assistant and
   * appends a per-call briefing to its existing system message, so they inherit
   * whatever that assistant carries and cannot strip it. The live side is what
   * vapi-readback-audit.mjs checks, which is why these two scripts are a pair.
   * ⚠️ If one of them ever REPLACES the system message instead of appending,
   * it stops inheriting and belongs back in the checked set. */
  ['lib/outbound-call.ts', 'Appends a briefing to the live assistant prompt (modelWithBriefing).'],
  ['lib/instant-callback.ts', 'Appends a briefing to the live assistant prompt (modelWithBriefing).'],
  ['lib/acq/call.ts', 'Appends a briefing to the live assistant prompt (modelWithBriefing).'],
  ['scripts/mustard-ad/call.mjs', 'Appends a briefing to the live assistant prompt.'],
]);

const problems = [];

for (const f of FUNNELS) {
  const src = read(f.file);
  if (src === null) {
    problems.push(`MISSING  ${f.file} does not exist. ${f.why}`);
    continue;
  }
  if (!src.includes(f.must)) {
    problems.push(`DRIFTED  ${f.file} no longer contains "${f.must}".\n         ${f.why}`);
  }
}

// The standard itself must still be the single source, and versioned.
const std = read('lib/readback-standard.ts');
if (!std) {
  problems.push('MISSING  lib/readback-standard.ts, the single source of the standard.');
} else {
  if (!/export const READBACK_STANDARD_VERSION = \d+;/.test(std)) {
    problems.push('DRIFTED  lib/readback-standard.ts has no READBACK_STANDARD_VERSION.');
  }
  if (!std.includes('export function ensureReadbackStandard')) {
    problems.push('DRIFTED  ensureReadbackStandard is gone; the funnels have nothing to call.');
  }
  const version = /READBACK_STANDARD_VERSION = (\d+);/.exec(std)?.[1];
  // Match the heading literally. A  inside a template literal is a backspace
  // character, not a word boundary, and this check silently failed on exactly that.
  if (version && !std.includes(`(studio standard v${version})`)) {
    problems.push(
      `DRIFTED  READBACK_STANDARD_VERSION is ${version} but the text is not headed "studio standard v${version}".\n` +
      '         The installer and the audit both key on that heading, so they would silently no-op.'
    );
  }
}

// Anything creating a Vapi assistant outside the known set.
const audited = new Set([...FUNNELS.map((f) => f.file), ...EXEMPT.keys()]);
const CANDIDATES = [
  'lib/outbound-call.ts', 'lib/instant-callback.ts', 'lib/acq/call.ts', 'lib/mustard-desk.ts',
  'lib/voice-forge-suite.ts', 'scripts/vapi-create-wildhorse.mjs', 'scripts/mustard-ad/call.mjs',
];
for (const file of CANDIDATES) {
  if (audited.has(file)) continue;
  const src = read(file);
  if (!src) continue;
  // Creating an assistant means POSTing to the collection endpoint.
  const creates = /fetch\(\s*[`'"]https:\/\/api\.vapi\.ai\/assistant[`'"]/.test(src);
  const buildsPrompt = /role:\s*'system'/.test(src) && /messages\s*:/.test(src);
  if ((creates || buildsPrompt) && !src.includes('ensureReadbackStandard') && !src.includes('READBACK_STANDARD')) {
    problems.push(
      `UNCOVERED  ${file} builds or creates a Vapi assistant prompt without the standard.\n` +
      '           Route it through a funnel, or add it to EXEMPT with a reason.'
    );
  }
}

if (problems.length === 0) {
  console.log(`\nVoice standard: OK. ${FUNNELS.length} funnels apply it, and nothing builds an agent around them.\n`);
} else {
  console.error('\nVOICE STANDARD CHECK FAILED\n');
  for (const p of problems) console.error(`  ${p}\n`);
  console.error('Every agent the studio ships carries the readback standard. Fix the above.\n');
  process.exitCode = 1;
}
