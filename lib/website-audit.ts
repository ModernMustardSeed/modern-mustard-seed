/**
 * The website-audit engine, extracted so it can run from anywhere: the public
 * /website-audit page and the in-Tracker "audit this prospect" action both call
 * `runWebsiteAudit`. It fetches a page, extracts hard signals (title, headings,
 * schema, llms.txt, chat widget, etc.), and asks Claude to grade it across seven
 * categories, returning a structured report.
 *
 * Returns a discriminated result so each caller maps failures to its own HTTP
 * codes (the public route was already shaped this way; the admin route reuses it
 * and persists the report onto the prospect).
 */

import { fetchSiteFacts, siteFactsSummary, type SiteFacts } from '@/lib/site-facts';
import { parse } from 'node-html-parser';
// Relative, not the '@/' alias: this module is also imported directly by the
// tsx batch scripts (scripts/preaudit-leads.mts), which do not load tsconfig
// path aliases.
/**
 * A STATIC import, and it must stay static.
 *
 * The obvious way to keep this local-only engine out of the cloud bundle is a
 * dynamic `await import()` inside the branch that uses it. That was tried on
 * 2026-08-03 and took production's API routes down: Turbopack put the dynamic
 * import in a SHARED lib chunk, the chunk was emitted as ESM, and because this
 * package is "type": "module" every route that shared that chunk died on
 * 'require() of ES Module route.js from ___next_launcher.cjs not supported'.
 * The public signup route went with it. Pages kept rendering, so it read like a
 * partial outage rather than a bundling mistake.
 *
 * The bundle size problem it was trying to solve is handled where it belongs, in
 * next.config.ts, by not tracing the art directories into a lambda.
 */
import { llmJson, LlmUnavailable } from './llm';

const SYSTEM_PROMPT = `You are the senior website auditor for Modern Mustard Seed, a one-person product studio in Kalispell, Montana. You judge websites the way Sarah Scarano would: honest, direct, no hedging, no buzzword soup, no em dashes, plain words.

You grade websites across 7 categories, returning a 0-100 score and a letter grade (A+, A, A-, B+, B, B-, C+, C, C-, D, F) per category, plus an overall score, an honest headline, a 2-3 paragraph overall analysis, three top fixes, and a prioritized 10-15 item to-do list.

# The 7 categories

1. **Brand**. Name and tagline clarity. Value proposition. Voice. Visual coherence. Does a stranger know what this business does in 3 seconds.

2. **Trust**. Testimonials, social proof, real names, real photos, About page, contact information, privacy and terms, security signals, named clients, press, awards.

3. **SEO**. Title tag, meta description, H1 hierarchy, structured data (JSON-LD), canonical URLs, robots.txt, sitemap.xml, alt text on images, internal linking, content depth.

4. **GEO (AI search)**. The next frontier. llms.txt presence, /.well-known/ai.txt, FAQ schema, citable claims, named brand mentions in content, structured Q&A blocks, content that LLMs can quote verbatim. Most sites score F here. Sarah's own site (modernmustardseed.com) is a reference example.

5. **AI features**. Embedded chatbot, voice agent, personalization, dynamic content, AI-powered search, AI-augmented forms. Zero presence is the default.

6. **Conversion**. Primary CTA clarity. Hero CTA above the fold. Form simplicity. Friction. Urgency. Lead capture. Pricing visibility. Trust + commerce ratio.

7. **Design**. Typography. Color hierarchy. Whitespace. Mobile responsiveness implied by viewport meta and CSS. Visual rhythm. Modern feel.

# Voice and tone for the output

- No em dashes. Periods, commas, parentheses only.
- Direct. "The hero is weak" not "the hero could be stronger".
- Specific. "Your H1 reads 'Welcome'" not "the headline lacks impact".
- Encouraging but honest. Visitor needs to know what to fix, not feel bad.
- "You" not "the user" or "they".

# Scoring rubric

A range (90-100): elite, almost nothing to add.
B range (80-89): strong, a few specific gaps.
C range (70-79): solid baseline, multiple meaningful gaps.
D range (60-69): below average, foundational issues.
F (0-59): broken or missing the basics.

# The three top fixes

These are the highest-leverage moves the visitor can make. Order by impact, not alphabet. Each one has a title (3-7 words), a why (one sentence), and a how (one to two sentences with specifics).

# Full to-do list

10 to 15 items. Each carries a category, priority (high/medium/low), and a specific task. Order top to bottom by priority.

# Headline

One sentence. Honest. Memorable. Quotable. Examples:
- "Beautiful brand. Weak SEO foundation. Zero GEO."
- "Strong copy, missing trust signals, no chatbot."
- "Almost there. Three fixes from an A."

Return JSON matching the schema exactly. Nothing else.`;

