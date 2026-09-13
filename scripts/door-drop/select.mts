/**
 * WHO GETS A FLYER. The selection half of the door-drop run, kept apart from the
 * rendering half so the rule set can be read without wading through CSS.
 *
 * The whole campaign rests on one promise: every word on the paper is true about
 * the business whose name is at the top. A flyer that names the wrong website,
 * or quotes an audit of a page that has since been rebuilt, is worse than no
 * flyer, because it is handed over in person and cannot be recalled. So this
 * file is a series of gates, each of which drops a lead OUT LOUD. Nothing is
 * silently skipped; the run writes every rejection and its reason to disk.
 *
 * The gates, in order:
 *   0. Ours - not a client, not one we already won, not one of Sarah's own
 *      ventures. The lead list remembers everyone it ever found, buyers
 *      included.
 *   1. Reachable - has a website, is not a duplicate, not a test row, not
 *      unsubscribed or suppressed, not on the hand skip list.
 *   2. Local - not a national chain. A chain's marketing is not ours to fix and
 *      a franchisee cannot buy a website. Detected by the domain being shared
 *      across several leads, plus a hand list of the brands in these towns.
 *   3. Owned - the audit ran against the same host as the lead's website. Two
 *      rows in the Flathead fail this today: Angela's Pizza was audited at
 *      order.toasttab.com, and a "Kalispell Volkswagon" row carries a Red Lion
 *      hotel URL.
 *   4. Complete - the report carries the seven categories and three fixes the
 *      layout needs.
 *   5. Fresh - the audit is younger than --max-age-days. Anything older goes to
 *      the stale pile to be re-run before it is printed. This is also what keeps
 *      the site-facts law honest: every claim on the paper was read off the live
 *      site this month, not in June.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/** The towns Sarah can drive in a day, north to south. */
export const FLATHEAD = [
  'Whitefish',
  'Columbia Falls',
  'Kalispell',
  'Somers',
  'Lakeside',
  'Bigfork',
  'Polson',
];

/** Tallahassee and the Wakulla county towns south of it, north to south. */
export const BIG_BEND = [
  'Tallahassee',
  'Woodville',
  'Crawfordville',
  'Medart',
  'Shadeville',
  'Sopchoppy',
  'Panacea',
  'St. Marks',
  'Saint Marks',
];

/**
 * A REGION IS A PHONE NUMBER, A PARTNER, AND A SET OF TOWNS.
 *
 * The Flathead run is Sarah's own: her ranch line, her signature at the foot,
 * and the studio named where it actually is.
 *
 * The Big Bend run is Easton's. He hands the paper over, so the number on it is
 * the Florida line, which `lib/vapi-lines.ts` already maps to partner code
 * EASTON: every call that arrives on it carries his name as owner and pays him
 * on a later purchase, with no deploy and no extra wiring. The QR carries the
 * same code so a scan that never calls is still attributed. Sarah still answers
 * and still books, which is the arrangement, and none of that changes here.
 *
 * Two things come OFF the Big Bend piece rather than being translated. Sarah's
 * signature, because the person handing it over is not Sarah and a signature
 * from somebody who is not in the room is worse than none. And every mention of
 * Montana, because a flyer in Crawfordville that name-checks Kalispell is a
 * flyer from somewhere else.
 */
export type Region = {
  key: string;
  /** Printed in the eyebrow after the town: "Kalispell, Montana". */
  state: string;
  towns: string[];
  /** As it appears on the paper, and as the tel: link dials. */
  phone: string;
  phoneE164: string;
  /** Partner code appended to the scan link, or null for Sarah's own run. */
  ref: string | null;
  /** Sarah's signature at the foot. Hers to give, and only on her own run. */
  signature: boolean;
  /** The studio sentence in the offer block. Names Kalispell only where that helps. */
  studio: string;
};

