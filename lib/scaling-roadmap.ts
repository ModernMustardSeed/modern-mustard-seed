/**
 * THE HUNDREDFOLD ROADMAP engine.
 *
 * Takes a business website (plus whatever optional context the owner
 * volunteers), reads the actual pages, and writes a personalized scaling plan:
 * the one constraint holding the business, a rebuilt offer, a money model, a
 * lead engine, four dated phases, and a scoreboard.
 *
 * The shape of the thinking is the modern operator canon (value equation,
 * grand-slam offer construction, the four acquisition channels, client-financed
 * acquisition, constraint theory). The voice, the naming, and the ladder are
 * Modern Mustard Seed's. Nothing in the output cites, credits, or imitates
 * another operator by name; it is our framework, in our words.
 *
 * Built on the same bones as lib/website-audit.ts on purpose: one fetch budget,
 * one model ladder with backoff and fallback, one optional free local engine.
 * Both are called from a public route, an admin route, and scripts, so the
 * engine lives here and the routes stay thin.
 */

import Anthropic from '@anthropic-ai/sdk';
import { parse } from 'node-html-parser';
// Static import, deliberately. See the long note in lib/website-audit.ts: a
// dynamic import of this module landed in a shared ESM chunk and took every API
// route down. Bundle size is handled in next.config.ts, not here.
import { claudeCodeAvailable, extractJson, runClaudeCodeJson } from './claude-code-json';

/* -------------------------------------------------------------------------- */
/* The report                                                                  */
/* -------------------------------------------------------------------------- */

// The shape lives in its own module so the renderer and the client tool can
// import it without pulling the Anthropic SDK and node:child_process into the
// browser bundle. Re-exported so server callers still have one import path.
import { STAGES, CONSTRAINTS } from './roadmap-shape';
export { STAGES, CONSTRAINTS } from './roadmap-shape';
export type { Stage, ConstraintType, RoadmapReport, RoadmapContext } from './roadmap-shape';
import type { RoadmapReport, RoadmapContext } from './roadmap-shape';

export type RoadmapResult =
  | {
      ok: true;
      url: string;
      host: string;
      report: RoadmapReport;
      usage?: { model: string; input: number; cache_read: number; output: number };
    }
  | { ok: false; status: number; error: string };

