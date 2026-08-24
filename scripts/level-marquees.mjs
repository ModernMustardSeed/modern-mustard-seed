#!/usr/bin/env node
/**
 * LEVEL EVERY STRIPE ALREADY IN THE TABLE (2026-08-24).
 *
 * Sarah: "the stripe block that has words auto scrolling, its not straight
 * horizontal, its at a diagonal and gets squeezed between the other 2 blocks
 * and text becomes illegible."
 *
 * lib/level-marquee.ts flattens the band at serve time, so every demo link and
 * every publish is already correct without this script. What this script is
 * for is the STORED html: the row the editor loads, the row the next rebuild
 * diffs against, and the copy a site that was deployed straight to Vercel is
 * still serving from its own static files. Fixing the shim without fixing the
 * source leaves a page that does not match its own screenshot.
 *
 * It is a rule-level rewrite, not a blanket search and replace, because the
 * same three declarations are legitimate everywhere else on the page: a tilted
 * polaroid, a section pulled up over the one above it, a wedge cut into a photo
 * band. Only a rule whose selector names a scrolling stripe is touched, and
 * inside it only the tilt, the wedge and the negative vertical margins.
 *
 *   node scripts/level-marquees.mjs            # dry run, prints every hit
 *   node scripts/level-marquees.mjs --apply
 */
import { readFileSync, existsSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');

/** A selector that names a scrolling stripe. Nothing else is rewritten. */
const RULE = /(\.[a-z0-9_-]*(?:marq|ticker|scroller|conveyor|crawl)[a-z0-9_ .,>:()[\]="'-]*\{)([^{}]*)\}/gi;
const WEDGE = /\s*(?:-webkit-)?clip-path\s*:\s*polygon\([^;}]*\)\s*;?/gi;
const TILT = /\s*transform\s*:\s*[^;}]*?(?:rotate|skew)[XY]?\([^;}]*\)[^;}]*;?/gi;
const PULL = /\s*margin\s*:\s*(-[\d.]+(?:px|rem|em|vh|%))([^;}]*)\s*;?/gi;
const PULL_ONE = /\s*margin-(top|bottom)\s*:\s*-[\d.]+(?:px|rem|em|vh|%)\s*;?/gi;
/** The rotation can also ride the standalone property rather than transform. */
const SPIN = /\s*rotate\s*:\s*-?[\d.]+(?:deg|rad|turn)\s*;?/gi;
/** A band built to be tucked under its neighbours was drawn thin to suit it. */
const PAD = /padding\s*:\s*([\d.]+)px/i;
const MIN_PAD = 22;

/**
 * THE BAND AND ITS TRACK, NEVER WHAT IS INSIDE THEM.
 *
 * The first dry run over the fleet wanted to level `.marq-track span::after`,
 * `.marquee li::after` and `.marq-g i`, which are the little rotated diamonds
 * BETWEEN the words. Those are supposed to be on the diagonal: rotate(45deg) on
 * a square is how you draw a diamond. Stripping them would have turned every
 * separator on four builds back into a square and called it a repair.
 *
 * So only a rule whose whole selector is class names is rewritten. A descendant
 * combinator, an element type, or a pseudo-element means the rule is dressing
 * something inside the stripe rather than the stripe itself.
 */
