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

/**
 * Find the selectors that actually declare an outlined word, whatever they are
 * called. Guessing [class*="hollow"] missed Super Roofers entirely, whose outline
 * class has a different name, so the word stayed unreadable after a fleet run that
 * reported success. Read their CSS instead of assuming our own vocabulary.
 */
function hollowSelectors(html) {
  const out = new Map();
  const re = /-webkit-text-stroke(?:-width)?\s*:\s*[\d.]+px/g;
  let m;
  while ((m = re.exec(html))) {
    const open = html.lastIndexOf('{', m.index);
    const close = html.indexOf('}', m.index);
    if (open === -1 || close === -1) continue;
    const body = html.slice(open, close);
    if (!/color\s*:\s*transparent/.test(body)) continue;

    // Take the colour from THIS build's own stroke. Falling back to a hardcoded
    // hex put a teal fill on Super Roofers' orange palette, because that site
    // never defines --accent. The word became legible and wrong, which is not a fix.
    const strokeColor =
      body.match(/-webkit-text-stroke\s*:\s*[\d.]+px\s+([^;}]+)/)?.[1]?.trim() ||
      body.match(/-webkit-text-stroke-color\s*:\s*([^;}]+)/)?.[1]?.trim() ||
      null;

    const from = Math.max(0, open - 400);
    const chunk = html.slice(from, open);
    const cut = Math.max(chunk.lastIndexOf('}'), chunk.lastIndexOf(';'), chunk.lastIndexOf('>'));
    const sel = chunk.slice(cut + 1).trim().replace(/\s+/g, ' ');
    if (!sel || sel.length > 200 || sel.startsWith('@')) continue;
    if (!/[a-zA-Z.#[]/.test(sel[0])) continue;
    if (!out.has(sel) || (strokeColor && !out.get(sel))) out.set(sel, strokeColor);
  }
  return [...out.entries()];
}

/** A rule built from the colour this build already chose for its own outline. */
function hollowRule(strokeColor) {
  // No declared stroke colour means we must not invent one; leave the fill alone
  // and win legibility with the halo only.
  if (!strokeColor) {
    return '{-webkit-text-stroke-width:3px!important;text-shadow:0 0 2px rgba(0,0,0,.75),0 3px 22px rgba(0,0,0,.75)!important}';
  }
  return (
    `{color:color-mix(in srgb,${strokeColor} 55%,transparent)!important;` +
    '-webkit-text-stroke-width:3px!important;' +
    'text-shadow:0 0 2px rgba(0,0,0,.7),0 3px 22px rgba(0,0,0,.7)!important}'
  );
}

/** The patch, appended so it wins on cascade order without rewriting their CSS. */
const PATCH = `
/* --- build fix 2026-07-29: hollow hero words must survive the photograph --- */
[class*="hollow"], .mast-name .hollow, h1 .hollow {
  /* a faint fill so the counters are not raw photograph */
  /* 26% read as mud over a dark photograph. The fill has to carry the brand
     colour at real strength, with the stroke brighter than the fill so the
     outline still reads as an outline. */
  color: color-mix(in srgb, var(--accent, #14b8a6) 55%, transparent) !important;
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

const MARK = 'build fix 2026-07-29: hollow hero words';

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
  const derived = hollowSelectors(base);
  const extra = derived.length
    ? '\n/* selectors and colours read from THIS build: outline classes are not always\n' +
      '   called "hollow", and the fill must be the palette this site actually chose */\n' +
      derived.map(([sel, color]) => sel + hollowRule(color)).join('\n')
    : '';
  const style = `<style>${PATCH}${extra}</style>`;
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
console.log(`\n${fixed} site(s) patched. Originals in .build-backups/html-<id>.html`);