/* -------------------------------------------------------------------------- */
/* The prompt                                                                  */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `You are the lead strategist at Modern Mustard Seed, a one-person AI product studio in Kalispell, Montana. You write THE HUNDREDFOLD ROADMAP: a personalized scaling plan for one specific business, built from what their website actually says.

You think like the best acquisition operators alive. You never name them, never cite them, never say "the value equation as taught by" anyone. This is Modern Mustard Seed's framework, in Modern Mustard Seed's words. If a reader searches a phrase from this document, they should find us.

# What you are actually doing

Most owners are drowning in tactics. Your job is to hand them a document that (1) tells them the truth about where they are, (2) names the ONE thing capping them, (3) rebuilds their offer so it is worth more than the price, (4) shows how the money model pays for growth, (5) picks one lead channel and gives them a weekly number, and (6) sequences the year into four windows with a gate on each.

Specificity is the whole product. Generic advice is worthless and they can smell it. Every line must be usable by THIS business on Monday morning.

# The growth ladder (use these exact stage names)

- **Seed**: pre-revenue or under about $50K/yr. No repeatable offer. The owner is the product.
- **Sprout**: roughly $50K to $250K. One offer works, delivery is all owner, feast and famine.
- **Sapling**: roughly $250K to $1M. Repeatable offer, first hires, the owner is now the bottleneck.
- **Tree**: roughly $1M to $5M. Real team, real systems, the constraint moves to leadership and margin.
- **Orchard**: $5M+ or the business runs without the owner in the room.

Infer the stage from the evidence on the site (team page size, client list, pricing, locations, hiring, press, "since 1998", franchise language). Never claim to know revenue you cannot see. Say what the site implies and say it plainly.

# THE SCALE SCORE (0-100)

Five dimensions, 20 points each. Score honestly, most businesses land 30-60.
1. **Offer clarity**: can a stranger tell what is sold, to whom, and why it beats the alternative, in 5 seconds.
2. **Pricing power**: is price visible, is it premium, is it anchored to an outcome rather than an hour.
3. **Lead engine**: is there evidence of any repeatable way new people arrive (content, ads, reviews, referrals, a captured list).
4. **Conversion path**: is there a single obvious next step, a real reason to take it now, and a way to capture people who are not ready.
5. **Leverage**: does the business have anything that keeps working while the owner sleeps (recurring revenue, a team, automation, an audience, a system, AI).

# THE CONSTRAINT

Exactly one of: leads, sales, delivery, cash, offer, owner. Businesses die of one thing at a time. Pick the one that, if fixed, makes the next 90 days move, and defend it with evidence from their site. Then state what it costs them to keep ignoring it in dollars or in months, and name the first move (one sentence, doable this week).

# THE VALUE EQUATION

Four levers, scored 1 to 10 against their CURRENT offer as the site presents it:
- **Dream outcome**: how big is the result they promise.
- **Perceived likelihood**: how believable is it that this buyer specifically gets that result (proof, guarantees, reviews, credentials, case numbers).
- **Time to result**: how fast, or how slow. Faster scores higher.
- **Effort and sacrifice**: how much work, risk, and disruption the buyer has to absorb. Less scores higher.
Every lever gets a note (what you see) and a fix (what to change, specifically).

# THE OFFER

Rebuild their core offer so it is obviously worth more than the price. Give it a name a buyer would repeat. Name a real price or price range in dollars, and defend it. Write a guarantee they could actually honor (conditional, specific, not "satisfaction guaranteed"). Write a reason to buy now that is TRUE for their business (capacity, season, cohort, install slots), never a fake countdown.

The offer stack is 4 to 7 line items. Each names a component, a dollar value for it, and one line on why the buyer cares. The stack's total value should make the price feel small.

Offer cuts: 2 to 4 things to REMOVE. Discounts, the free consult that attracts tire kickers, the cheapest tier, the third service line nobody buys. Cutting is half of pricing power.

# THE MONEY MODEL

How the business funds its own growth:
- **Attraction**: the low-friction first yes, priced so it pays for the ad or the outreach that produced it.
- **Core**: the main offer, the one the whole business is built to deliver.
- **Continuity**: what recurs monthly. Every business on this list needs one, even if it has to be invented. Say what theirs should be.
- **Upsell** and **downsell**: the next yes, and the one that saves a no.
- **Cash rule**: state it as a rule they can check ("collect more in the first 30 days from a new client than it cost to get them").
- **LTGP:CAC**: the target ratio and what theirs likely is now. 3:1 is survival, 5:1 is comfortable, below 3:1 growth eats the business.

# THE LEAD ENGINE

Pick ONE primary channel from: warm outreach, content, cold outreach, paid ads, referrals and partners. One. Justify it from their situation (list size, audience, budget, industry, local vs national). Give a weekly volume number that is specific and countable ("40 calls and 100 texts a week to past customers", not "increase outreach"). Design one lead magnet they could ship in a week, and name it.

Then 3 to 4 channel plays, each with the play, an actual hook or first line they can copy, and a cadence.

# THE FOUR PHASES

Windows: "Days 1-30", "Days 31-90", "Days 91-180", "Days 181-365". Each phase gets a title, one goal, 3 to 4 moves, one metric that says it is working, and a gate: the number that must be true before they are allowed to move on. Gates are the discipline. Be strict.

# THE SCOREBOARD

6 to 8 metrics. For each: the metric, why it matters for THIS business, the honest current state (estimate from the site, or "unknown, start tracking"), and the target.

# WHERE AI DOES THE WORK

3 to 5 places an AI teammate removes a real cost or a real delay for this specific business. Each names the department from this list, exactly: The Talking Website, Voice Agents, Command Center, Mustard Pictures, Mustard Broadcast, GEO Desk, Websites, The Chief. Say what it does for them, concretely. Never quote a price. Never promise a result you cannot defend.

# NEXT THREE

Three moves for THIS WEEK. Ordered. Each one starts with a verb and could be done in a day.

# TWO ANGLES

Two strategic angles that are not obvious. The thing you would say to the owner over coffee that they have not considered. One should be an opportunity, one should be a risk.

# Voice

- No em dashes anywhere. Periods, commas, parentheses.
- Second person. "You" and "your business".
- Direct, warm, founder to founder. Confident, never smug. No hedging, no "it depends", no "consider possibly".
- Specific over clever. Name their actual services, their actual towns, their actual words back to them.
- No corporate filler: leverage as a verb, synergy, unlock, seamless, cutting-edge, robust, holistic. Banned.
- Never invent facts about them. If you are inferring, say "your site suggests" or "assuming". If a number is unknown, say so and tell them to start tracking it.
- Dollar figures are estimates and should read as estimates.

# What you actually read, and how to talk about it

You are given a SAMPLE of their site: the homepage, plus up to three of their pricing, services, about, and contact pages. That is not the whole site. The \`pages\` key names exactly which ones you got.

So never write "nowhere on your site", "the only price anywhere", "you have no X". Scope every absence claim to what you read: "on your homepage", "on the pages we read", "your services page does not". An owner who reads a confident claim about their own site that is simply wrong stops believing the rest of the document, and they are right to.

The same rule holds for anything the owner told you directly. If their context says they charge $497 and the page you read does not show a price, the $497 is the fact and the missing price on that page is the finding.

Return JSON matching the schema exactly. Nothing else.`;

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

