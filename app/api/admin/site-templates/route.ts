import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE_TEMPLATES, SHARED_DEVICES, templateFontsHref } from '@/lib/site-templates.mjs';
import { TRADE_PRESETS } from '@/data/demo-os-trades';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE TEMPLATE GALLERY'S DATA (2026-08-24). The registry itself lives in code
 * (lib/site-templates.mjs) because a template is law the builder executes, not
 * a row someone edits in a form. This route adds what only the database and
 * the reference library know: the whole reference site each template was
 * lifted from (embedded, not described), how many live sites wear it, and a
 * few live examples to open.
 */

export type Reference = {
  label: string;
  url: string;
  /** What you are looking at: pages, motion, the organs that make it that build. */
  notes: string;
  /** Where it lives, so Sarah knows what she is allowed to change. */
  source: 'repo' | 'demo' | 'live';
};

/**
 * THE REFERENCE LIBRARY. Every template and every structure points at the real
 * build it was lifted from, embedded whole. Repo files ship with the code;
 * demo rows are looked up live by business name (latest ready build wins, or
 * the id pinned here when a specific build is the reference); live URLs are
 * deployed sites.
 */
const REFERENCES: Record<string, { fixed?: Reference; business?: string; demoId?: string; notes: string }> = {
  'steel-and-ember': {
    business: 'Wild Horse Construction',
    demoId: '6bfb976f-d32b-40a2-813b-8f7e80d723fc',
    notes: 'The 22-page rebuild: photo slider hero, handwritten Caveat margin notes, the work as a photo essay, estimate, proof on their real rating, accordion FAQ, calendar booking. Tool cursor on every page.',
  },
  'night-neon': { business: 'Huck Yeah', notes: 'Single-file demo. Canvas ambience behind the hero, parallax plates, horizontal fleet slider with rates, live counter, marquee, tool cursor.' },
  'barber-red': { business: 'Columbia Falls Barbershop', notes: 'Single-file demo. Sticky nav with the phone, the price menu as the centrepiece, chair slider, proof, accordion FAQ, booking.' },
  'highway-amber': { business: 'Hungry Horse Motel', notes: 'Single-file demo with eight distinct photographs. Amber treated as sign light, parallax, the road story, rooms, proof, FAQ, booking.' },
  'field-note': { business: 'Sands Surveying', notes: 'Single-file demo. Mono readout in the hero, tick-mark rules, the finder interactive, sticky diagram stage, slider, proof, FAQ, booking.' },
  'wild-reverent': {
    fixed: { label: 'Wild Hope (reference build, photography stripped)', url: '/reference/wild-reverent.html', source: 'repo', notes: '' },
    notes: 'THE TURN scroll moment, the drag reel, the horizontal rail, the oversized Fraunces wordmark. Photography is stripped so the structure reads.',
  },
  'lakehouse-editorial': {
    fixed: { label: "Daisy's Cafe (the package build, whole site)", url: '/demo/reference/daisys-cafe', source: 'repo', notes: '' },
    notes: 'The complete package site: over-image nav, hero with the rotating sunrise badge, ticker, outline-type intro, paper-note image break, tabbed menu on ink, the sailboat ritual with the outline numeral, contact-sheet gallery with a lightbox, Supper Club, two service cards, the reservation close, footer. Every interaction is live here.',
  },
  'easton-kinetic': {
    fixed: { label: 'Easton Events (the package build, whole site)', url: '/demo/reference/easton-kinetic', source: 'repo', notes: '' },
    notes: 'The complete package site: scroll progress bar, hero with orbit rings, coordinates and the rotated sticker, capability ticker, cream manifesto with the rotating glyph, the sticky four-card stack (lime, violet, coral, cyan), metrics band, sticky method with scroll-revealed steps, editorial gallery with a lightbox, studio section, coral CTA, footer. Every motion and interaction is live here.',
  },
  'midnight-atelier': { notes: 'No reference build yet. Build one: pick Midnight Atelier on a jeweler, med-spa or custom-builder lead and it becomes the reference here.' },
  'swiss-grid': { notes: 'No reference build yet. Build one: pick Swiss Grid on an engineer, accountant or law-office lead.' },
  'poster-press': { notes: 'No reference build yet. Build one: pick Poster Press on a brewery, roaster, food-truck or venue lead.' },
  greenhouse: { notes: 'No reference build yet. Build one: pick Greenhouse on a landscaper, nursery or tree-service lead.' },
  'clinic-calm': { notes: 'No reference build yet. Build one: pick Clinic Calm on a dental, vet, chiropractic or PT lead.' },
};

/**
 * THE STRUCTURES: the bones a template is built on. The picker on every build
 * offers all three since 2026-08-24, when the Award tier was rewired onto the
 * claude engine.
 */