export const REGIONS: Record<string, Region> = {
  montana: {
    key: 'montana',
    state: 'Montana',
    towns: FLATHEAD,
    phone: '(406) 312-1223',
    phoneE164: '+14063121223',
    ref: null,
    signature: true,
    studio: 'A one person product studio here in Kalispell: websites, AI systems, and phone agents that answer, '
      + 'at a set package price. You own the code, the domain, and the accounts. Call the ranch line and Mr. '
      + 'Mustard books you in.',
  },
  florida: {
    key: 'florida',
    state: 'Florida',
    towns: BIG_BEND,
    phone: '(850) 985-9252',
    phoneE164: '+18509859252',
    ref: 'EASTON',
    signature: false,
    studio: 'A small product studio: websites, AI systems, and phone agents that answer, at a set package price. '
      + 'You own the code, the domain, and the accounts. Call the number and Mr. Mustard, our own AI, books you in.',
  },
};

/**
 * Brands whose local sign says one thing and whose website belongs to a head
 * office. Split into two lists, because the two kinds of name fail differently.
 *
 * CHAINS are distinctive enough to match anywhere in a business name on word
 * boundaries. Nobody in the Flathead is called "Panda Express Excavating".
 * Boundaries, not `includes`: the first version dropped Wildflowers Salon in
 * Bigfork because "lowe" sits inside "Wildflowers".
 *
 * CHAINS_EXACT are ordinary words that happen to be a brand, and they only
 * match when they are essentially the WHOLE name. "Michaels" is a craft store
 * and "Michaels Auto Body" is a Kalispell body shop; a word-boundary match
 * drops both and never says why in a way anyone would notice. The failure modes
 * are not symmetric here. A chain that slips through gets printed and then gets
 * spotted by eye on the route sheet, which costs one sheet of paper. A local
 * business wrongly matched disappears from the campaign silently. So this list
 * is deliberately timid.
 */
const CHAINS = [
  'panda express', 'mcdonald', 'starbucks', 'taco bell', 'burger king',
  'pizza hut', 'dairy queen', 'jimmy john', 'papa john', 'papa murphy',
  'applebee', 'wingstop', 'chipotle', 'dunkin', 'sonic drive', 'little caesars', 'mod pizza',
  'holiday inn', 'best western', 'hampton inn', 'super 8', 'red lion', 'la quinta',
  'comfort inn', 'motel 6', 'days inn', 'kwataqnuk',
  'walmart', 'costco', 'home depot', 'safeway', 'albertsons',
  'ace hardware', 'napa auto', "o'reilly", 'autozone', 'jiffy lube', 'les schwab',
  'great clips', 'supercuts', 'anytime fitness', 'planet fitness', 'snap fitness',
  'h&r block', 'jackson hewitt', 'edward jones', 'state farm', 'allstate', 'farmers insurance',
  'u-haul', 'fedex', 'ups store', 'verizon', 't-mobile', 'xfinity', 'spectrum',
  'sherwin williams', 'ross dress', 'tj maxx', 'petsmart', 'dollar tree', 'family dollar',
  'dollar general', 'walgreens', 'rite aid', 'sally beauty', 'batteries plus',
  'sport clips', 'cost cutters', 'five guys', 'cold stone', 'dutch bros',
  'scooters coffee', 'taco john', 'mackenzie river', 'famous daves', 'ulta beauty',
  "lowe's home improvement", 'lowes home improvement', 'subway sandwiches',
  // The boundary match wants a non-letter after the name, so the possessive and
  // plural spellings a scrape actually produces need their own entries.
  'wendys', 'arbys', 'dominos', 'lowes', 'mcdonalds', 'papa johns', 'jimmy johns',
  'applebees', 'dennys', 'papa murphys', 'taco johns', 'mcdonald’s',
];

/** Only when the whole name is the brand. See the note above. */
const CHAINS_EXACT = [
  'subway', 'target', 'lowe', 'hilton', 'marriott', 'michaels', 'ulta', 'petco',
  'cvs', 'maurices', 'joann', 'gamestop', 'midas', 'meineke', 'firestone',
  'panera', 'qdoba', 'jamba', 'baskin robbins', 'wendy', 'arby', 'domino',
  'kfc', 'at&t',
];