const str = { type: 'string' as const };
const obj = <T extends Record<string, unknown>>(properties: T) => ({
  type: 'object' as const,
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const arr = (items: unknown) => ({ type: 'array' as const, items });

const REPORT_SCHEMA = obj({
  business_name: str,
  one_liner: str,
  stage: { type: 'string' as const, enum: [...STAGES] },
  scale_score: { type: 'number' as const },
  headline: str,
  verdict: str,
  constraint: obj({
    type: { type: 'string' as const, enum: [...CONSTRAINTS] },
    title: str,
    evidence: str,
    cost_of_ignoring: str,
    first_move: str,
  }),
  value_equation: arr(obj({ lever: str, score: { type: 'number' as const }, note: str, fix: str })),
  offer: obj({
    name: str,
    promise: str,
    price: str,
    price_logic: str,
    guarantee: str,
    urgency: str,
  }),
  offer_stack: arr(obj({ item: str, value: str, why: str })),
  offer_cuts: arr(str),
  money_model: obj({
    attraction: str,
    core: str,
    continuity: str,
    upsell: str,
    downsell: str,
    cash_rule: str,
    ltgp_cac: str,
  }),
  lead_engine: obj({ primary_channel: str, why: str, lead_magnet: str, weekly_volume: str }),
  channel_plays: arr(obj({ channel: str, play: str, hook: str, cadence: str })),
  phases: arr(obj({ window: str, title: str, goal: str, moves: arr(str), metric: str, gate: str })),
  scoreboard: arr(obj({ metric: str, why: str, current: str, target: str })),
  ai_leverage: arr(obj({ title: str, what: str, department: str })),
  next_three: arr(str),
  angles: arr(obj({ title: str, argument: str })),
});

/**
 * WHY THIS SCHEMA IS INSTRUCTED RATHER THAN ENFORCED.
 *
 * The first API run of this engine died instantly on a 400: "The compiled
 * grammar is too large, which would cause performance issues." Structured
 * outputs compile the schema into a grammar, and a strict object with N
 * properties costs roughly N-factorial in orderings. The audit's report fits
 * (7 root keys). This one has 19, and 19! does not.
 *
 * Shrinking the document to fit the grammar would be the tail wagging the dog:
 * the roadmap's length IS the product. So the schema is handed to the model as
 * instructions (exactly how the free CLI engine has always done it), and the
 * answer goes through the shared extractJson repair path. A model that returns
 * unparseable JSON is retried like any other transient failure.
 */
const ROOT_KEYS = Object.keys(REPORT_SCHEMA.properties);
const SCHEMA_INSTRUCTIONS = [
  'Return ONLY a single JSON object matching this JSON Schema. No preamble, no commentary, no markdown fence, no trailing text. The very first character of your reply must be {.',
  '',
  JSON.stringify(REPORT_SCHEMA),
  '',
  `The root object has exactly these ${ROOT_KEYS.length} keys, and every one of them is a DIRECT CHILD of the root: ${ROOT_KEYS.join(', ')}. They are siblings of each other. None of them is nested inside another. Close each nested object before you start the next root key, and check your closing braces before you answer.`,
].join('\n');

/* -------------------------------------------------------------------------- */
/* Reading the business                                                        */
/* -------------------------------------------------------------------------- */

/**
 * A hard wall-clock budget for everything before the model call, for the same
 * reason website-audit has one: the businesses that need this tool most have the
 * slowest sites, and a blown maxDuration reads to the visitor as a broken button.
 */
const FETCH_BUDGET_MS = 22_000;
const cap = (until: number, want: number) => Math.max(1500, Math.min(want, until - Date.now()));

const UA_HONEST =
  'Mozilla/5.0 (compatible; MMS-ScalingRoadmap/1.0; +https://modernmustardseed.com/scaling-roadmap)';
const UA_BROWSER =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchHtml(url: string, until: number): Promise<string | null> {
  const attempt = (ua: string) =>
    fetch(url, {
      headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(cap(until, 9000)),
    });
  try {
    let resp = await attempt(UA_HONEST);
    // Some firewalls blanket-403 any bot UA. Retry once looking like a browser.
    if (resp.status === 403 || resp.status === 406) resp = await attempt(UA_BROWSER);
    if (!resp.ok) return null;
    return (await resp.text()).slice(0, 220_000);
  } catch {
    return null;
  }
}

function textOf(html: string, limit: number): string {
  const root = parse(html, { lowerCaseTagName: true });
  for (const el of root.querySelectorAll('script, style, noscript, svg')) el.remove();
  return (root.querySelector('body')?.text ?? root.text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

/**
 * Which second pages are worth the budget. A scaling roadmap lives or dies on
 * whether it knows what the business SELLS and for HOW MUCH, so pricing and
 * services pages outrank everything else, and the about page carries the team
 * size and the years-in-business signal that sets the stage.
 */
const PAGE_PRIORITY: { key: string; test: RegExp }[] = [
  { key: 'pricing', test: /\/(pricing|prices|plans|packages|rates|investment|menu)\b/i },
  { key: 'services', test: /\/(services|what-we-do|solutions|offerings|programs|shop|products|treatments)\b/i },
  { key: 'about', test: /\/(about|our-story|team|who-we-are|company)\b/i },
  { key: 'contact', test: /\/(contact|book|schedule|quote|estimate|appointment)\b/i },
];

function pickInternalLinks(root: ReturnType<typeof parse>, origin: string, hostname: string) {
  const found = new Map<string, string>();
  for (const a of root.querySelectorAll('a[href]')) {
    const raw = a.getAttribute('href') ?? '';
    if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    let abs: URL;
    try {
      abs = new URL(raw, origin);
    } catch {
      continue;
    }
    if (abs.hostname !== hostname) continue;
    abs.hash = '';
    for (const { key, test } of PAGE_PRIORITY) {
      if (found.has(key)) continue;
      if (test.test(abs.pathname)) found.set(key, abs.toString());
    }
  }
  return found;
}

type BusinessRead = {
  url: string;
  host: string;
  title: string | null;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  nav_labels: string[];
  cta_labels: string[];
  prices_seen: string[];
  phones: string[];
  emails: string[];
  social: string[];
  has_booking_widget: boolean;
  has_chat_widget: boolean;
  has_ecommerce_hint: boolean;
  has_email_capture: boolean;
  review_mentions: number;
  home_text: string;
  pages: Record<string, string>;
};

const PRICE_RE = /\$\s?\d[\d,]*(?:\.\d{2})?(?:\s?(?:\/|per\s)\s?(?:mo|month|hr|hour|yr|year|week|session|person|sq\.?\s?ft))?/gi;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

async function readBusiness(target: URL, until: number): Promise<BusinessRead | null> {
  const homeHtml = await fetchHtml(target.toString(), until);
  if (!homeHtml) return null;

  const root = parse(homeHtml, { lowerCaseTagName: true });
  const links = pickInternalLinks(root, target.origin, target.hostname);

  // Up to three extra pages, priority order, and only while budget remains.
  const pages: Record<string, string> = {};
  const wanted = PAGE_PRIORITY.map((p) => p.key).filter((k) => links.has(k)).slice(0, 3);
  const fetched = await Promise.all(
    wanted.map(async (key) => {
      if (Date.now() > until - 2500) return [key, null] as const;
      const html = await fetchHtml(links.get(key)!, until);
      return [key, html ? textOf(html, 6000) : null] as const;
    })
  );
  for (const [key, text] of fetched) if (text) pages[key] = text;

  const allText = [homeHtml, ...Object.values(pages)].join(' ');
  const lower = homeHtml.toLowerCase();
  const uniq = (xs: string[], n: number) => Array.from(new Set(xs.map((x) => x.trim()))).filter(Boolean).slice(0, n);

  const ctaLabels = root
    .querySelectorAll('a, button')
    .map((el) => el.text.replace(/\s+/g, ' ').trim())
    .filter((t) => t.length > 2 && t.length < 40);

  return {
    url: target.toString(),
    host: target.hostname.replace(/^www\./, ''),
    title: root.querySelector('title')?.text?.trim()?.slice(0, 200) ?? null,
    meta_description:
      root.querySelector('meta[name="description"]')?.getAttribute('content')?.slice(0, 400) ?? null,
    h1: uniq(root.querySelectorAll('h1').map((h) => h.text.replace(/\s+/g, ' ').trim()), 4),
    h2: uniq(root.querySelectorAll('h2').map((h) => h.text.replace(/\s+/g, ' ').trim()), 14),
    nav_labels: uniq(
      root.querySelectorAll('nav a, header a').map((a) => a.text.replace(/\s+/g, ' ').trim()),
      22
    ),
    cta_labels: uniq(ctaLabels, 18),
    prices_seen: uniq(allText.match(PRICE_RE) ?? [], 18),
    phones: uniq(homeHtml.match(PHONE_RE) ?? [], 3),
    emails: uniq(homeHtml.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) ?? [], 3),
    social: uniq(
      root
        .querySelectorAll('a[href]')
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) => /facebook|instagram|linkedin|youtube|tiktok|x\.com|twitter|yelp|pinterest/i.test(h)),
      8
    ),
    has_booking_widget: /calendly|acuity|squareup|booksy|vagaro|mindbody|setmore|housecallpro|jobber|servicetitan|opentable|resy|schedulicity/i.test(lower),
    has_chat_widget: /intercom|crisp\.chat|tawk\.to|tidio|driftt|hubspot-messages|zendesk|livechat|freshchat|podium/i.test(lower),
    has_ecommerce_hint: /shopify|woocommerce|add to cart|bigcommerce|squarespace-commerce|snipcart|stripe\.com\/checkout/i.test(lower),
    has_email_capture: /newsletter|subscribe|join our list|sign up for|email list|mailchimp|klaviyo|convertkit/i.test(lower),
    review_mentions: (allText.match(/review|testimonial|5[\s-]?star|google rating|yelp/gi) ?? []).length,
    home_text: textOf(homeHtml, 9000),
    pages,
  };
}

/* -------------------------------------------------------------------------- */
/* Model plumbing (mirrors website-audit: backoff, then walk down the ladder)   */
/* -------------------------------------------------------------------------- */

const ROADMAP_MODELS = (process.env.ROADMAP_MODELS || process.env.AUDIT_MODELS || 'claude-opus-5,claude-sonnet-5')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

class MalformedReport extends Error {}

function isTransient(err: unknown): boolean {
  if (err instanceof MalformedReport) return true;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.APIError) {
    if (err.status === 401 || err.status === 400 || err.status === 403) return false;
    if (/credit balance|billing|purchase credits/i.test(err.message)) return false;
    return err.status === 429 || err.status === 529 || (err.status ?? 0) >= 500;
  }
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One roadmap call measures 150 to 320 seconds, so a blind retry is not free:
 * on the public route it is the difference between a slow answer and a 504 with
 * nothing to show. Retries only start when there is plausibly time to finish
 * one, and the caller sets the wall.
 */
const ONE_RUN_MS = 170_000;

async function withModelFallback<T>(
  run: (model: string) => Promise<T>,
  deadline: number
): Promise<{ value: T; model: string }> {
  let last: unknown;
  for (const model of ROADMAP_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return { value: await run(model), model };
      } catch (err) {
        last = err;
        if (!isTransient(err)) throw err;
        if (Date.now() + ONE_RUN_MS > deadline) {
          console.warn('scaling-roadmap: out of time to retry, giving up on this run');
          throw last;
        }
        if (attempt < 1) await sleep(1500);
      }
    }
    console.warn(`scaling-roadmap: ${model} is not answering, dropping to the next model`);
  }
  throw last;
}

