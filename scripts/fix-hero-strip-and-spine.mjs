#!/usr/bin/env node
/**
 * Two hero fixes Sarah called on Tiger Concrete, 2026-07-29.
 *
 * 1. THE FACT STRIP HAD NO PLATE. "the sub hero area with the strip that say bbb
 *    and what they are, its not viewable right bc of the pic, there needs to be
 *    more space between so they dont overlap." It was floated straight onto the
 *    photograph, and on Tiger it landed on the brightest, busiest part of a wet
 *    concrete reflection. Credentials are the trust line; they cannot be the
 *    hardest thing on the page to read. It now gets its own solid band and real
 *    breathing room above.
 *
 * 2. THE VERTICAL SPINE IS GONE. "the vertical word on the right is crazy and
 *    doesnt need to be there." It was rotated 90deg credential text down the right
 *    edge, which nobody turns their head to read, and on Tiger it was carrying
 *    real information (Woman-Owned, WBE/DBE Certified) where it could not be used.
 *
 * Selectors are derived per build, because assuming our own class names has now
 * silently no-opped a fleet patch twice.
 *
 *   node scripts/fix-hero-strip-and-spine.mjs           # dry run
 *   node scripts/fix-hero-strip-and-spine.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const MARK = 'forge fix 2026-07-29: hero strip plate and spine removal';

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

/** Any class this build rotates into a vertical rail. */
function spineSelectors(html) {
  const out = new Set();
  const re = /(writing-mode\s*:\s*vertical|rotate\(\s*-?90deg\s*\))/g;
  let m;
  while ((m = re.exec(html))) {
    const open = html.lastIndexOf('{', m.index);
    if (open === -1) continue;
    const from = Math.max(0, open - 300);
    const chunk = html.slice(from, open);
    const cut = Math.max(chunk.lastIndexOf('}'), chunk.lastIndexOf(';'), chunk.lastIndexOf('>'));
    const sel = chunk.slice(cut + 1).trim().replace(/\s+/g, ' ');
    if (!sel || sel.length > 120 || sel.startsWith('@')) continue;
    if (!/^[.#a-zA-Z\[]/.test(sel)) continue;
    // never hide the whole hero because it happened to contain a rotation
    if (/^(body|html|\.hero|main|section)$/i.test(sel)) continue;
    out.add(sel);
  }
  return [...out];
}

/**
 * The credential / fact strip that sits at the foot of the hero.
 *
 * Three gates, each one a bug this script already made:
 *  - the prefix is OPTIONAL, or ".factstrip" never matches and the run reports
 *    success while changing nothing;
 *  - the class has to actually appear inside the hero markup, or a ".badge" in
 *    the footer gets a dark plate bolted onto it;
 *  - BEM children are dropped when their parent matched, or every item inside the
 *    strip gets its own plate and its own 28px of air and the row falls apart.
 */
function stripSelectors(html) {
  const hero = heroMarkup(html);
  const found = new Set();
  for (const m of html.matchAll(/\.([a-z0-9_-]*(?:fact|trust|cred|badge|proof)[a-z0-9_-]*)\s*\{/gi)) {
    const cls = m[1];
    if (!new RegExp(`class="[^"]*\\b${cls}\\b`, 'i').test(hero)) continue;
    found.add(cls);
  }
  const kept = [...found].filter(
    (c) => ![...found].some((p) => p !== c && c.startsWith(p) && /^[_-]/.test(c.slice(p.length))),
  );
  return kept.map((c) => '.' + c);
}

/** Markup from <body> to the end of the first section: everything above the fold. */
function heroMarkup(html) {
  const start = html.indexOf('<body');
  const from = start === -1 ? 0 : start;
  const end = html.indexOf('</section>', from);
  return html.slice(from, end === -1 ? from + 12000 : end);
}

const { data, error } = await sb.from('outbound_demo_sites').select('id,business_name,html').eq('status', 'ready');
if (error) { console.error(error.message); process.exit(1); }

const plan = [];
for (const r of data) {
  if (!r.html) continue;
  const spines = spineSelectors(r.html);
  const strips = stripSelectors(r.html);
  if (!spines.length && !strips.length) continue;
  plan.push({ row: r, spines, strips });
}

console.log(`${plan.length} site(s) to adjust:\n`);
for (const p of plan) {
  console.log(`  ${(p.row.business_name || '?').slice(0, 30).padEnd(30)} spine:${p.spines.length}  strip:${p.strips.length}`);
}
if (!APPLY) { console.log('\nDry run. Re-run with --apply.'); process.exit(0); }

const backups = path.join(process.cwd(), '.forge-backups');
if (!existsSync(backups)) mkdirSync(backups, { recursive: true });

let fixed = 0;
for (const { row, spines, strips } of plan) {
  // Never overwrite a snapshot. A re-run reads rows this script already patched,
  // and blindly re-writing the backup would replace the true original with a
  // patched copy, quietly destroying the rollback path.
  const snap = path.join(backups, `strip-${row.id}.html`);
  if (!existsSync(snap)) writeFileSync(snap, row.html);

  let base = row.html;
  for (;;) {
    const at = base.indexOf(MARK);
    if (at === -1) break;
    const open = base.lastIndexOf('<style>', at);
    const close = base.indexOf('</style>', at);
    if (open === -1 || close === -1) break;
    base = base.slice(0, open) + base.slice(close + '</style>'.length);
  }

  const rules = [];
  if (spines.length) {
    rules.push(`/* the vertical rail: nobody turns their head to read it */`);
    rules.push(`${spines.join(', ')} { display: none !important; }`);
  }
  if (strips.length) {
    rules.push(`/* credentials get their own plate and real air, never raw photograph */`);
    rules.push(
      `${strips.join(', ')} {` +
        'background: rgba(10,12,16,.82) !important;' +
        '-webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);' +
        'padding: 16px 22px !important;' +
        'margin-top: 28px !important;' +
        'border-radius: 3px;' +
        'border-top: 1px solid rgba(255,255,255,.14) !important;' +
        'row-gap: 10px !important;' +
        '}',
    );
  }

  const patch = `<style>\n/* --- ${MARK} --- */\n${rules.join('\n')}\n</style>`;
  const html = base.includes('</head>') ? base.replace('</head>', `${patch}</head>`) : base.replace('</body>', `${patch}</body>`);

  const { error: upErr } = await sb.from('outbound_demo_sites').update({ html, updated_at: new Date().toISOString() }).eq('id', row.id);
  if (upErr) { console.log(`  FAILED ${row.business_name}: ${upErr.message}`); continue; }
  fixed += 1;
  console.log(`  fixed ${row.business_name}`);
}
console.log(`\n${fixed} site(s) patched. Originals in .forge-backups/strip-<id>.html`);
