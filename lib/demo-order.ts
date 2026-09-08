/**
 * "Order it right there" catalog for the built-demo surfaces.
 *
 * A prospect watching their own demo buys on the spot: monthly plan + one-time
 * setup, month to month, cancel anytime, no trials (the demo was the trial).
 * We customize after purchase and release within 7 days.
 *
 * Every piece is individually purchasable.
 *
 * THE COMMAND CENTER IS OFF THE SUITE AND OFF THE BUNDLE (Sarah, 2026-08-22).
 * It is still sold, at its own price, on its own page, through its own pay
 * link. What it is no longer is bundled, waived, built automatically, or
 * suggested alongside anything else. Her reason, in her words: clients just
 * want it done, most already run software for it, and it is not perfected yet.
 * An offer that cannot ship clean poisons the two that can.
 *
 * So DEMO_ORDER_KEYS (what the demo suite offers) and PRICEABLE_KEYS (what a
 * pay link can quote) are now DIFFERENT LISTS, and that gap is the feature.
 * Anything that suggests, builds, bundles or waives the command center is a
 * regression, not an improvement.
 *
 * Pricing locked by Sarah 2026-07-11. REPRICED 2026-07-29: voice $397/$397,
 * website $497/$147, and the pair became THE TALKING WEBSITE at $497/$497. The
 * bundle price did NOT move when the command center came out of it on
 * 2026-08-22: it was always priced as the two paid pieces, and the ladder check
 * below still holds.
 *
 * REPRICED AGAIN 2026-08-31 (Sarah): voice dropped to $297/$297 and the
 * Talking Website monthly dropped to $397. Both setups held: website $497 and
 * bundle $497. The ladder was re-run at the new numbers and is written out
 * below. All amounts in cents.
 *
 * PAGE RUNGS (Sarah, 2026-09-08). The website now comes in three sizes and the
 * price follows the size, because Google and AI search index pages, not
 * sections, and a site with every service and every town on its own page is
 * simply found more. The 5-page rung is the price everything above already
 * quoted, unchanged. Locked by Sarah the same day:
 *
 *   5 pages         site $497 + $147/mo    Talking Website $497 + $397/mo
 *   20 pages and up site $997 + $197/mo    Talking Website $997 + $447/mo
 *   50 pages and up site $1,997 + $297/mo  Talking Website $1,997 + $547/mo
 *
 * The rule that makes it hold against unlimited edits: an edit to any page the
 * client already has is free forever, and a NEW page beyond the rung is the
 * next rung, not an edit. Without that line a 5-page buyer requests fifteen
 * pages as edits and the 20-page rung never sells.
 *
 * DEMO_PRODUCTS.site and DEMO_BUNDLE stay the 5-page rung so every surface that
 * already reads them keeps quoting the entry price. SITE_RUNGS is the ladder;
 * quoteDemoOrder() takes a rung and prices from it. The ladder invariant is
 * checked per rung by ladderViolations(), which gates the build.
 */

import { demoAgentTiers } from '@/data/demo-agent';

export type DemoProductKey = 'voice' | 'site' | 'os' | 'cornerstone';

export type DemoProduct = {
  key: DemoProductKey;
  name: string;
  setupCents: number;
  monthlyCents: number;
  blurb: string;
  finePrint?: string;
  /** True when this piece is sold but deliberately kept OUT of the demo suite
   *  and out of every bundle. Surfaces render a standalone price with no
   *  cross-sell attached. */
  standaloneOnly?: boolean;
};