function roadmapEngine(): 'api' | 'claude-code' {
  const want = (process.env.ROADMAP_ENGINE || process.env.AUDIT_ENGINE)?.trim().toLowerCase();
  if (want === 'claude-code' || want === 'claude') {
    if (!claudeCodeAvailable()) {
      console.warn('scaling-roadmap: claude-code requested but no local CLI, using the API');
      return 'api';
    }
    return 'claude-code';
  }
  return 'api';
}

/**
 * The model is told the counts; the schema cannot enforce them (structured
 * outputs rejects minItems/maxItems). Trim here so the UI can lay out against a
 * known ceiling, and so the free CLI engine (no schema enforcement at all) can
 * never blow up a grid.
 */
/**
 * Also a type guard, not only a trimmer.
 *
 * Neither engine has a hard schema now, so a malformed item can reach the
 * renderer. Observed on the first API run: one entry of `offer_cuts` arrived as
 * `{"0":"C","1":"u","2":"t"}`, a string that got exploded into an object
 * somewhere in the repair path. React renders that as a crash, not as a typo.
 * Anything that is not the shape the renderer expects is dropped here, where it
 * costs one bullet, rather than in the browser, where it costs the whole page.
 */
function trimToShape(report: RoadmapReport): RoadmapReport {
  const take = <T>(xs: unknown, n: number, keep: (x: unknown) => boolean): T[] =>
    Array.isArray(xs) ? (xs.filter(keep).slice(0, n) as T[]) : [];
  const isText = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0;
  /** An object item is usable when the field the renderer keys off is present. */
  const hasKeys =
    (...keys: string[]) =>
    (x: unknown): boolean =>
      Boolean(x) && typeof x === 'object' && !Array.isArray(x) && keys.every((k) => k in (x as object));
  const text = (x: unknown, fallback = ''): string => (isText(x) ? x : fallback);

  report.value_equation = take(report.value_equation, 4, hasKeys('lever', 'score', 'note', 'fix'));
  for (const l of report.value_equation) l.score = Math.max(0, Math.min(10, Number(l.score) || 0));
  report.offer_stack = take(report.offer_stack, 7, hasKeys('item', 'value', 'why'));
  report.offer_cuts = take(report.offer_cuts, 4, isText);
  report.channel_plays = take(report.channel_plays, 4, hasKeys('channel', 'play', 'hook', 'cadence'));
  report.phases = take<RoadmapReport['phases'][number]>(
    report.phases,
    4,
    hasKeys('window', 'title', 'goal', 'moves', 'metric', 'gate')
  ).map((p) => ({ ...p, moves: take(p.moves, 4, isText) }));
  report.scoreboard = take(report.scoreboard, 8, hasKeys('metric', 'why', 'current', 'target'));
  report.ai_leverage = take(report.ai_leverage, 5, hasKeys('title', 'what', 'department'));
  report.next_three = take(report.next_three, 3, isText);
  report.angles = take(report.angles, 2, hasKeys('title', 'argument'));

  report.scale_score = Math.max(0, Math.min(100, Math.round(Number(report.scale_score) || 0)));
  report.business_name = text(report.business_name, 'Your business');
  report.stage = (STAGES as readonly string[]).includes(report.stage) ? report.stage : 'Sprout';

  // The renderer reads these unconditionally. An engine that dropped one should
  // produce an empty card, never a white screen.
  const c = (report.constraint ?? {}) as Partial<RoadmapReport['constraint']>;
  report.constraint = {
    type: (CONSTRAINTS as readonly string[]).includes(c.type ?? '') ? c.type! : 'offer',
    title: text(c.title, 'The constraint could not be read on this run'),
    evidence: text(c.evidence),
    cost_of_ignoring: text(c.cost_of_ignoring),
    first_move: text(c.first_move),
  };
  const o = (report.offer ?? {}) as Partial<RoadmapReport['offer']>;
  report.offer = {
    name: text(o.name),
    promise: text(o.promise),
    price: text(o.price),
    price_logic: text(o.price_logic),
    guarantee: text(o.guarantee),
    urgency: text(o.urgency),
  };
  const m = (report.money_model ?? {}) as Partial<RoadmapReport['money_model']>;
  report.money_model = {
    attraction: text(m.attraction),
    core: text(m.core),
    continuity: text(m.continuity),
    upsell: text(m.upsell),
    downsell: text(m.downsell),
    cash_rule: text(m.cash_rule),
    ltgp_cac: text(m.ltgp_cac),
  };
  const le = (report.lead_engine ?? {}) as Partial<RoadmapReport['lead_engine']>;
  report.lead_engine = {
    primary_channel: text(le.primary_channel),
    why: text(le.why),
    lead_magnet: text(le.lead_magnet),
    weekly_volume: text(le.weekly_volume),
  };

  return report;
}

