#!/usr/bin/env node
/**
 * THE VOICE STANDARD, AUDITED AND APPLIED ACROSS THE WHOLE ORG.
 *
 *   node scripts/voice-standard.mjs                 audit every live assistant
 *   node scripts/voice-standard.mjs --apply         write the standard to all
 *   node scripts/voice-standard.mjs --apply --only "Mr. Mustard"
 *   node scripts/voice-standard.mjs --diff "Linda"  show what would change
 *
 * WHY THIS EXISTS. On 2026-08-19 a landscaping agent told two real callers the
 * booking system was broken. It was not: its calendar tool returned days with
 * no year in them, so the model guessed 2024 and every booking was refused as
 * "too soon". The audit that followed found the same class of gap almost
 * everywhere. Not one agent on the org except the one just fixed knew what day
 * it was, and none of them had a rule against saying "um" or against telling a
 * customer that our software had failed.
 *
 * A standard that lives in a document is a standard that drifts. This reads the
 * one copy in lib/voice-standard.ts, scores every assistant against it, and can
 * write it. Run the audit before a launch and after any prompt edit.
 *
 * SAFE BY DEFAULT. Audit is read-only. --apply patches ONLY the system prompt
 * and only by replacing a marked block, so hand-written prompt above it is
 * never touched. Re-running is a no-op once every agent is current.
 */

import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ── the standard itself, compiled out of the TypeScript so there is one copy ─ */

/*
 * Node 24 strips TypeScript natively, so the module the product uses is the
 * module this script scores against. There is no second copy to fall out of
 * date, which was the entire point of putting the standard in one file.
 */
const { voiceStandard, VOICE_STANDARD_VERSION, SPELLING_RULES } = await import(
  pathToFileURL(join(ROOT, 'lib', 'voice-standard.ts')).href
);

const MARKER = /\n*THE STANDARD \(v\d+\)\.[\s\S]*$/;

/* ── credentials ──────────────────────────────────────────────────────────── */

function vapiKey() {
  let key = process.env.VAPI_PRIVATE_KEY || process.env.VAPI_API_KEY;
  const files = [join(homedir(), '.mms', 'vapi.env'), join(ROOT, '.env.local')];
  for (const f of files) {
    if (key) break;
    if (!existsSync(f)) continue;
    const m = readFileSync(f, 'utf8').match(/^\s*(?:VAPI_PRIVATE_KEY|VAPI_API_KEY)\s*=\s*"?([^"\r\n]+)"?/m);
    if (m && !/\[SENSITIVE\]/i.test(m[1])) key = m[1].trim();
  }
  if (!key) {
    console.error('No Vapi key. Put VAPI_PRIVATE_KEY in ~/.mms/vapi.env.');
    process.exit(1);
  }
  return key;
}

