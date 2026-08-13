#!/usr/bin/env node
/**
 * Inventory every Vapi assistant and phone number on the org, and flag drift
 * between the LIVE Mr. Mustard and what setup-vapi-mustard.mjs would push.
 *
 * Usage:
 *   node scripts/vapi-assistants.mjs           # the roster, human readable
 *   node scripts/vapi-assistants.mjs --json    # raw JSON for piping
 *   node scripts/vapi-assistants.mjs --full    # add tool params + prompt head
 *
 * Needs VAPI_API_KEY: the PRIVATE key, from Vapi dashboard > Settings > API Keys.
 * The public key cannot list assistants; it only starts web calls from a browser.
 *
 * Prints NO secrets. Keys, webhook secrets and tokens are never echoed, so the
 * output is safe to paste into a chat, an issue, or a PR.
 */

import { readFileSync } from 'node:fs';
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

// Same placeholder trap as setup-vapi-mustard.mjs: `vercel env pull` writes the
// literal "[SENSITIVE]" for write-only Vercel vars, and it is truthy, so it
// would sail into an Authorization header and come back as a confusing 401
// rather than an obvious config problem.
const PLACEHOLDER = '[SENSITIVE]';
const env = (k) => {
  const v = process.env[k] ?? fileEnv[k];
  return v === PLACEHOLDER ? undefined : v;
};

const VAPI_API_KEY = env('VAPI_API_KEY');
const JSON_OUT = process.argv.includes('--json');
const FULL = process.argv.includes('--full');

if (!VAPI_API_KEY) {
  console.error(
    `\nNo usable VAPI_API_KEY.\n\n` +
      `Every Vapi var in .env.local is the literal "${PLACEHOLDER}" placeholder,\n` +
      `because \`vercel env pull\` cannot read back variables marked Sensitive in\n` +
      `Vercel. They are write-only there, permanently.\n\n` +
      `Get the PRIVATE key from the Vapi dashboard (Settings > API Keys) and put\n` +
      `it in .env.local as VAPI_API_KEY. The public key will not work here: it\n` +
      `only starts browser calls and cannot list or edit assistants.\n`
  );
  process.exit(1);
}