/**
 * A truncated roadmap must fail loudly.
 *
 * Observed 2026-08-07: at max_tokens 12000 with effort 'high', the reply ran out
 * of budget right after `offer_cuts`. The repair path dutifully closed the open
 * container, the parse succeeded, and the sanitizer turned the six missing
 * sections into empty arrays. The result was a confident, well-formed document
 * with no phases, no scoreboard, and no next steps, and it saved without a
 * murmur. Half a roadmap is worse than an error, because an error retries.
 *
 * These six sections are the plan. Without them there is nothing to deliver, so
 * their absence is a transient failure, and the ladder above retries it.
 */
function assertComplete(report: RoadmapReport): RoadmapReport {
  const missing = (
    [
      ['value_equation', report.value_equation],
      ['offer_stack', report.offer_stack],
      ['channel_plays', report.channel_plays],
      ['phases', report.phases],
      ['scoreboard', report.scoreboard],
      ['ai_leverage', report.ai_leverage],
      ['next_three', report.next_three],
      ['angles', report.angles],
    ] as const
  )
    .filter(([, v]) => !v?.length)
    .map(([k]) => k);
  if (missing.length) {
    throw new MalformedReport(`roadmap came back incomplete, missing: ${missing.join(', ')}`);
  }
  return report;
}