export const DEMO_PRODUCTS: Record<DemoProductKey, DemoProduct> = {
  voice: {
    key: 'voice',
    name: 'Voice Agent',
    setupCents: 29700,
    monthlyCents: 29700,
    blurb: 'The voice that answered your demo, answering your calls, 24/7.',
    finePrint: `${demoAgentTiers[0].minutesCap.toLocaleString()} answered minutes a month, then message-taking mode.`,
  },
  site: {
    key: 'site',
    name: 'Your New Website',
    setupCents: 49700,
    monthlyCents: 14700,
    blurb: 'The site you just toured, customized to your business and put live on your domain.',
    // Edits are unlimited and never metered (migration 078). Domain, hosting and
    // care ride along.
    finePrint: 'Unlimited edits, before it goes live and forever after. Your domain, hosting, and care all included.',
  },
  cornerstone: {
    key: 'cornerstone',
    name: 'Cornerstone',
    setupCents: 49700,
    monthlyCents: 39700,
    standaloneOnly: true,
    blurb:
      'A crew of agents that works your jobs overnight and hands you one report at 5am. Your jobs, your money, your paperwork and the enquiries off your website, on one board.',
    // standaloneOnly for the same reason as the command center: it is scoped
    // with the builder first, it is not part of the demo suite, and it must
    // never be bundled. The ladder invariant above only governs the suite, and
    // this sits outside it.
    finePrint:
      'Set up with your jobs, your subs and your contracts loaded before you sign in. Unlimited changes, always included.',
  },
  os: {
    key: 'os',
    name: 'Business Command Center',
    setupCents: 49700,
    monthlyCents: 19700,
    standaloneOnly: true,
    blurb: 'Your back office: every call transcribed, your website traffic and leads, customers, reviews, and money on one board.',
    finePrint: 'Sold on its own and built by hand, scoped with you first. It is not part of the demo suite and it is never bundled.',
  },
};

/**
 * THE TALKING WEBSITE: both paid pieces, built as one thing. A website that
 * answers its own phone, in the same voice, off the same brain. This is the
 * flagship offer.
 *
 * The bundle must stay AT OR ABOVE the priciest single AND below the two-piece
 * sum, or a la carte becomes irrational and every bundle leaks. Ladder check at
 * $497 setup + $397/mo (2026-08-31): setup $497 = $497 (site, the priciest
 * single) and < $794 (pair), so the bundle absorbs the voice build but is never
 * cheaper than a piece of it; monthly $397 > $297 (voice, the priciest single)
 * and < $444 (pair). No path buys more for less. Re-run this check every time a
 * single price moves. All surfaces derive from DEMO_PRODUCTS / DEMO_BUNDLE.
 *
 * THE PRICE DID NOT MOVE when the command center left the bundle on 2026-08-22,
 * because the bundle was always priced as the two paid pieces and the ladder
 * above never counted the command center. What went away is a freebie on top,
 * not a discount, and the dominated cart that freebie created went with it.
 */
export const DEMO_BUNDLE = {
  key: 'bundle' as const,
  name: 'The Talking Website',
  setupCents: 49700,
  monthlyCents: 39700,
  blurb:
    'A website that answers its own phone. Your site and your voice agent built as one thing, off one brain, so every call and every form lands in the same place.',
};

/**
 * What the demo suite offers, in display order.
 *
 * THE COMMAND CENTER IS NOT ON THIS LIST and must not go back on it without
 * Sarah saying so. It is still sold; it is just not part of the suite, not in
 * the bundle, and never suggested alongside anything. See PRICEABLE_KEYS.
 */
export const DEMO_ORDER_KEYS: DemoProductKey[] = ['voice', 'site'];

/**
 * What a price can be quoted for, which is wider than what the suite offers.
 *
 * The command center lives here and not in DEMO_ORDER_KEYS: /pay/command-center
 * still has to mint a real Stripe session at a real price, and Sarah still
 * builds them by hand. Taking something off the menu is not the same as taking
 * it off the price list.
 */
export const PRICEABLE_KEYS: DemoProductKey[] = ['voice', 'site', 'os', 'cornerstone'];

/**
 * THE PAGE LADDER. Three sizes of website; the Talking Website bundle is priced
 * per rung. The 5-page rung IS DEMO_PRODUCTS.site / DEMO_BUNDLE, so the two
 * never drift: the rung reads its numbers from them, not the other way round.
 *
 * Ladder check at every rung, run by ladderViolations() below and gated in the
 * build by scripts/check-price-ladder.mjs:
 *   bundle setup   = site setup (the priciest single) and < site + voice
 *   bundle monthly > voice monthly (the priciest single) and < site + voice
 *   each rung strictly above the one below it, on setup and on monthly
 *
 *   5:  setup $497 = $497, < $794. monthly $397 > $297, < $444.  Saves $297 / $47.
 *   20: setup $997 = $997, < $1,294. monthly $447 > $297, < $494. Saves $297 / $47.
 *   50: setup $1,997 = $1,997, < $2,294. monthly $547 > $297, < $594. Saves $297 / $47.
 */
export type SiteRungKey = 'five' | 'twenty' | 'fifty';

