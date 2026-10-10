/**
 * NO PRICES ON THE SITE (Sarah, 2026-10-10): "i dont want any prices on my site at all."
 *
 * The price comes after the conversation, never before it. Prices live privately in
 * ops/pricing.json, the admin, proposals and pay links. This module is the one
 * definition of "a price showed up on a rendered page", shared by the build's output
 * check (scripts/check-no-prices.mjs reads the prerendered HTML) and the live crawl
 * (scripts/price-crawl.mjs reads production).
 *
 * pricesIn(html) returns every hit in the visible text plus every nonzero price field
 * in JSON-LD. A dollar figure that is not ours (a competitor's published plan, a
 * lost-revenue calculator, a demo business's menu) is allowed only by route in
 * ALLOWED_ROUTES, with the reason. The source check in scripts/check-no-prices.mjs is
 * what keeps an MMS price from slipping onto one of those routes.
 */

// Visible-text patterns: a dollar amount, or the phrasing that carries one.
const TEXT_PATTERNS = [
  { name: 'dollar amount', re: /\$\s?\d[\d,]*(?:\.\d+)?\s*(?:k|K|M)?/g },
  { name: 'starting at', re: /\bstarting\s+at\s+\$|\bfrom\s+\$\d/gi },
];

// Structured data that publishes a nonzero price to search engines and AI answers.
const JSONLD_PRICE = /"(?:price|lowPrice|highPrice)"\s*:\s*(?!"?0(?:\.0+)?"?\s*[,}])|"priceRange"\s*:/g;

/**
 * Routes whose figures are not MMS prices. A route lands here only after a person
 * read the page and confirmed every figure is someone else's number.
 */
export const ALLOWED_ROUTES = [
  { route: /^\/ai-receptionist-cost\/?$/, reason: 'competitor plans as published on their pricing pages, with source and date' },
  { route: /^\/(alternatives|compare|best)(\/|$)/, reason: 'competitor plans as published on their pricing pages, with source and date' },
  { route: /^\/blog\//, reason: 'market and third-party figures in articles' },
  { route: /^\/work(\/|$)/, reason: 'client results and legacy costs in case studies' },
  { route: /^\/(voice-agents|for)(\/|$)|^\/(talking-website|mustard|switchboard)\/?$/, reason: 'lost-revenue calculators and sample pipelines: the visitor’s own numbers' },
  { route: /^\/command-center\/?$/, reason: 'illustrative third-party tool costs and a client screenshot' },
  { route: /^\/chief\/?$/, reason: 'what a human assistant earns, for comparison' },
  { route: /^\/(scaling-roadmap|future-proof)\/?$/, reason: 'revenue stages, not a price' },
  { route: /^\/marketing\/?$/, reason: 'ad spend guidance: the client’s own budget' },
  { route: /^\/launch-checklist\/?$/, reason: 'state filing fees' },
  { route: /^\/(fieldguide|mustard-mode\/start-here)\/?$/, reason: 'Anthropic’s Claude plan, paid to Anthropic' },
  { route: /^\/celebrate\/?$/, reason: 'the gift budget a team sets per person' },
  { route: /^\/super-nomad\/?$/, reason: 'example travel budgets inside the product' },
  { route: /^\/sarah\/?$/, reason: 'an episode title' },
  { route: /^\/(playbooks|playbook)(\/|$)/, reason: 'teaching content: tool costs and example pricing for the reader’s own product' },
  { route: /^\/demo(s)?\//, reason: 'demo and prospect businesses: their prices, not ours' },
  { route: /^\/sites\//, reason: 'client and demo sites carry the business own prices' },
];

function stripToText(html) {
  return html
    .replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#36;|&dollar;/g, '$')
    .replace(/\s+/g, ' ');
}

function jsonLdBlocks(html) {
  return [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
}

/** Every price hit on a page: [{ kind, match, context }]. */
export function pricesIn(html) {
  const hits = [];
  const text = stripToText(html);
  for (const { name, re } of TEXT_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0;
      hits.push({ kind: name, match: m[0].trim(), context: text.slice(Math.max(0, at - 50), at + 60).trim() });
    }
  }
  for (const block of jsonLdBlocks(html)) {
    for (const m of block.matchAll(JSONLD_PRICE)) {
      const at = m.index ?? 0;
      hits.push({ kind: 'json-ld price', match: m[0], context: block.slice(Math.max(0, at - 40), at + 60) });
    }
  }
  return hits;
}

export function allowedReason(pathname) {
  return ALLOWED_ROUTES.find((a) => a.route.test(pathname))?.reason ?? null;
}