const finalize = (report: RoadmapReport) => assertComplete(trimToShape(report));

/* -------------------------------------------------------------------------- */
/* The run                                                                     */
/* -------------------------------------------------------------------------- */

function contextBlock(ctx: RoadmapContext): string {
  const lines = [
    ctx.revenue && `Roughly what they make now: ${ctx.revenue}`,
    ctx.team_size && `Team size: ${ctx.team_size}`,
    ctx.main_offer && `What they say they mainly sell: ${ctx.main_offer}`,
    ctx.price_point && `What they say they charge: ${ctx.price_point}`,
    ctx.biggest_headache && `The owner's own words on what is stuck: ${ctx.biggest_headache}`,
    ctx.goal && `Where they want to be in 12 months: ${ctx.goal}`,
  ].filter(Boolean);
  if (!lines.length) {
    return 'The owner did not volunteer any extra context. Work from the site alone, and say plainly where you are inferring.';
  }
  return `The owner told us this directly. It outranks anything you infer from the site:\n${lines.join('\n')}`;
}

/**
 * How hard the model thinks before writing.
 *
 * Measured 2026-08-07 against modernmustardseed.com on claude-opus-5: effort
 * 'high' took 320 seconds for the model call alone, which does not fit inside a
 * serverless function's 300 second ceiling. The public route therefore runs
 * 'medium' and the desk and the seed script (no HTTP timeout over them) run
 * 'high'. Anything that changes here must be re-timed, not assumed.
 */