const CATEGORY_SCHEMA = {
  type: 'object' as const,
  properties: {
    score: { type: 'number' },
    letter: {
      type: 'string',
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    },
    notes: { type: 'string' },
  },
  required: ['score', 'letter', 'notes'],
  additionalProperties: false,
};

const REPORT_SCHEMA = {
  type: 'object' as const,
  properties: {
    overall_score: { type: 'number' },
    letter_grade: {
      type: 'string',
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    },
    headline: { type: 'string' },
    overall_analysis: { type: 'string' },
    categories: {
      type: 'object' as const,
      properties: {
        brand: CATEGORY_SCHEMA,
        trust: CATEGORY_SCHEMA,
        seo: CATEGORY_SCHEMA,
        geo: CATEGORY_SCHEMA,
        ai_features: CATEGORY_SCHEMA,
        conversion: CATEGORY_SCHEMA,
        design: CATEGORY_SCHEMA,
      },
      required: ['brand', 'trust', 'seo', 'geo', 'ai_features', 'conversion', 'design'],
      additionalProperties: false,
    },
    top_three_fixes: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          title: { type: 'string' },
          why: { type: 'string' },
          how: { type: 'string' },
        },
        required: ['title', 'why', 'how'],
        additionalProperties: false,
      },
    },
    full_todo: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          category: {
            type: 'string',
            enum: ['brand', 'trust', 'seo', 'geo', 'ai_features', 'conversion', 'design'],
          },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
          task: { type: 'string' },
        },
        required: ['category', 'priority', 'task'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'overall_score',
    'letter_grade',
    'headline',
    'overall_analysis',
    'categories',
    'top_three_fixes',
    'full_todo',
  ],
  additionalProperties: false,
};

type Signals = {
  url: string;
  status: number;
  title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  meta_robots: string | null;
  viewport: string | null;
  canonical: string | null;
  h1_texts: string[];
  h1_count: number;
  h2_count: number;
  h3_count: number;
  og_tags: Record<string, string | null>;
  twitter_tags: Record<string, string | null>;
  json_ld_count: number;
  json_ld_types: string[];
  img_count: number;
  img_missing_alt: number;
  form_count: number;
  iframe_count: number;
  link_count: number;
  external_link_count: number;
  body_text_snippet: string | null;
  script_srcs: string[];
  has_chat_widget_hint: boolean;
  has_analytics: boolean;
  aux: {
    llms_txt: boolean;
    ai_txt: boolean;
    robots_txt: boolean;
    sitemap_xml: boolean;
  };
};

export type AuditCategory = { score: number; letter: string; notes: string };
export type WebsiteAuditReport = {
  overall_score: number;
  letter_grade: string;
  headline: string;
  overall_analysis: string;
  categories?: Record<string, AuditCategory>;
  top_three_fixes?: { title: string; why: string; how: string }[];
  full_todo?: { category: string; priority: string; task: string }[];
};

export type AuditSignalsSummary = {
  title: string | null;
  h1: string | null;
  json_ld_count: number;
  llms_txt: boolean;
  ai_txt: boolean;
  has_chat_widget: boolean;
  img_missing_alt: number;
};

export type AuditResult =
  | {
      ok: true;
      url: string;
      report: WebsiteAuditReport;
      signals_summary: AuditSignalsSummary;
      /** What the call actually cost. Batch runs price themselves off this rather than a guess. */
      usage?: { model: string; input: number; cache_read: number; output: number };
    }
  | { ok: false; status: number; error: string };

/**
 * A hard wall-clock budget for everything that happens BEFORE the model call.
 *
 * Measured 2026-07-27 against eight real prospect sites in production: the
 * Claude call alone takes 36 to 43 seconds. The route's ceiling was 60, so the
 * page fetch had roughly 17 seconds of headroom and there was nothing enforcing
 * it. One slow-but-reachable site (15s first try, another 15s on the bot-block
 * retry, plus 5s of aux files) pushes the whole request past the limit, and a
 * blown maxDuration is a 504 the rep reads as "the audit button is broken".
 *
 * Prospect sites are slow by definition. That is the product: we sell to
 * businesses whose sites are bad. So the fetch phase is capped rather than
 * hoped about, and the route ceiling was raised to match reality.
 */
