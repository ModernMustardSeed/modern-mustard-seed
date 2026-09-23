/**
 * What would a push change on Mr. Mustard's live line?
 *
 *   node scripts/vapi-mustard-diff.mjs rendered.json               print the diff
 *   node scripts/vapi-mustard-diff.mjs rendered.json --expect-same exit 1 if live differs
 *
 * rendered.json is `node scripts/setup-vapi-mustard.mjs --emit rendered.json`.
 * Compares the system prompt line by line, plus the first message, voice and
 * the tool names, against the live assistant. Read-only: it only ever GETs.
 * Used by .github/workflows/vapi-mustard.yml so a push is reviewed before it
 * happens and confirmed after.
 */
import { readFileSync } from 'node:fs';

const ID = 'faf7f2c4-9cfd-4fcd-9c1a-73b7c9a38eee';
const [file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const expectSame = process.argv.includes('--expect-same');
const key = process.env.VAPI_API_KEY;

if (!file || !key) {
  console.error('Usage: VAPI_API_KEY=... node scripts/vapi-mustard-diff.mjs rendered.json [--expect-same]');
  process.exitCode = 1;
} else {
  const want = JSON.parse(readFileSync(file, 'utf8'));
  const res = await fetch(`https://api.vapi.ai/assistant/${ID}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) {
    console.error(`Could not read the live assistant (${res.status}).`);
    process.exitCode = 1;
  } else {
    const live = await res.json();
    const prompt = (a) => (a?.model?.messages ?? []).find((m) => m.role === 'system')?.content ?? '';
    const a = prompt(live).split('\n');
    const b = prompt(want).split('\n');

    // Line-level diff by longest common subsequence; prompts are a few hundred lines.
    const n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = [];
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[i] === b[j]) { i++; j++; }
      else if (j < m && (i === n || L[i][j + 1] >= L[i + 1][j])) out.push(`+ ${b[j++]}`);
      else out.push(`- ${a[i++]}`);
    }

    const tools = (x) => (x?.model?.tools ?? []).map((t) => t.function?.name ?? t.type).sort().join(', ');
    const extra = [];
    if ((live.firstMessage ?? '') !== (want.firstMessage ?? '')) extra.push(`firstMessage\n  live: ${live.firstMessage}\n  push: ${want.firstMessage}`);
    if (JSON.stringify(live.voice?.voiceId) !== JSON.stringify(want.voice?.voiceId)) extra.push(`voice: ${live.voice?.voiceId} -> ${want.voice?.voiceId}`);
    if (tools(live) !== tools(want)) extra.push(`tools\n  live: ${tools(live)}\n  push: ${tools(want)}`);

    console.log(`Live prompt ${prompt(live).length} chars, pushed prompt ${prompt(want).length} chars.`);
    console.log(`Webhook secret set on live: ${live.isServerUrlSecretSet ? 'yes' : 'NO'}`);
    if (!out.length && !extra.length) console.log('No difference: live matches the render.');
    else {
      if (out.length) console.log(`\nPrompt lines (- live, + push):\n${out.map((l) => l.slice(0, 400)).join('\n')}`);
      if (extra.length) console.log(`\n${extra.join('\n')}`);
    }
    if (expectSame && (out.length || extra.length)) process.exitCode = 1;
  }
}