export type RoadmapEffort = 'medium' | 'high';

/** Run a full roadmap for one URL. Never throws; failures come back as `ok: false`. */
export async function runScalingRoadmap(
  rawUrl: string,
  context: RoadmapContext = {},
  opts: { effort?: RoadmapEffort; deadlineMs?: number } = {}
): Promise<RoadmapResult> {
  // Everything, fetch included, has to finish inside this. The public route
  // passes its own function ceiling minus a margin; scripts pass nothing and
  // are allowed to take as long as the model takes.
  const deadline = Date.now() + (opts.deadlineMs ?? 30 * 60_000);
  const engine = roadmapEngine();

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/\\n$/, '');
  if (!apiKey && engine === 'api') {
    return { ok: false, status: 500, error: 'The roadmap engine is not configured. Email sarah@modernmustardseed.com.' };
  }

  let raw = (rawUrl ?? '').trim();
  if (!raw) return { ok: false, status: 400, error: 'Drop your website URL.' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return { ok: false, status: 400, error: 'That URL is not valid.' };
  }
  if (!/^https?:$/.test(target.protocol) || !target.hostname.includes('.')) {
    return { ok: false, status: 400, error: 'That URL is not valid.' };
  }

  const until = Date.now() + FETCH_BUDGET_MS;
  const read = await readBusiness(target, until);
  if (!read) {
    return {
      ok: false,
      status: 400,
      error: 'Could not load that site. Check it opens in a browser, then try again.',
    };
  }

  const userMessage = `Write the Hundredfold Roadmap for this business.

URL: ${read.url}

${contextBlock(context)}

Pages read on this run: homepage${Object.keys(read.pages).length ? `, ${Object.keys(read.pages).join(', ')}` : ' only'}. Scope every "you do not have" claim to those pages.

What their site actually says (extracted, truncated):
${JSON.stringify(read, null, 2)}

Rules for this run:
- Use their real words, services, and towns. Quote their headline back to them where it helps.
- Score the five dimensions honestly and let the total be whatever it is.
- Pick exactly one constraint and defend it with something you can point to on their site.
- Name real dollar figures for the offer and the stack, framed as estimates.
- Every phase gate is a number.
- No em dashes.
- Counts, and they are not suggestions: exactly 4 value_equation levers, 4 to 7 offer_stack items, 2 to 4 offer_cuts, 3 to 4 channel_plays, exactly 4 phases, 6 to 8 scoreboard rows, 3 to 5 ai_leverage items, exactly 3 next_three, exactly 2 angles.

Return the JSON roadmap.`;

  if (engine === 'claude-code') {
    try {
      const report = (await runClaudeCodeJson({
        system: SYSTEM_PROMPT,
        user: userMessage,
        schema: REPORT_SCHEMA,
        model: process.env.ROADMAP_CLI_MODEL,
        label: `roadmap ${read.host}`,
      })) as RoadmapReport;
      return {
        ok: true,
        url: read.url,
        host: read.host,
        report: finalize(report),
        // Truthfully zero: this ran on the subscription.
        usage: { model: 'claude-code (subscription)', input: 0, cache_read: 0, output: 0 },
      };
    } catch (err) {
      console.error('scaling-roadmap: claude-code engine failed:', err instanceof Error ? err.message : err);
      return { ok: false, status: 503, error: 'The roadmap engine hit a snag. Try again, or email sarah@modernmustardseed.com.' };
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const attempt = async (model: string) => {
      // Streamed for the same reason the audit is: this is a 60 to 120 second
      // call and a non-streaming request in that range risks an HTTP timeout
      // with nothing to show for it.
      const response = await anthropic.messages
        .stream({
          model,
          // Room for the document (roughly 9k tokens) AND the thinking that
          // effort 'high' spends, which is billed against the same ceiling. At
          // 12000 a high-effort run truncated mid-document.
          max_tokens: 24000,
          output_config: { effort: opts.effort ?? 'medium' },
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: `${userMessage}\n\n---\n\n${SCHEMA_INSTRUCTIONS}` }],
        })
        .finalMessage();

      // Say WHY it is broken before the parser guesses. A run that hit the
      // ceiling is a budget problem, not a JSON problem, and the log should
      // read that way when the next person raises max_tokens.
      if (response.stop_reason === 'max_tokens') {
        throw new MalformedReport('roadmap hit the max_tokens ceiling and was cut off');
      }
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new MalformedReport('no text block in response');
      let parsed: RoadmapReport;
      try {
        parsed = extractJson(textBlock.text, REPORT_SCHEMA, `roadmap ${read.host}`) as RoadmapReport;
      } catch (err) {
        throw new MalformedReport(err instanceof Error ? err.message : 'roadmap was not valid JSON');
      }
      return { report: finalize(parsed), response };
    };

    const {
      value: { report, response },
      model: usedModel,
    } = await withModelFallback(attempt, deadline);

    return {
      ok: true,
      url: read.url,
      host: read.host,
      report,
      usage: {
        model: usedModel,
        input: response.usage?.input_tokens ?? 0,
        cache_read: response.usage?.cache_read_input_tokens ?? 0,
        output: response.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, error: 'The roadmap engine is busy. Try again in a moment.' };
    }
    if (err instanceof Anthropic.APIError) {
      if (/credit balance|billing|purchase credits/i.test(err.message) || err.status === 401) {
        console.error('scaling-roadmap: ANTHROPIC ACCOUNT PROBLEM (top up credits or fix the key):', err.message);
        return {
          ok: false,
          status: 503,
          error: 'The roadmap engine is down for maintenance. Check back shortly, or email sarah@modernmustardseed.com.',
        };
      }
      console.error(`scaling-roadmap: anthropic status ${err.status}:`, err.message);
    } else {
      console.error('scaling-roadmap: unexpected error', err);
    }
    return { ok: false, status: 500, error: 'The roadmap engine hit a snag. Try again, or email sarah@modernmustardseed.com.' };
  }
}