const FETCH_BUDGET_MS = 20_000;
const cap = (until: number, want: number) => Math.max(1500, Math.min(want, until - Date.now()));

async function fetchAuxFile(origin: string, path: string, until: number): Promise<boolean> {
  try {
    const resp = await fetch(`${origin}${path}`, {
      signal: AbortSignal.timeout(cap(until, 5000)),
      redirect: 'follow',
    });
    return resp.ok;
  } catch {
    return false;
  }
}

function extractSignals(url: URL, html: string, status: number): Signals {
  const root = parse(html, { lowerCaseTagName: true });
  const headOf = (sel: string) => root.querySelector(sel);
  const allOf = (sel: string) => root.querySelectorAll(sel);

  const ogTags: Record<string, string | null> = {};
  for (const m of allOf('meta[property^="og:"]')) {
    const k = m.getAttribute('property');
    if (k) ogTags[k] = m.getAttribute('content') ?? null;
  }
  const twTags: Record<string, string | null> = {};
  for (const m of allOf('meta[name^="twitter:"]')) {
    const k = m.getAttribute('name');
    if (k) twTags[k] = m.getAttribute('content') ?? null;
  }

  const jsonLdTypes: string[] = [];
  for (const s of allOf('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(s.text);
      if (Array.isArray(parsed)) {
        for (const p of parsed) if (p?.['@type']) jsonLdTypes.push(String(p['@type']));
      } else if (parsed?.['@graph']) {
        for (const p of parsed['@graph']) if (p?.['@type']) jsonLdTypes.push(String(p['@type']));
      } else if (parsed?.['@type']) {
        jsonLdTypes.push(String(parsed['@type']));
      }
    } catch {
      // skip malformed JSON-LD
    }
  }

  const imgs = allOf('img');
  const links = allOf('a');
  const externalLinks = links.filter((a) => {
    const href = a.getAttribute('href') ?? '';
    return href.startsWith('http') && !href.includes(url.hostname);
  });
  const scriptSrcs = allOf('script[src]')
    .map((s) => s.getAttribute('src') ?? '')
    .filter(Boolean)
    .slice(0, 30);

  const ariaLabels = allOf('[aria-label]')
    .map((e) => (e.getAttribute('aria-label') ?? '').toLowerCase())
    .filter(Boolean);
  const chatVendorSignatures = [
    'intercom', 'crisp.chat', 'client.crisp', 'tawk.to', 'embed.tawk', 'tidio',
    'js.driftt.com', 'drift.com', 'hubspot-messages', 'js.hs-scripts', 'zdassets',
    'zendesk', 'livechatinc', 'cdn.livechat', 'freshchat', 'fbcustomerchat',
    'static.olark', 'smartsupp', 'gorgias-chat', 'chatlio', 'kustomerapp',
  ];
  const lowerHtml = html.toLowerCase();
  const hasChatWidget =
    ariaLabels.some((a) => a.includes('chat')) ||
    scriptSrcs.some((s) => chatVendorSignatures.some((h) => s.toLowerCase().includes(h))) ||
    chatVendorSignatures.some((h) => lowerHtml.includes(h));

  const analyticsHints = ['gtag', 'googletagmanager', 'analytics', 'segment', 'mixpanel', 'amplitude', 'plausible', 'fathom', 'umami', 'vercel'];

  return {
    url: url.toString(),
    status,
    title: headOf('title')?.text?.trim()?.slice(0, 300) ?? null,
    meta_description: headOf('meta[name="description"]')?.getAttribute('content')?.slice(0, 500) ?? null,
    meta_keywords: headOf('meta[name="keywords"]')?.getAttribute('content')?.slice(0, 300) ?? null,
    meta_robots: headOf('meta[name="robots"]')?.getAttribute('content') ?? null,
    viewport: headOf('meta[name="viewport"]')?.getAttribute('content') ?? null,
    canonical: headOf('link[rel="canonical"]')?.getAttribute('href') ?? null,
    h1_texts: allOf('h1').slice(0, 3).map((h) => h.text.trim().slice(0, 180)),
    h1_count: allOf('h1').length,
    h2_count: allOf('h2').length,
    h3_count: allOf('h3').length,
    og_tags: ogTags,
    twitter_tags: twTags,
    json_ld_count: allOf('script[type="application/ld+json"]').length,
    json_ld_types: Array.from(new Set(jsonLdTypes)).slice(0, 20),
    img_count: imgs.length,
    img_missing_alt: imgs.filter((i) => !i.getAttribute('alt')).length,
    form_count: allOf('form').length,
    iframe_count: allOf('iframe').length,
    link_count: links.length,
    external_link_count: externalLinks.length,
    body_text_snippet: root.querySelector('body')?.text?.trim()?.replace(/\s+/g, ' ')?.slice(0, 5000) ?? null,
    script_srcs: scriptSrcs,
    has_chat_widget_hint: hasChatWidget,
    has_analytics: scriptSrcs.some((s) => analyticsHints.some((h) => s.toLowerCase().includes(h))),
    aux: { llms_txt: false, ai_txt: false, robots_txt: false, sitemap_xml: false },
  };
}