/**
 * Ours. Never cold-audited, never handed a flyer.
 *
 * The Flathead lead list is where the acquisition engine put every business it
 * ever found in these towns, and that includes the ones that went on to buy. The
 * first full run re-audited Cross + Covenant, Sarah's own storefront, and would
 * have printed Wild Horse Construction, a paying client, a card saying its
 * website scores an F. Handing that to Heath in person is not a marketing
 * mistake, it is a relationship one, and paper cannot be recalled.
 *
 * The name and domain lists below are belt and braces. The real gate is the
 * pipeline state underneath them, because a client who has not been added here
 * yet still carries client_status, payment_status or won_at.
 */
const OURS_DOMAINS = [
  'modernmustardseed.com',
  'crossandcovenant.co',
  'wild-horse-construction.vercel.app',
];
const OURS_NAMES = [
  'cross + covenant', 'cross and covenant', 'modern mustard seed',
];

export type AuditCategory = { score: number; letter: string; notes: string };

export type AuditReport = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis?: string;
  categories?: Record<string, AuditCategory>;
  top_three_fixes?: { title: string; why: string; how: string }[];
  full_todo?: { category: string; priority: string; task: string }[];
};

export type Lead = {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  postal_code: string | null;
  niche: string | null;
  trade: string | null;
  rating: number | null;
  review_count: number | null;
  status: string | null;
  audit_score: number | null;
  audit_url: string | null;
  audit_at: string | null;
  audit_json: AuditReport | null;
  integration_plan_url: string | null;
  integration_plan_status: string | null;
  unsubscribed_at: string | null;
  suppression_reason: string | null;
  duplicate_of: string | null;
  is_test: boolean | null;
  domain_key: string | null;
  notes: string | null;
  client_status: string | null;
  payment_status: string | null;
  won_at: string | null;
};

export type Dropped = { id: string; business_name: string; city: string | null; gate: string; reason: string };

/**
 * The order the seven categories print in, which is not the order the engine
 * returns them. A business owner reads left to right and cares about brand and
 * trust first; GEO and AI are the two that will read as news to him, so they sit
 * in the middle where the eye lands second.
 */
export const CATEGORY_ORDER = ['brand', 'trust', 'seo', 'geo', 'ai_features', 'conversion', 'design'] as const;

/** Plain words. Nobody outside this trade knows what GEO means. */
export const CATEGORY_LABELS: Record<string, string> = {
  brand: 'Brand',
  trust: 'Trust',
  seo: 'Google',
  geo: 'AI Search',
  ai_features: 'AI Tools',
  conversion: 'Turning Visits Into Calls',
  design: 'Design',
};

export const CATEGORY_SHORT: Record<string, string> = {
  brand: 'Brand',
  trust: 'Trust',
  seo: 'Google',
  geo: 'AI Search',
  ai_features: 'AI Tools',
  conversion: 'Calls',
  design: 'Design',
};