function bandRule(selector) {
  return selector
    .split(',')
    .every((part) => /^\s*\.[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\s*$/i.test(part));
}

/** @returns {{html:string, hits:string[]}} */
export function levelMarqueeCss(html) {
  const hits = [];
  const out = String(html || '').replace(RULE, (whole, head, body) => {
    /* A keyframes block is not a rule to flatten: the translate that MOVES the
       stripe lives in one, and stripping it would stop the marquee dead. */
    if (/@keyframes/i.test(head)) return whole;
    if (!bandRule(head.replace(/\{$/, ''))) return whole;
    let next = body;
    next = next.replace(WEDGE, '');
    next = next.replace(TILT, '');
    next = next.replace(SPIN, '');
    next = next.replace(PULL, 'margin:0;');
    next = next.replace(PULL_ONE, '');
    if (next === body) return whole;
    /* Once it is no longer buried, a 17px band is just a thin band, so give the
       type the air the law asks for rather than leaving it looking cramped. */
    const pad = next.match(PAD);
    if (pad && Number(pad[1]) < MIN_PAD) {
      next = next.replace(PAD, `padding:${MIN_PAD + 2}px`);
    }
    hits.push(head.trim().replace(/\{$/, '').trim());
    return head + next.replace(/;\s*;/g, ';') + '}';
  });
  return { html: out, hits };
}

async function main() {
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  const url = process.env.supabase_url || process.env.SUPABASE_URL;
  const key = process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('No Supabase credentials. Run this from the repo root with .env.local present.');
    process.exit(1);
  }
  /* Loaded here, not at the top, so the rewrite below can be imported and
     tested without a client or a connection to production. */
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(url, key, { auth: { persistSession: false } });

  let touched = 0;
  let scanned = 0;
  const report = (label, hits) =>
    console.log(`  ${APPLY ? 'levelled' : 'would level'} ${label}: ${hits.join(', ')}`);

  /* THESE ROWS ARE WHOLE WEBSITES, PHOTOGRAPHS AND ALL.
     Selecting the html column for every demo at once asks the database for
     several hundred megabytes in one response, and the first run of this script
     got a Cloudflare 522 back instead of data. Read the ids first, then the
     bodies a handful at a time. */
  async function* rows(table, columns, notNull, size = 5) {
    const { data: ids, error } = await sb.from(table).select('id').not(notNull, 'is', null);
    if (error) throw error;
    for (let i = 0; i < (ids ?? []).length; i += size) {
      const batch = ids.slice(i, i + size).map((r) => r.id);
      const { data, error: err } = await sb.from(table).select(columns).in('id', batch);
      if (err) throw err;
      for (const row of data ?? []) yield row;
    }
  }

  /* -------------------------------------------------------------- demos */
  for await (const d of rows('outbound_demo_sites', 'id, business_name, html', 'html')) {
    scanned++;
    const { html, hits } = levelMarqueeCss(d.html);
    if (!hits.length) continue;
    touched++;
    report(`demo ${d.business_name ?? d.id}`, hits);
    if (APPLY) {
      const { error } = await sb.from('outbound_demo_sites').update({ html }).eq('id', d.id);
      if (error) console.error(`    FAILED: ${error.message}`);
    }
  }

  /* ----------------------------------------------------------- projects */
  for await (const p of rows('projects', 'id, name, site_html, site_pages', 'site_html', 3)) {
    scanned++;
    const patch = {};
    const home = levelMarqueeCss(p.site_html);
    const hits = [...home.hits];
    if (home.hits.length) patch.site_html = home.html;

    const pages = p.site_pages && typeof p.site_pages === 'object' ? p.site_pages : null;
    if (pages) {
      const nextPages = {};
      let pageHit = false;
      for (const [file, body] of Object.entries(pages)) {
        if (typeof body !== 'string') {
          nextPages[file] = body;
          continue;
        }
        const r = levelMarqueeCss(body);
        nextPages[file] = r.html;
        if (r.hits.length) {
          pageHit = true;
          hits.push(`${file}: ${r.hits.join(', ')}`);
        }
      }
      if (pageHit) patch.site_pages = nextPages;
    }

    if (!Object.keys(patch).length) continue;
    touched++;
    report(`project ${p.name ?? p.id}`, hits);
    if (APPLY) {
      const { error } = await sb.from('projects').update(patch).eq('id', p.id);
      if (error) console.error(`    FAILED: ${error.message}`);
    }
  }

  console.log(
    `\n${scanned} rows scanned, ${touched} carried a tilted stripe.` +
      (APPLY ? ' Written.' : ' Dry run: re-run with --apply.'),
  );
  /* A published site keeps serving its own static files until it is published
     again, so anything under projects still needs a republish to go out. */
  if (touched && APPLY) {
    console.log('Published client sites need a republish before the fix reaches their domain.');
  }
}

/* Importable for a test without opening a connection to production. */
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/level-marquees.mjs')) {
  await main();
}