const STRUCTURES = [
  {
    key: 'tier-1',
    name: 'Tier 1 · The Award Site',
    status: 'Live on every picker since 2026-08-24, built on the claude engine.',
    feel: 'The flagship standard: a giant wordmark, the outline moment, a living centrepiece, the spinning seal, story chapters on a scroll-scrubbed spine.',
    carries: [
      'THE OUTLINE MOMENT: the hero headline mixes solid and hollow words, the hollow word a 55% tinted fill with a stroke so it survives a dark plate (born on the Porsha Lee custom-paint hero)',
      'the STACK hero mode: an oversized wordmark or headline above the photograph on the page ground',
      'a living centrepiece and the spinning seal',
      'three story chapters threaded by a scroll-scrubbed spine line',
      'count-up stats band, four offering cards, founder letter, reviews, FAQ, booking',
    ],
    references: [{ label: 'REFERENCE.html (Sappari, photography stripped)', url: '/reference/tier1-award.html', source: 'repo', notes: 'The flagship anatomy with the photography removed so the structure and the laws read.' }],
    doc: 'docs/flagship/TEMPLATE.md, VARIANTS.md, MOTION.md',
  },
  {
    key: 'tier-2',
    name: 'Tier 2 · The World',
    status: 'The house structure and the default on every picker.',
    feel: 'A one-page scroll-cinema brand world you stand inside: the Wildmere anatomy, one of ten art directions, one hero mode (Plate, Split or Stack).',
    carries: [
      'giant wordmark hero in the chosen composition mode, living centrepiece, spinning seal',
      'brand marquee, three scroll-scrubbed story chapters, count-up stats',
      'four offering cards, founder letter, reviews on their real rating, accordion FAQ, calendar booking',
      'one signature moment: THE TURN, THE WIPE, THE REEL, THE RAIL, THE BUILD or THE LONG PULL',
      'the progress slider as the hero for trades that transform something',
    ],
    references: [
      { label: 'Wildmere Honey', url: 'https://wildmere.vercel.app', source: 'live', notes: 'The build the tier was extracted from.' },
      { label: 'Westridge Timber', url: 'https://westridge-timber.vercel.app', source: 'live', notes: 'Same bones, a different world.' },
    ],
    doc: 'lib/site-directive.mjs tier2DemoDirective, docs/flagship/*',
  },
  {
    key: 'tier-3',
    name: 'Tier 3 · The Journey',
    status: 'Built on request from the picker.',
    feel: 'A brand journey you travel through: chapters as stops, a pinned rail with a scroll-riding marker, letterbox bars over footage-treated stills, a four-door close into the voice agent.',
    carries: [
      'one journey metaphor: the route, the work day, the build, the season, or the visit',
      'a pinned rail with a marker that rides the scroll',
      'letterboxed chapters over footage-treated stills',
      'the four-door close that hands the visitor to the voice agent',
      'narration written to be read aloud (the Talking Website tour)',
    ],
    references: [{ label: 'modernmustardseed.com (the Flathead Journey)', url: 'https://modernmustardseed.com/', source: 'live', notes: 'The homepage the tier was born from, 2026-08-07.' }],
    doc: 'docs/tier3-journey/TEMPLATE.md',
  },
];

async function latestDemo(sb: SupabaseClient, business: string): Promise<{ id: string; business_name: string; built_at: string | null } | null> {
  try {
    const { data } = await sb
      .from('outbound_demo_sites')
      .select('id, business_name, built_at')
      .ilike('business_name', `%${business}%`)
      .eq('status', 'ready')
      .not('html', 'is', null)
      .order('built_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as { id: string; business_name: string; built_at: string | null } | null) ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  type Usage = { count: number; lastAt: string | null; examples: { id: string; business: string; url: string; at: string }[] };
  const usage: Record<string, Usage> = {};
  for (const t of SITE_TEMPLATES) usage[t.key] = { count: 0, lastAt: null, examples: [] };

  try {
    const { data } = await sb
      .from('outbound_demo_sites')
      .select('id, business_name, site_template, built_at, status, lead_id')
      .not('site_template', 'is', null)
      .eq('status', 'ready')
      .order('built_at', { ascending: false })
      .limit(500);
    for (const r of data ?? []) {
      const u = usage[r.site_template as string];
      if (!u) continue;
      u.count += 1;
      if (!u.lastAt) u.lastAt = (r.built_at as string | null) ?? null;
      if (u.examples.length < 4) {
        u.examples.push({ id: r.id as string, business: r.business_name as string, url: `/demo/site/${r.id}`, at: (r.built_at as string | null) ?? '' });
      }
    }
  } catch { /* column not applied yet: the gallery still renders, with zero counts */ }

  // Resolve every reference in parallel: pinned ids first, then the latest
  // ready build for the business the style was lifted from.
  const references: Record<string, Reference | null> = {};
  await Promise.all(
    SITE_TEMPLATES.map(async (t) => {
      const r = REFERENCES[t.key];
      if (!r) { references[t.key] = null; return; }
      if (r.fixed) { references[t.key] = { ...r.fixed, notes: r.notes }; return; }
      if (r.demoId) { references[t.key] = { label: `${r.business} (pinned build)`, url: `/demo/site/${r.demoId}`, source: 'demo', notes: r.notes }; return; }
      if (r.business) {
        const d = await latestDemo(sb, r.business);
        references[t.key] = d ? { label: `${d.business_name} (latest ready build)`, url: `/demo/site/${d.id}`, source: 'demo', notes: r.notes } : null;
        return;
      }
      references[t.key] = null;
    }),
  );

  const tradeLabel = (k: string) => (TRADE_PRESETS as Record<string, { label: string }>)[k]?.label ?? k;

  return NextResponse.json({
    shared: SHARED_DEVICES,
    structures: STRUCTURES,
    templates: SITE_TEMPLATES.map((t) => ({
      ...t,
      fitsLabels: t.fits.map(tradeLabel),
      avoidLabels: t.avoidFor.map(tradeLabel),
      fontsHref: templateFontsHref(t),
      usage: usage[t.key],
      reference: references[t.key],
      referenceNotes: REFERENCES[t.key]?.notes ?? '',
    })),
  });
}
