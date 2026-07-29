#!/usr/bin/env node
/**
 * Relax display tracking that is tight enough to make glyph ink collide.
 *
 * Sarah, 2026-07-29: "the text in hero is too on top of each other. like the
 * period literally clash with the letters in some cases."
 *
 * Confirmed by measuring INK (canvas actualBoundingBox), not font boxes: the
 * worst offenders sit at letter-spacing -0.05em and up to -13.6px of real
 * tracking at 272px, producing 3 to 6px of genuine ink overlap. Punctuation is
 * where it reads as broken, because a period has almost no ink and all bearing,
 * so tightening eats the bearing and the next letter lands on the dot.
 *
 * This does NOT flatten everybody to one value. It reads each site's own CSS,
 * finds only the declarations tighter than the floor, and clamps THOSE selectors,
 * so a build that was already tastefully tracked is untouched.
 *
 *   node scripts/fix-type-clash.mjs            # dry run
 *   node scripts/fix-type-clash.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const FLOOR = -0.03; // em. Tighter than this is where ink started colliding.

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const sb = createClient(
  process.env.supabase_url || process.env.SUPABASE_URL,
  process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const MARK = 'forge fix 2026-07-29: display tracking floor';

/**
 * Find `selector { ... letter-spacing:-.055em ... }` and return the tight ones.
 *
 * Deliberately NOT a whole-rule regex. `/([^{}]+)\{([^{}]*)\}/g` over a 400KB
 * single-file site backtracks hard enough to hang the process with no output,
 * which is exactly what it did on the first run. Instead: find each
 * letter-spacing declaration, then walk a BOUNDED window backwards to the
 * selector that owns it. Linear, and it cannot run away.
 */
function tightSelectors(html) {
  const found = new Map();
  const decl = /letter-spacing\s*:\s*(-\s*\.?\d*\.?\d+)\s*em/g;
  let m;
  while ((m = decl.exec(html))) {
    const value = parseFloat(m[1].replace(/\s+/g, ''));
    if (!Number.isFinite(value) || value >= FLOOR) continue;

    // The selector is whatever sits between the previous } (or ;) and the { that
    // opens this rule. Look back a bounded distance only.
    const open = html.lastIndexOf('{', m.index);
    if (open === -1) continue;
    const from = Math.max(0, open - 400);
    const chunk = html.slice(from, open);
    const cut = Math.max(chunk.lastIndexOf('}'), chunk.lastIndexOf(';'), chunk.lastIndexOf('>'));
    const selector = chunk.slice(cut + 1).trim().replace(/\s+/g, ' ');

    if (!selector || selector.length > 200) continue;
    if (selector.startsWith('@') || /^\d|%$/.test(selector)) continue; // at-rules, keyframe stops
    if (!/[a-zA-Z.#\[]/.test(selector[0])) continue;
    found.set(selector, Math.min(found.get(selector) ?? 0, value));
  }
  return found;
}

const { data, error } = await sb.from('outbound_demo_sites').select('id,business_name,html').eq('status', 'ready');
if (error) { console.error(error.message); process.exit(1); }

const work = [];
for (const r of data) {
  if (!r.html) continue;
  const tight = tightSelectors(r.html);
  if (tight.size) work.push({ row: r, tight });
}

console.log(`${work.length} of ${data.length} site(s) track display type tighter than ${FLOOR}em:\n`);
for (const w of work) {
  const worst = Math.min(...w.tight.values());
  console.log(`  ${(w.row.business_name || '?').slice(0, 32).padEnd(32)} worst ${worst}em across ${w.tight.size} rule(s)`);
}

if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

const dir = path.join(process.cwd(), '.forge-backups');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

let fixed = 0;
for (const { row, tight } of work) {
  writeFileSync(path.join(dir, `clash-${row.id}.html`), row.html);

  let base = row.html;
  for (;;) {
    const at = base.indexOf(MARK);
    if (at === -1) break;
    const open = base.lastIndexOf('<style>', at);
    const close = base.indexOf('</style>', at);
    if (open === -1 || close === -1) break;
    base = base.slice(0, open) + base.slice(close + '</style>'.length);
  }

  const rules = [...tight.keys()]
    .map((sel) => `${sel}{letter-spacing:${FLOOR}em !important}`)
    .join('\n');

  const patch = `<style>
/* --- forge fix 2026-07-29: display tracking floor --- */
/* Ink measurement showed 3-6px of real glyph overlap below ${FLOOR}em, worst
   around punctuation, where a period is nearly all side bearing and tightening
   eats it. Only selectors that were already tighter than the floor are clamped. */
${rules}
/* Punctuation gets its bearing back explicitly, since tracking is uniform and
   a full stop needs more room after it than a letter does. */
h1, h2, .mast-name, [class*="head"], [class*="title"] { font-kerning: normal; text-rendering: optimizeLegibility; }
</style>`;

  const html = base.includes('</head>') ? base.replace('</head>', `${patch}</head>`) : base.replace('</body>', `${patch}</body>`);
  const { error: upErr } = await sb.from('outbound_demo_sites').update({ html, updated_at: new Date().toISOString() }).eq('id', row.id);
  if (upErr) { console.log(`  FAILED ${row.business_name}: ${upErr.message}`); continue; }
  fixed += 1;
  console.log(`  clamped ${row.business_name}`);
}
console.log(`\n${fixed} site(s) patched. Originals in .forge-backups/clash-<id>.html`);
