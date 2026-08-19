#!/usr/bin/env node
/**
 * AUDIT: does every live agent actually carry the readback standard?
 *
 *   node scripts/vapi-readback-audit.mjs
 *
 * Installing is not proving. This reads every agent back from Vapi and checks
 * for the version heading plus the three rules that were each learned from a
 * real broken call, so "all agents are at this standard" stays a fact somebody
 * can re-run rather than a thing that was true once.
 *
 * ⚠️ IT CHECKS THE FLAGSHIP TOO. Mr. Mustard used to carry a hand-written
 * version of these rules that said the same things in different words, which
 * meant nothing could prove he matched the fleet he is the flagship of. He now
 * reads the same text, and this audit is what keeps that honest.
 *
 * Exits non-zero when an agent is behind, so it can gate CI. Skips the __probe
 * artifacts and anything with no prompt. Needs the PRIVATE VAPI_API_KEY.
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

const fileEnv = loadEnvFile(resolve(__dirname, '../.env.local'));
const real = (v) => (v && !/^\[SENSITIVE\]$/i.test(v) ? v : '');
const KEY = real(process.env.VAPI_API_KEY) || real(fileEnv.VAPI_API_KEY) || real(fileEnv.VAPI_PRIVATE_KEY);

if (!KEY) {
  console.error('\nMissing VAPI_API_KEY (the PRIVATE key). Nothing was contacted.\n');
  process.exitCode = 1;
} else {
  /**
   * One check per rule, and each one exists because a real call went wrong
   * without it. Matching on the wording is the point: a paraphrase is exactly
   * the drift this audit is here to catch.
   */
  const CHECKS = [
    ['v2 heading', /studio standard v2/],
    ['no numerals', /NEVER WRITE A NUMERAL/],
    ['anchored spelling', /SPELL ANCHORED, ALWAYS/],
    ['say it once', /SAY IT ONCE, THEN STOP/],
  ];

  const res = await fetch('https://api.vapi.ai/assistant?limit=100', { headers: { Authorization: `Bearer ${KEY}` } });
  if (!res.ok) {
    console.error(`\nCould not list assistants (${res.status}).\n`);
    process.exitCode = 1;
  } else {
    const list = await res.json();
    let ok = 0;
    let bad = 0;
    let skipped = 0;

    for (const a of list) {
      const name = a.name ?? '(unnamed)';
      const prompt = (a.model?.messages ?? []).find((m) => m.role === 'system')?.content ?? '';
      if (!prompt.trim() || /^__(probe|voiceprobe)/i.test(name)) {
        skipped++;
        continue;
      }
      const missing = CHECKS.filter(([, re]) => !re.test(prompt)).map(([label]) => label);
      if (missing.length) {
        console.log(`${name.padEnd(38)} MISSING: ${missing.join(', ')}`);
        bad++;
      } else {
        ok++;
      }
    }

    console.log(`\n${ok} agent(s) carry the full v2 standard, ${bad} do not, ${skipped} skipped.`);
    if (bad) {
      console.log('\nFix with: node scripts/vapi-spelling.mjs --apply');
      console.log('Mr. Mustard is fixed with: node scripts/setup-vapi-mustard.mjs --update <id>\n');
      process.exitCode = 1;
    }
  }
}