export type SiteRung = {
  key: SiteRungKey;
  /** The floor of the rung. 20 means "20 pages and up". */
  pages: number;
  /** Printed everywhere a person reads: "5 pages", "20 pages and up". */
  label: string;
  /** What the site is, in one line, for the card. */
  pitch: string;
  /** A concrete page plan for a trade business, so nobody is buying a number. */
  plan: string;
  setupCents: number;
  monthlyCents: number;
  bundleSetupCents: number;
  bundleMonthlyCents: number;
};

export const SITE_RUNGS: Record<SiteRungKey, SiteRung> = {
  five: {
    key: 'five',
    pages: 5,
    label: '5 pages',
    pitch: 'The storefront. One page per thing a customer needs, and every one of them found.',
    plan: 'Home, services, about, reviews, and a contact page that books.',
    setupCents: 49700,
    monthlyCents: 14700,
    bundleSetupCents: 49700,
    bundleMonthlyCents: 39700,
  },
  twenty: {
    key: 'twenty',
    pages: 20,
    label: '20 pages and up',
    pitch: 'Every service and every town you serve, each on its own page, each one indexable.',
    plan: 'The five above, plus a page for each service, a page for each town, and guides that answer what people ask AI.',
    setupCents: 99700,
    monthlyCents: 19700,
    bundleSetupCents: 99700,
    bundleMonthlyCents: 44700,
  },
  fifty: {
    key: 'fifty',
    pages: 50,
    label: '50 pages and up',
    pitch: 'The county. Every service in every town, so you are the answer wherever the question is asked.',
    plan: 'Services, towns, and every service-in-town pairing, plus the guides. Built to own the map.',
    setupCents: 199700,
    monthlyCents: 29700,
    bundleSetupCents: 199700,
    bundleMonthlyCents: 54700,
  },
};

/** Display order, smallest first. */
export const SITE_RUNG_KEYS: SiteRungKey[] = ['five', 'twenty', 'fifty'];

/** The rung a bare "site" or "bundle" means: the entry price. */
export const DEFAULT_SITE_RUNG: SiteRungKey = 'five';

export function isSiteRungKey(v: unknown): v is SiteRungKey {
  return v === 'five' || v === 'twenty' || v === 'fifty';
}

/**
 * Resolve a rung from anything a link or a form might carry: the key, the page
 * floor as a number or string ("20", 20), or nothing (the entry rung). Unknown
 * values fall to the entry rung rather than failing a checkout.
 */
export function resolveSiteRung(v: unknown): SiteRung {
  if (isSiteRungKey(v)) return SITE_RUNGS[v];
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN;
  if (Number.isFinite(n)) {
    // The largest rung whose floor the number reaches: 30 pages is the 20 rung.
    const hit = [...SITE_RUNG_KEYS].reverse().find((k) => n >= SITE_RUNGS[k].pages);
    if (hit) return SITE_RUNGS[hit];
  }
  return SITE_RUNGS[DEFAULT_SITE_RUNG];
}

/**
 * The tag an order carries in its products array for a rung above the entry
 * one: 'pages:20', 'pages:50'. Rides beside 'site' or 'bundle' so every reader
 * that checks for those keys keeps working, and the size is never lost between
 * the checkout, the webhook, the emails and the delivery board.
 */
export function pagesTag(rung: SiteRung): string | null {
  return rung.key === DEFAULT_SITE_RUNG ? null : `pages:${rung.pages}`;
}

export function rungFromProducts(products: unknown): SiteRung {
  const tag = Array.isArray(products) ? (products as unknown[]).find((p) => typeof p === 'string' && p.startsWith('pages:')) : null;
  return resolveSiteRung(typeof tag === 'string' ? tag.slice('pages:'.length) : null);
}

/**
 * Every way the ladder can be wrong, as sentences. Empty means the ladder
 * holds. Run at build time (scripts/check-price-ladder.mjs) and by the
 * checkout health check, so a repricing that breaks "no path buys more for
 * less" cannot ship.
 */