/**
 * Run a full audit on one URL. Never throws: failures come back as
 * `{ ok: false, status, error }` so the caller can map them to HTTP codes.
 */
/**
 * THE MODEL LADDER IS GONE, AND SO IS THE ENGINE SWITCH.
 *
 * Both existed to survive the metered API: a ladder that walked opus-5 down to
 * sonnet-5 when Anthropic returned 529, and an AUDIT_ENGINE flag that could
 * point a local run at the free CLI. Neither has anything to do to now. There
 * is one engine, it is the subscription, and `lib/llm.ts` decides whether this
 * process runs it directly or hands it to a drainer. Retries, malformed-JSON
 * repair and backoff all live in `lib/claude-code-json.ts`, which is where the
 * spawned CLI's failures actually happen.
 */

export async function runWebsiteAudit(rawUrl: string, opts: { facts?: SiteFacts | null } = {}): Promise<AuditResult> {
  let raw = (rawUrl ?? '').trim();
  if (!raw) return { ok: false, status: 400, error: 'Drop your website URL.' };
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return { ok: false, status: 400, error: 'That URL is not valid.' };
  }

  // Everything up to the model call has to finish inside this window.
  const until = Date.now() + FETCH_BUDGET_MS;

  const fetchPage = (userAgent: string) =>
    fetch(target.toString(), {
      headers: { 'User-Agent': userAgent, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      // Half the budget per attempt, so the bot-block retry still fits.
      signal: AbortSignal.timeout(cap(until, FETCH_BUDGET_MS / 2)),
    });

  let pageResp: Response;
  try {
    // Identify honestly first; some firewalls (Cloudflare etc.) blanket-403 any
    // bot UA, so on a block retry once looking like a regular browser.
    pageResp = await fetchPage('Mozilla/5.0 (compatible; MMS-WebsiteAudit/1.0; +https://modernmustardseed.com/website-audit)');
    if (pageResp.status === 403 || pageResp.status === 406) {
      pageResp = await fetchPage('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    }
  } catch {
    return { ok: false, status: 400, error: 'Could not load that URL. Check it works in a browser and try again.' };
  }

  if (!pageResp.ok) {
    return { ok: false, status: 400, error: `That URL returned HTTP ${pageResp.status}. Check it and try again.` };
  }

  const html = (await pageResp.text()).slice(0, 250_000);

  // The aux files are a nice-to-have signal, never a reason to blow the budget:
  // if the page itself ate the window, score without them rather than time out.
  const [llmsTxt, aiTxt, robotsTxt, sitemapXml] =
    Date.now() < until - 1500
      ? await Promise.all([
          fetchAuxFile(target.origin, '/llms.txt', until),
          fetchAuxFile(target.origin, '/.well-known/ai.txt', until),
          fetchAuxFile(target.origin, '/robots.txt', until),
          fetchAuxFile(target.origin, '/sitemap.xml', until),
        ])
      : [false, false, false, false];

  const signals = extractSignals(target, html, pageResp.status);
  signals.aux = { llms_txt: llmsTxt, ai_txt: aiTxt, robots_txt: robotsTxt, sitemap_xml: sitemapXml };

  // Built once and handed to whichever engine grades this run, so the two paths
  // can never drift into scoring the same site off different prompts.
  // GROUND TRUTH FROM THE REST OF THE SITE. The signals above come from the
  // homepage markup alone, and a legacy site that injects its content by script
  // shows the grader an empty body. That is how a Tallahassee dentist with the
  // address, hours and email on their contact page was told they had "no
  // visible phone number". The grader is now handed what the other pages say
  // and told never to call any of it missing (2026-08-25).
  const facts = opts.facts !== undefined ? opts.facts : await fetchSiteFacts(target.toString(), { timeoutMs: 8000, maxPages: 3 }).catch(() => null);
  const verified = siteFactsSummary(facts);
  const truth = verified.length
    ? [
        '',
        `VERIFIED ON OTHER PAGES OF THIS SITE (read live, ${facts?.verified}). These exist. Never say the site lacks any of them. If the homepage markup does not carry one, say exactly that: "on the contact page but not in the homepage's crawlable HTML".`,
        ...verified.map((f) => `- ${f}`),
        '',
      ].join('\n')
    : '';

  const userMessage = `Audit this website. Use the extracted signals to inform every category score. Be specific. Reference what you actually see.

URL: ${target.toString()}

Extracted signals (truncated):
${JSON.stringify(signals, null, 2)}
${truth}
Return the JSON report.`;

  const signalsSummary: AuditSignalsSummary = {
    title: signals.title,
    h1: signals.h1_texts[0] ?? null,
    json_ld_count: signals.json_ld_count,
    llms_txt: signals.aux.llms_txt,
    ai_txt: signals.aux.ai_txt,
    has_chat_widget: signals.has_chat_widget_hint,
    img_missing_alt: signals.img_missing_alt,
  };

  /**
   * The schema can no longer enforce item counts (structured outputs rejects
   * minItems/maxItems), so trim to the promised shape here. Shared, because the
   * CLI engine has no schema enforcement at all and needs it more.
   */
  const trimToShape = (report: WebsiteAuditReport & { top_three_fixes?: unknown[]; full_todo?: unknown[] }) => {
    if (Array.isArray(report.top_three_fixes)) report.top_three_fixes = report.top_three_fixes.slice(0, 3);
    if (Array.isArray(report.full_todo)) report.full_todo = report.full_todo.slice(0, 15);
    return report;
  };

  // ONE PATH NOW. There used to be two: a free local CLI branch and a metered
  // API branch, chosen by an env var that production never set, so every real
  // audit ran on the wallet. `lib/llm.ts` makes the choice a deployment detail
  // instead of a policy decision: run it here if a CLI exists, hand it to a
  // drainer if not. Both ends are the subscription, so there is no branch left
  // that can cost money and no account state that can take the tool down.
  try {
    const report = await llmJson<WebsiteAuditReport & { top_three_fixes?: unknown[]; full_todo?: unknown[] }>({
      label: `audit ${target.hostname}`,
      model: process.env.AUDIT_CLI_MODEL || 'opus',
      system: SYSTEM_PROMPT,
      user: userMessage,
      schema: REPORT_SCHEMA,
      // The public route allows 120s. Leave a clear margin so a slow audit
      // returns "still working" rather than being killed with nothing to show.
      timeoutMs: 95_000,
    });

    return {
      ok: true,
      url: target.toString(),
      report: trimToShape(report),
      // Zero, and truthfully zero: this ran on the subscription. The batch
      // scripts multiply these numbers by a price table to report run cost, so
      // a free run must report as free rather than as unknown.
      usage: { model: 'claude-code (subscription)', input: 0, cache_read: 0, output: 0 },
      signals_summary: signalsSummary,
    };
  } catch (err) {
    // A queued job is not a failure and must not read like one. The work is
    // still in front of a drainer and will still be written; this request just
    // ended first, which on a busy queue is a normal Tuesday.
    if (err instanceof LlmUnavailable) {
      return {
        ok: false,
        status: 503,
        error: 'The audit is queued and will finish shortly. Try again in a minute.',
      };
    }
    console.error('website-audit: engine failed:', err instanceof Error ? err.message : err);
    return { ok: false, status: 503, error: 'Audit hit a snag. Try again or email sarah@modernmustardseed.com.' };
  }
}