/** `.env.local` into `process.env`, the way every other script in this repo does it. */
export function loadEnv(root = process.cwd()) {
  const p = path.join(root, '.env.local');
  if (!existsSync(p)) throw new Error(`No .env.local at ${p}`);
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

export function supabase(): SupabaseClient {
  const url = process.env.supabase_url || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.supabase_service_role_key || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase url or service role key missing from .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function host(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

const FIELDS = [
  'id', 'business_name', 'contact_name', 'phone', 'website', 'city', 'state', 'address', 'postal_code',
  'niche', 'trade', 'rating', 'review_count', 'status', 'audit_score', 'audit_url', 'audit_at', 'audit_json',
  'integration_plan_url', 'integration_plan_status', 'unsubscribed_at', 'suppression_reason',
  'duplicate_of', 'is_test', 'domain_key', 'notes', 'client_status', 'payment_status', 'won_at',
].join(',');

/**
 * Every lead in the named towns, plus a count of how many leads share each
 * domain. That count is how a chain is told from a local business by the shape
 * of the data rather than by a hand list that will always be one brand out of
 * date.
 */
export async function fetchTownLeads(sb: SupabaseClient, cities: string[]) {
  const { data, error } = await sb
    .from('outbound_leads')
    .select(FIELDS)
    .in('city', cities)
    .order('city')
    .order('business_name')
    .limit(2000);
  if (error) throw new Error(`lead fetch failed: ${error.message}`);
  const leads = (data ?? []) as unknown as Lead[];

  const keys = [...new Set(leads.map((l) => l.domain_key).filter(Boolean))] as string[];
  const shared = new Map<string, number>();
  for (let i = 0; i < keys.length; i += 100) {
    const { data: rows } = await sb
      .from('outbound_leads')
      .select('domain_key')
      .in('domain_key', keys.slice(i, i + 100))
      .limit(5000);
    for (const r of rows ?? []) {
      const k = r.domain_key as string;
      shared.set(k, (shared.get(k) ?? 0) + 1);
    }
  }
  return { leads, shared };
}

/**
 * A chain name matches only at word boundaries, and only at the START of a word,
 * so "lowe" finds "Lowe's Home Improvement" and never "Wildflowers".
 */
const chainCache = new Map<string, RegExp>();
function chainRe(c: string): RegExp {
  let re = chainCache.get(c);
  if (!re) {
    const literal = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`(^|[^a-z0-9])${literal}([^a-z]|$)`, 'i');
    chainCache.set(c, re);
  }
  return re;
}

/**
 * The marker scripts/door-drop/addresses.mjs stamps when it OPENED a Google
 * listing and found no website on it. A blank `website` column is not evidence
 * of anything; this is. Nothing may print "you have no website" without it.
 */
export const NOSITE_MARK = 'NO WEBSITE: confirmed on Google Maps';

/**
 * The marker with the date it was checked. enrich-maps.mjs stamped an undated
 * version of this line months ago, and an undated confirmation cannot go on
 * paper: the flyer prints "we opened your listing on <date>", so there has to be
 * a date to print. An undated row is sent back to the Maps pass to be confirmed
 * again rather than printed with today's date, which would be a lie about when
 * we looked.
 */
export const NOSITE_DATED = /NO WEBSITE: confirmed on Google Maps (\d{4}-\d{2}-\d{2})/;

/**
 * Is the business name essentially just this brand? Corporate filler and a store
 * number come off first, so "Subway #1204", "Target Stores Inc" and "Ulta Beauty
 * Kalispell" all reduce to the brand, and "Michaels Auto Body" does not.
 */
const FILLER = /(inc|llc|l\.l\.c|co|corp|company|stores?|the|of|at|kalispell|whitefish|bigfork|polson|somers|lakeside|columbia falls|montana|mt)/g;
/** "#1204" and a bare trailing store number. The `#` has no word boundary in
 *  front of it after a space, which is why it cannot live inside FILLER. */
const STORE_NO = /#\s*\d+|\s\d{3,}\s*$/g;
function isExactChain(name: string): string | null {
  const reduced = name.toLowerCase()
    .replace(STORE_NO, ' ')
    .replace(FILLER, ' ')
    .replace(/[^a-z0-9& ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return CHAINS_EXACT.find((c) => reduced === c || reduced === `${c}s` || reduced === `${c}'s`) ?? null;
}

export type Gated = { keep: Lead[]; nosite: Lead[]; stale: Lead[]; dropped: Dropped[] };

/**
 * Gate six: a street address she can actually find.
 *
 * Added 2026-09-11 at Sarah's word. The route sheet was honest about the 44
 * businesses whose address could not be confirmed, printing "address not on
 * file" in red rather than guessing, but honest is not the same as useful: a
 * flyer she cannot deliver is a flyer that costs money and sits in the truck.
 * The Maps pass writes an address only when the phone proves identity, so a
 * missing one means we genuinely do not know where they are.
 *
 * They are not lost. They sit in skipped.csv under the `findable` gate, and the
 * next Maps pass may settle them.
 */
export function requireAddress(gated: Gated): Gated {
  const keep: Lead[] = [];
  const nosite: Lead[] = [];
  const dropped = [...gated.dropped];
  for (const [bucket, out] of [[gated.keep, keep], [gated.nosite, nosite]] as const) {
    for (const l of bucket) {
      if (l.address && l.address.trim()) out.push(l);
      else dropped.push({ id: l.id, business_name: l.business_name, city: l.city, gate: 'findable', reason: 'no street address we could confirm, so there is nowhere to hand it over' });
    }
  }
  return { keep, nosite, stale: gated.stale, dropped };
}

export function gate(
  leads: Lead[],
  shared: Map<string, number>,
  opts: { maxAgeDays: number; allowStale: boolean; skipNames: Set<string> },
): Gated {
  const keep: Lead[] = [];
  const nosite: Lead[] = [];
  const stale: Lead[] = [];
  const dropped: Dropped[] = [];
  const cutoff = Date.now() - opts.maxAgeDays * 86_400_000;
  const drop = (l: Lead, g: string, reason: string) =>
    dropped.push({ id: l.id, business_name: l.business_name, city: l.city, gate: g, reason });

  for (const l of leads) {
    const name = (l.business_name || '').trim();
    if (!name) { drop(l, 'reachable', 'no business name'); continue; }

    // Gate zero: ours. A client or one of Sarah's own ventures never gets a cold
    // audit handed to them on paper.
    const lowerName = name.toLowerCase();
    const h = host(l.website);
    if (
      OURS_NAMES.includes(lowerName) ||
      (h && OURS_DOMAINS.includes(h)) ||
      l.client_status ||
      l.won_at ||
      (l.payment_status && l.payment_status !== 'cancelled') ||
      l.status === 'client' ||
      l.status === 'won'
    ) {
      drop(l, 'ours', 'already a client, already won, or one of our own');
      continue;
    }
    if (l.is_test) { drop(l, 'reachable', 'test row'); continue; }
    if (l.duplicate_of) { drop(l, 'reachable', 'duplicate of another lead'); continue; }
    if (l.unsubscribed_at || l.suppression_reason) { drop(l, 'reachable', 'unsubscribed or suppressed'); continue; }
    if (opts.skipNames.has(lowerName)) { drop(l, 'reachable', 'on the hand skip list'); continue; }
    /**
     * No website is not a rejection, it is the other campaign. It only counts
     * when somebody opened the listing and saw that: the marker carries the date
     * and the source, and the second flyer prints both.
     */
    if (!l.website) {
      const note = l.notes ?? '';
      const dated = NOSITE_DATED.exec(note);
      if (dated) {
        if (Date.parse(dated[1]) >= cutoff) nosite.push(l);
        else stale.push(l);
      } else if (note.includes(NOSITE_MARK)) {
        stale.push(l); // confirmed once, but nobody wrote down when
      } else {
        drop(l, 'reachable', 'no website on file and the listing was never opened to confirm it');
      }
      continue;
    }

    const chain = CHAINS.find((c) => chainRe(c).test(lowerName)) ?? isExactChain(name);
    if (chain) { drop(l, 'local', `national chain by name (${chain})`); continue; }
    const sharedBy = l.domain_key ? (shared.get(l.domain_key) ?? 0) : 0;
    if (sharedBy >= 3) {
      drop(l, 'local', `domain shared by ${sharedBy} leads, so it is a corporate site`);
      continue;
    }

    const a = h;
    const b = host(l.audit_url);
    if (a && b && a !== b) {
      drop(l, 'owned', `audit ran against ${b} but the website on file is ${a}`);
      continue;
    }

    if (!l.audit_json || l.audit_score == null) { stale.push(l); continue; }

    const r = l.audit_json;
    const cats = r.categories ?? {};
    const missing = CATEGORY_ORDER.filter((k) => !cats[k]);
    if (missing.length) { drop(l, 'complete', `report is missing ${missing.join(', ')}`); continue; }
    if ((r.top_three_fixes ?? []).length < 3) { drop(l, 'complete', 'report has fewer than three fixes'); continue; }
    if (!r.headline || !r.letter_grade) { drop(l, 'complete', 'report has no headline or grade'); continue; }

    const at = l.audit_at ? Date.parse(l.audit_at) : 0;
    if (at < cutoff) {
      if (opts.allowStale) keep.push(l);
      else stale.push(l);
      continue;
    }
    keep.push(l);
  }
  return { keep, nosite, stale, dropped };
}