async function vapi(path) {
  const res = await fetch(`https://api.vapi.ai${path}`, {
    headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.message || res.statusText;
    if (res.status === 401) {
      console.error(
        `\nVapi rejected the key (401): ${msg}\n\n` +
          `That message usually means the PUBLIC key is in VAPI_API_KEY. Listing\n` +
          `assistants needs the PRIVATE key.\n`
      );
    } else {
      console.error(`\nVapi GET ${path} failed (${res.status}): ${msg}\n`);
    }
    process.exit(1);
  }
  // Vapi has returned both a bare array and a paginated object over time, so
  // accept either rather than breaking on a shape change.
  return Array.isArray(body) ? body : (body?.results ?? []);
}

/* ── What the repo intends, read from source so it cannot drift silently ──
 * The transfer number is parsed out of setup-vapi-mustard.mjs rather than typed
 * here, matching that script's own "derived, never typed" rule for prices. If
 * the anchor moves, we say so instead of quietly comparing against nothing. */
function expectedTransferNumber() {
  try {
    const src = readFileSync(resolve(__dirname, 'setup-vapi-mustard.mjs'), 'utf8');
    const i = src.indexOf("type: 'transferCall'");
    if (i === -1) return null;
    const m = /number:\s*'(\+?\d+)'/.exec(src.slice(i, i + 800));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const [assistants, phoneNumbers] = await Promise.all([
  vapi('/assistant?limit=1000'),
  vapi('/phone-number?limit=1000').catch(() => []),
]);

if (JSON_OUT) {
  console.log(JSON.stringify({ assistants, phoneNumbers }, null, 2));
  process.exit(0);
}

const expectedTransfer = expectedTransferNumber();
const numbersByAssistant = new Map();
for (const n of phoneNumbers) {
  if (!n.assistantId) continue;
  if (!numbersByAssistant.has(n.assistantId)) numbersByAssistant.set(n.assistantId, []);
  numbersByAssistant.get(n.assistantId).push(n.number || n.id);
}

console.log(`\n${assistants.length} assistant(s) on this Vapi org\n${'='.repeat(60)}`);

for (const a of assistants) {
  const tools = a.model?.tools ?? [];
  const fnNames = tools.filter((t) => t.function?.name).map((t) => t.function.name);
  const transfer = tools.find((t) => t.type === 'transferCall');
  const dest = transfer?.destinations?.[0];
  const numbers = numbersByAssistant.get(a.id) ?? [];
  const sysPrompt = (a.model?.messages ?? []).find((m) => m.role === 'system')?.content ?? '';

  console.log(`\n${a.name || '(unnamed)'}`);
  console.log(`  id            ${a.id}`);
  console.log(`  model         ${a.model?.provider ?? '?'} / ${a.model?.model ?? '?'}  temp ${a.model?.temperature ?? '-'}`);
  console.log(`  voice         ${a.voice?.provider ?? '?'} / ${a.voice?.voiceId ?? '?'}`);
  console.log(`  transcriber   ${a.transcriber?.provider ?? '?'} / ${a.transcriber?.model ?? '?'}`);
  console.log(`  prompt        ${sysPrompt.length} chars`);
  console.log(`  tools (${fnNames.length})    ${fnNames.join(', ') || 'none'}`);
  console.log(`  phone         ${numbers.join(', ') || 'not attached to a number'}`);
  // Webhook auth state IS knowable, just not where you would first look. Vapi
  // never returns server.secret itself (the server object is {url,
  // timeoutSeconds}), but it exposes the BOOLEAN `isServerUrlSecretSet` at the
  // top level. Read that, never server.secret, or you will conclude every
  // assistant is unprotected and start ignoring a real alarm.
  // An unprotected webhook means anyone who learns the URL can POST forged tool
  // calls to it: book jobs, capture leads, hit customer lookups.
  if (a.server?.url) {
    console.log(`  webhook       ${a.server.url}${a.isServerUrlSecretSet ? ' (secret set)' : '  ⚠ UNPROTECTED, no secret'}`);
  } else {
    console.log(`  webhook       none`);
  }

  if (dest) {
    const match = expectedTransfer ? (dest.number === expectedTransfer ? 'matches repo' : `DRIFT, repo says ${expectedTransfer}`) : 'repo anchor not found';
    console.log(`  warm transfer ${dest.number} [${match}] ${dest.transferPlan?.mode ?? ''}`);
  } else if (expectedTransfer && a.name === 'Mr. Mustard') {
    console.log(`  warm transfer MISSING. Repo defines ${expectedTransfer}, live agent has no transferCall.`);
  }

  // A placeholder secret still cannot be distinguished from a real one here,
  // since only the boolean is exposed. That guard lives in setup-vapi-mustard.mjs
  // where a bad value is caught BEFORE the write rather than hunted afterwards.

  if (FULL) {
    console.log(`  first msg     ${JSON.stringify(a.firstMessage ?? '')}`);
    console.log(`  prompt head   ${JSON.stringify(sysPrompt.slice(0, 200))}...`);
  }
}

const orphanNumbers = phoneNumbers.filter((n) => !n.assistantId);
if (orphanNumbers.length) {
  console.log(`\n${'='.repeat(60)}\n${orphanNumbers.length} phone number(s) with no assistant attached:`);
  for (const n of orphanNumbers) console.log(`  ${n.number || n.id}`);
}

/* ── Summary of things that need a human ──────────────────────────────
 * Per-assistant lines scroll away in a 22 item list, so anything actionable is
 * repeated at the bottom where it lands last and gets read. */
const unprotected = assistants.filter((a) => a.server?.url && !a.isServerUrlSecretSet);
if (unprotected.length) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`⚠ ${unprotected.length} UNPROTECTED WEBHOOK(S). No secret set, so anyone who`);
  console.log(`  learns the URL can POST forged tool calls to it:`);
  for (const a of unprotected) console.log(`    ${a.name || a.id}`);
}

// Zero-prompt, zero-tool, no-number assistants are leftover probes from voice
// sampling. Harmless, but they bury the real agents in every listing.
const junk = assistants.filter(
  (a) => !(a.model?.messages ?? []).some((m) => m.content) && !(a.model?.tools ?? []).length && !numbersByAssistant.has(a.id)
);
if (junk.length) {
  console.log(`\n${junk.length} empty assistant(s) with no prompt, tools, or number (cleanup candidates):`);
  console.log(`    ${junk.map((a) => a.name || a.id).join(', ')}`);
}

console.log('');