const api = async (path, init = {}) => {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${vapiKey()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
};

/* ── where each agent actually is ─────────────────────────────────────────────
   A receptionist that says a time in the wrong zone books a caller for an hour
   that does not exist for them. Anything unmapped is reported rather than
   silently defaulted, because a wrong guess here is worse than no guess.       */

const ZONES = {
  'Mr. Mustard': 'America/Denver',
  'Linda, The Cove Chief of Staff': 'America/Denver',
  'Huck — Hatchery Pilot Mascot': 'America/Denver',
  CONRAD: 'America/Denver',
  'Outbound Olivia': 'America/Denver',
  'Chinatown Kalispell Host': 'America/Denver',
  'Hallelujah House, Ruth': 'America/Denver',
  'Wild Horse Concrete Front Desk': 'America/Denver',
  'August · D&D Landscaping': 'America/New_York',
  "Newk's Voice Concierge — Tallahassee": 'America/New_York',
  'JR Tree Removal Concierge': 'America/New_York',
  'CertaPro Concierge — Tampa': 'America/New_York',
  'Franklin Plumbing Concierge — Tampa': 'America/New_York',
  'Hall Roofing Concierge - Bonifay': 'America/Chicago',
  'Just Botox Concierge, Tempe': 'America/Phoenix',
  'Serabella Concierge, Beverly Hills': 'America/Los_Angeles',
  'Pipe Pilot': 'America/Denver',
  'SF TRUCKING': 'America/Denver',
};

/** The booking pair, if this agent can genuinely put something on a calendar. */
function bookingPair(assistant) {
  const names = (assistant.model?.tools ?? []).map((t) => t.function?.name).filter(Boolean);
  const check = names.find((n) => /^(check_availability|get_available_slots|get_slots)$/.test(n));
  const book = names.find((n) => /^book_/.test(n));
  return check && book ? { check, book } : null;
}

const skip = (name) => name.startsWith('__') || name.startsWith('RETIRED');

/* ── the checks ───────────────────────────────────────────────────────────── */

const CHECKS = [
  // A version bump has to reach every agent, or the module moves on alone and
  // the org quietly runs last month's rules.
  ['VERSION', 'carries the current version of the standard', (p) => p.includes(`THE STANDARD (v${VOICE_STANDARD_VERSION}).`)],
  ['CLOCK', 'knows what day it is', (p) => /\{\{\s*["']?now["']?\s*[|}]/.test(p)],
  ['SPEECH', 'no filler, no stalling, no naming the system', (p) => /NO FILLER/.test(p) && /NEVER NARRATE YOUR OWN MACHINERY/.test(p)],
  ['HONEST', 'cannot invent a price, a review or a capability', (p) => /Never invent a price/.test(p)],
  // Counting, not matching. The failure this catches is two copies, not none:
  // the rules were pasted into prompts by hand before the module existed.
  ['SPELL', 'exactly one copy of the spelling standard', (p) => (p.match(/SPELL ANCHORED, ALWAYS/g) ?? []).length === 1],
  ['CAL', 'never constructs a date, offers only what is open', (p) => /NEVER WORK OUT A DATE YOURSELF/.test(p) && /OFFER ONLY WHAT CAME BACK/.test(p)],
];

function score(assistant) {
  const prompt = assistant.model?.messages?.[0]?.content ?? '';
  const booking = bookingPair(assistant);
  const applicable = CHECKS.filter(([key]) => key !== 'CAL' || booking);
  const missing = applicable.filter(([, , fn]) => !fn(prompt)).map(([k]) => k);
  return { prompt, booking, missing, total: applicable.length };
}

/*
 * The spelling standard used to be a section pasted into each prompt by hand.
 * The module carries it now, lifted verbatim, so the pasted copy has to come
 * out or every agent holds the same twelve rules twice and the two copies drift
 * apart. Stripping here is what makes the apply idempotent: run it after
 * somebody pastes the old section back in and the duplicate disappears again.
 *
 * ── WHY LINE BY LINE AND NOT THE WHOLE SECTION ───────────────────────────────
 * Cutting the section wholesale would have deleted four rules that are Mr.
 * Mustard's alone: the escape hatch that reads {{customer.number}} back when a
 * spelling has failed twice, and two about not calling a tool before an address
 * is confirmed. They live inside the same section, under a line saying the
 * studio standard above is the law and these are his on top of it. A shared
 * rule and an agent's own rule sitting in one block is exactly the case a blunt
 * strip gets wrong, and it would have been silent.
 *
 * So: drop only the lines the module itself now carries, keep everything else,
 * and drop the heading only if nothing of the agent's own was left under it.
 */
function stripPastedSpelling(prompt) {
  const start = prompt.search(/^#+ Letters, numbers and addresses[^\n]*$/m);
  if (start < 0) return prompt;
  const after = prompt.slice(start + 1);
  const rel = after.search(/^(#+ |[A-Z][A-Z0-9 ,'()]{6,}:?$)/m);
  const end = rel < 0 ? prompt.length : start + 1 + rel;

  const canon = new Set(SPELLING_RULES.map((r) => r.trim()));
  const lines = prompt.slice(start, end).split('\n');
  const heading = lines[0];
  const kept = lines.slice(1).filter((l) => {
    const t = l.replace(/^\s*-\s*/, '').trim();
    if (!t) return false;
    if (canon.has(t)) return false;
    // The section's own preamble says these rules were measured on real calls.
    // The module says it better, in the comment above SPELLING_RULES.
    if (/^Anything a caller has to write down/.test(t)) return false;
    if (/^THE STUDIO STANDARD ABOVE IS THE LAW/.test(t)) return false;
    return true;
  });

  const replacement = kept.length
    ? `${heading.replace(/\s*\(studio standard v\d+\)/, ' (yours, on top of the studio standard)')}\n${kept.join('\n')}\n`
    : '';
  return (prompt.slice(0, start) + replacement + prompt.slice(end)).replace(/\n{3,}/g, '\n\n');
}

/** The prompt with the standard block replaced (or appended if it had none). */
function restandardise(assistant) {
  const { prompt, booking } = score(assistant);
  const timezone = ZONES[assistant.name];
  const body = stripPastedSpelling(prompt.replace(MARKER, '')).trimEnd();
  const block = voiceStandard({ timezone: timezone ?? 'America/New_York', booking });
  return { next: `${body}\n\n${block}\n`, timezone };
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const value = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : null);

const only = value('--only');
const diffFor = value('--diff');
const apply = flag('--apply');

const all = (await api('/assistant?limit=100')).filter((a) => !skip(a.name ?? ''));
const targets = all.filter((a) => (only ? (a.name ?? '').includes(only) : true));

if (diffFor) {
  const a = all.find((x) => (x.name ?? '').includes(diffFor));
  if (!a) {
    console.error(`No assistant matching "${diffFor}".`);
    process.exit(1);
  }
  const { next } = restandardise(a);
  const before = a.model?.messages?.[0]?.content ?? '';
  console.log(`${a.name}\n${'='.repeat(70)}`);
  console.log(`prompt ${before.length} -> ${next.length} chars`);
  console.log(next.slice(before.replace(MARKER, '').trimEnd().length));
} else {

console.log(`THE VOICE STANDARD v${VOICE_STANDARD_VERSION}${apply ? '  (applying)' : '  (audit only, pass --apply to write)'}\n`);

let clean = 0;
let written = 0;
const failed = [];
const unmapped = [];
for (const a of targets) {
  const { missing, total, booking } = score(a);
  const tz = ZONES[a.name];
  if (!tz) unmapped.push(a.name);
  const label = (a.name ?? '?').slice(0, 36).padEnd(37);
  const grade = `${total - missing.length}/${total}`;

  if (!missing.length) {
    clean += 1;
    console.log(`  ok   ${label}${grade}`);
    continue;
  }
  console.log(`  GAP  ${label}${grade}  missing: ${missing.join(' ')}${booking ? '  [books]' : ''}`);

  if (!apply) continue;
  const { next } = restandardise(a);
  // Only the messages array changes. Spreading the model keeps each agent's
  // own provider, temperature and tools exactly as they were.
  const model = { ...a.model, messages: [{ role: 'system', content: next }] };
  try {
    await api(`/assistant/${a.id}`, { method: 'PATCH', body: JSON.stringify({ model }) });
    console.log(`       written, prompt now ${next.length} chars`);
    written += 1;
  } catch (err) {
    // One agent Vapi will not take must not stop the other seventeen. The run
    // reports it at the end instead of dying halfway through the org.
    failed.push([a.name, err instanceof Error ? err.message : String(err)]);
    console.log(`       FAILED, left as it was`);
  }
}

console.log(`\n${clean}/${targets.length} already at the standard.`);
if (unmapped.length) {
  console.log(`\nNo timezone mapped, defaulted to America/New_York. Add them to ZONES:`);
  for (const n of unmapped) console.log(`  ${n}`);
}
if (!apply && clean < targets.length) console.log('\nRun again with --apply to write the standard.');
}