export function ladderViolations(): string[] {
  const out: string[] = [];
  const voice = DEMO_PRODUCTS.voice;
  const five = SITE_RUNGS.five;
  if (five.setupCents !== DEMO_PRODUCTS.site.setupCents || five.monthlyCents !== DEMO_PRODUCTS.site.monthlyCents) {
    out.push('the 5-page rung and DEMO_PRODUCTS.site disagree');
  }
  if (five.bundleSetupCents !== DEMO_BUNDLE.setupCents || five.bundleMonthlyCents !== DEMO_BUNDLE.monthlyCents) {
    out.push('the 5-page rung and DEMO_BUNDLE disagree');
  }
  let below: SiteRung | null = null;
  for (const key of SITE_RUNG_KEYS) {
    const r = SITE_RUNGS[key];
    const pairSetup = r.setupCents + voice.setupCents;
    const pairMonthly = r.monthlyCents + voice.monthlyCents;
    if (r.bundleSetupCents < Math.max(r.setupCents, voice.setupCents)) out.push(`${r.label}: bundle setup is below the priciest single`);
    if (r.bundleSetupCents >= pairSetup) out.push(`${r.label}: bundle setup is not below the two pieces apart`);
    if (r.bundleMonthlyCents <= Math.max(r.monthlyCents, voice.monthlyCents)) out.push(`${r.label}: bundle monthly is not above the priciest single`);
    if (r.bundleMonthlyCents >= pairMonthly) out.push(`${r.label}: bundle monthly is not below the two pieces apart`);
    if (below) {
      if (r.pages <= below.pages) out.push(`${r.label}: page floor does not rise above ${below.label}`);
      if (r.setupCents <= below.setupCents || r.monthlyCents <= below.monthlyCents) out.push(`${r.label}: site price does not rise above ${below.label}`);
      if (r.bundleSetupCents <= below.bundleSetupCents || r.bundleMonthlyCents <= below.bundleMonthlyCents) out.push(`${r.label}: bundle price does not rise above ${below.label}`);
    }
    below = r;
  }
  return out;
}

export type DemoOrderQuote = {
  /** normalized selection; ['bundle'] when both paid pieces are picked, plus 'pages:N' above the entry rung */
  products: string[];
  label: string;
  setupCents: number;
  monthlyCents: number;
  isBundle: boolean;
  /** The website size priced in, when a site or the bundle is in the quote. */
  rung: SiteRung | null;
};

/**
 * Normalize a selection into a priced quote. Both paid pieces on their own = the
 * bundle. Every other selection bills each piece in it at its own price.
 * NOTHING IS EVER WAIVED ANY MORE. Returns null when nothing is picked.
 *
 * It filters against PRICEABLE_KEYS rather than DEMO_ORDER_KEYS, so a
 * standalone command center still quotes even though the suite no longer
 * offers it.
 */
export function quoteDemoOrder(selection: string[], rungWanted?: unknown): DemoOrderQuote | null {
  const picked = PRICEABLE_KEYS.filter((k) => selection.includes(k));
  if (picked.length === 0) return null;
  const hasVoice = picked.includes('voice');
  const hasSite = picked.includes('site');
  // A rung only means something when a website is in the quote. A voice-only
  // or command-center-only order carries none, whatever the link said.
  const rung = hasSite ? resolveSiteRung(rungWanted) : null;
  const tag = rung ? pagesTag(rung) : null;
  // The label says the size above the entry rung, so the Stripe line, the
  // receipt, the owner email and the delivery board all read the same thing.
  const sized = (name: string) => (rung && tag ? `${name}, ${rung.label}` : name);
  // The Talking Website is exactly the two paid pieces. A command center added
  // deliberately alongside them is not part of it and bills on top, because
  // there is no waiver left anywhere in this file.
  if (hasVoice && hasSite && picked.length === 2 && rung) {
    return {
      products: tag ? ['bundle', tag] : ['bundle'],
      label: sized(DEMO_BUNDLE.name),
      setupCents: rung.bundleSetupCents,
      monthlyCents: rung.bundleMonthlyCents,
      isBundle: true,
      rung,
    };
  }
  // Nothing is waived anywhere: every picked piece is billable at its own price.
  // The site bills at its rung; everything else at its one price.
  const billable = picked;
  const items = billable.map((k) => {
    const p = DEMO_PRODUCTS[k];
    if (k === 'site' && rung) return { name: sized(p.name), setupCents: rung.setupCents, monthlyCents: rung.monthlyCents };
    return { name: p.name, setupCents: p.setupCents, monthlyCents: p.monthlyCents };
  });
  return {
    products: tag ? [...billable, tag] : billable,
    label: items.map((i) => i.name).join(' + '),
    setupCents: items.reduce((s, i) => s + i.setupCents, 0),
    monthlyCents: items.reduce((s, i) => s + i.monthlyCents, 0),
    isBundle: false,
    rung,
  };
}

export function formatUsd(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`;
}