/* -------------------------------------------------------------------------- */
/* Shared plumbing, for engines that are not "read a website"                  */
/* -------------------------------------------------------------------------- */

/**
 * Generate a roadmap from a brief instead of a site scrape.
 *
 * HUNDREDFOLD's deep roadmap is built from a thirty-question voice interview,
 * which is far better input than a homepage. It must still be the SAME
 * document: same sections, same gates, same renderer, so a member can lay the
 * free roadmap and the deep one side by side and see what the interview bought
 * them. That only stays true if both go through this one prompt.
 *
 * `extra` appends rules for the caller's situation without forking the prompt.
 */
export async function runRoadmapFromBrief(
  brief: string,
  opts: { effort?: RoadmapEffort; deadlineMs?: number; label?: string; extra?: string } = {}
): Promise<{ ok: true; report: RoadmapReport; model: string } | { ok: false; status: number; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim().replace(/\n$/, '');
  if (!apiKey) return { ok: false, status: 500, error: 'The roadmap engine is not configured.' };

  const deadline = Date.now() + (opts.deadlineMs ?? 30 * 60_000);
  const label = opts.label ?? 'roadmap-from-brief';
  const userMessage = `${brief}\n\n${opts.extra ?? ''}\n\nReturn the JSON roadmap.`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const attempt = async (model: string) => {
      const response = await anthropic.messages
        .stream({
          model,
          max_tokens: 24000,
          output_config: { effort: opts.effort ?? 'high' },
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: `${userMessage}\n\n---\n\n${SCHEMA_INSTRUCTIONS}` }],
        })
        .finalMessage();

      if (response.stop_reason === 'max_tokens') {
        throw new MalformedReport('roadmap hit the max_tokens ceiling and was cut off');
      }
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') throw new MalformedReport('no text block in response');
      let parsed: RoadmapReport;
      try {
        parsed = extractJson(textBlock.text, REPORT_SCHEMA, label) as RoadmapReport;
      } catch (err) {
        throw new MalformedReport(err instanceof Error ? err.message : 'roadmap was not valid JSON');
      }
      return finalize(parsed);
    };

    const { value, model } = await withModelFallback(attempt, deadline);
    return { ok: true, report: value, model };
  } catch (err) {
    if (err instanceof Anthropic.APIError && (/credit balance|billing/i.test(err.message) || err.status === 401)) {
      console.error(`${label}: ANTHROPIC ACCOUNT PROBLEM:`, err.message);
      return { ok: false, status: 503, error: 'The roadmap engine is down for maintenance.' };
    }
    console.error(`${label}: failed`, err instanceof Error ? err.message : err);
    return { ok: false, status: 500, error: 'The roadmap engine hit a snag.' };
  }
}
