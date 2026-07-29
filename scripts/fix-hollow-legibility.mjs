#!/usr/bin/env node
/**
 * Make THE OUTLINE MOMENT legible on already-shipped demo sites.
 *
 * The bug: a hero word rendered `color:transparent` with a hairline
 * -webkit-text-stroke sits over the busiest, darkest part of the hero photograph
 * and simply disappears. On Lined Up Barber Shop the word "UP" in the brand name
 * was invisible against the client's head.
 *
 * This does NOT delete the outline moment, which is Sarah's taste call. It gives
 * the hollow word three things it was missing:
 *   1. a faint fill of the accent, so the counters carry some colour instead of
 *      showing raw photograph
 *   2. a thicker stroke
 *   3. a dark halo, so the outline separates from whatever is behind it
 * plus a scrim directly behind the wordmark, which the law already asks for
 * ("scrim only where the type actually sits") but which nothing enforced.
 *
 *   node scripts/fix-hollow-legibility.mjs                 # list affected sites
 *   node scripts/fix-hollow-legibility.mjs --apply         # fix all of them
 *   node scripts/fix-hollow-legibility.mjs --apply --id X  # fix one
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const ONLY = process.argv.includes('--id') ? process.argv[process.argv.indexOf('--id') + 1] : null;

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

/** The patch, appended so it wins on cascade order without rewriting their CSS. */
const PATCH = `
/* --- forge fix 2026-07-29: hollow hero words must survive the photograph --- */
[class*="hollow"], .mast-name .hollow, h1 .hollow {
  /* a faint fill so the counters are not raw photograph */
  /* 26% read as mud over a dark photograph. The fill has to carry the brand
     colour at real strength, with the stroke brighter than the fill so the
     outline still reads as an outline. */
  color: color-mix(in srgb, var(--accent, #14b8a6) 72%, transparent) !important;
  -webkit-text-stroke-width: 3px !important;
  -webkit-text-stroke-color: color-mix(in srgb, var(--accent, #14b8a6) 100%, white 22%) !important;
  paint-order: stroke fill;
  /* the halo is what actually separates an outline from a busy plate */
  text-shadow: 0 0 2px rgba(0,0,0,.7), 0 3px 22px rgba(0,0,0,.7), 0 0 60px rgba(0,0,0,.5) !important;
}
@supports not (color: color-mix(in srgb, red 50%, transparent)) {
  [class*="hollow"], .mast-name .hollow, h1 .hollow { color: var(--accent, #14b8a6) !important; }
}
/* Solid hero words get the same halo: the photo behind them is just as busy. */
.mast-name, .hero h1, header h1 {
  text-shadow: 0 2px 22px rgba(0,0,0,.45);
}
/* Scrim exactly where the wordmark sits, which the law asks for and nothing enforced. */
.mast-name::before {
  content: "";
  position: absolute;
  inset: -0.18em -0.4em -0.12em -0.4em;
  z-index: -1;
  pointer-events: none;
  background: radial-gradient(60% 120% at 30% 50%, rgba(8,6,4,.62), rgba(8,6,4,0) 72%);
}
`;

const MARK = 'forge fix 2026-07-29: hollow hero words';

let q = sb.from('outbound_demo_sites').select('id,business_name,html,status').eq('status', 'ready');
if (ONLY) q = q.eq('id', ONLY);
const { data, error } = await q;
if (error) {
  console.error(error.message);
  process.exit(1);
}

const affected = data.filter(
  (r) => r.html && /-webkit-text-stroke\s*:\s*[\d.]+px/.test(r.html) && /color\s*:\s*transparent/.test(r.html),
);

console.log(`${affected.length} of ${data.length} ready site(s) use hollow hero type:\n`);
for (const r of affected) {
  const done = r.html.includes(MARK);
  console.log(`  ${(r.business_name || '?').slice(0, 34).padEnd(34)} ${done ? 'already fixed' : 'needs fix'}`);
}

if (!APPLY) {
  console.log('\nDry run. Re-run with --apply.');
  process.exit(0);
}

const dir = path.join(process.cwd(), '.forge-backups');
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

let fixed = 0;
for (const r of affected) {
  writeFileSync(path.join(dir, `html-${r.id}.html`), r.html);
  // Strip any earlier version of this patch so re-running replaces rather than
  // stacks. Done by index rather than regex: the marker is a fixed string and a
  // regex here only invites escaping bugs.
  let base = r.html;
  for (;;) {
    const at = base.indexOf(MARK);
    if (at === -1) break;
    const open = base.lastIndexOf('<style>', at);
    const close = base.indexOf('</style>', at);
    if (open === -1 || close === -1) break;
    base = base.slice(0, open) + base.slice(close + '</style>'.length);
  }

  // Append inside </head> if there is one, else before </body>. Appending means it
  // wins the cascade without touching a single line the build wrote.
  const style = `<style>${PATCH}</style>`;
  const html = base.includes('</head>')
    ? base.replace('</head>', `${style}</head>`)
    : base.replace('</body>', `${style}</body>`);

  const { error: upErr } = await sb
    .from('outbound_demo_sites')
    .update({ html, updated_at: new Date().toISOString() })
    .eq('id', r.id);
  if (upErr) {
    console.log(`  FAILED ${r.business_name}: ${upErr.message}`);
    continue;
  }
  fixed += 1;
  console.log(`  fixed ${r.business_name}`);
}
console.log(`\n${fixed} site(s) patched. Originals in .forge-backups/html-<id>.html`);
