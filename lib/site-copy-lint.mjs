/**
 * DOES THIS PAGE TALK ABOUT THE BUSINESS THE WAY A HUMAN WOULD?
 *
 * The sibling of site-asset-refs.mjs. That one asks whether a document points at
 * anything we will not send; this one asks whether the WORDS are wrong.
 *
 * Every one of these rules exists because a real defect shipped:
 *   - "Olivia's Chocolates's command center"  (2026-08-03, 25 surfaces, incl. the
 *     call pill on every demo site and the walkthrough film)
 *   - "wants a quote on a order"              (2026-08-03, every cafe_bakery /
 *     dental / medspa / salon demo we have ever built)
 *   - "I answer my own phone"                 (2026-08-03, 3 of 78 demos argued
 *     against the voice agent we were selling)
 *   - an unfilled {job} / {biz} token, which is the template showing through
 *
 * The point of this file is that none of those were visible to us. Images 404
 * loudly. Bad grammar just sits there being read by the customer, so it needs a
 * machine watching it. Dependency-free on purpose so every path can import it:
 *   - scripts/audit-demo-copy.mjs        sweeps the fleet
 *   - app/api/cron/demo-copy-health      hourly watchdog, emails on a finding
 *
 * DELIBERATELY NOT A BUILD GATE. Language is judgment, and a false positive that
 * fails a build costs more than a stray apostrophe. It reports; humans decide.
 */

/** Strip what is not prose, so we never lint base64, script bodies, or markup. */
export function visibleText(html) {
  return String(html || '')
    // Anything that is not read by a person. data: URIs live inside these.
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Attributes carry real customer-facing copy (alt, title, aria-label,
    // placeholder, meta description), so keep those and drop the rest.
    // Two passes, one per quote style. A single combined pattern with a
    // backreference cannot express this: alt="Palmers's truck" is a DOUBLE
    // quoted value that legitimately contains a single quote, and the exact
    // apostrophes we are hunting live inside those values.
    .replace(/<[a-z][^>]*?\b(?:alt|title|aria-label|placeholder|content)\s*=\s*"([^"]*)"[^>]*>/gi, ' $1 ')
    .replace(/<[a-z][^>]*?\b(?:alt|title|aria-label|placeholder|content)\s*=\s*'([^']*)'[^>]*>/gi, ' $1 ')
    // ELEMENT BOUNDARIES BECOME NEWLINES, not spaces. This is the difference
    // between a linter people use and one they mute. Flattening tags to spaces
    // welds a nav link onto the heading below it, so "Menu" + "Menu" reads as the
    // doubled word "Menu Menu" and a first run flagged 30-odd healthy sites for
    // "01 01", "Spring Spring" and "cases Cases". Sentence-level rules below match
    // horizontal whitespace only, so they can never span two elements either.
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n[ \t]*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/**
 * The rules. Each returns the matched strings so a report can quote the page
 * back rather than just naming a rule, which is the difference between a finding
 * someone fixes and a finding someone ignores.
 */
const RULES = [
  {
    id: 'double-possessive',
    severity: 'low',
    what: "a word ending in s given another 's",
    // LOW, and heavily stop-listed, because English genuinely disagrees here.
    // "the business's phone" and "Valley Glass's project" are both correct: those
    // are SINGULAR nouns that happen to end in s. Only a plural takes the bare
    // apostrophe. We cannot tell singular from plural, so this rule reports and
    // never pages. The one that pages is business-name-possessive below, which
    // checks the ONE string we actually know the shape of.
    re: /\b(?!it|that|what|there|here|let|he|she|who|where|how|this|business|glass|class|boss|address|process|witness|bus|gas|lens|press|success|access|campus|focus|status|series|species|news|mass|pass|cross|dress|guess|loss|miss|plus|grass|brass|stress|canvas|bonus|virus|census|circus|surplus|hers|its)([A-Za-z][A-Za-z.&-]{2,})s['’]s\b/gi,
  },
  {
    id: 'article-agreement',
    severity: 'high',
    what: 'a/an disagreement (a order, a appointment)',
    // Horizontal whitespace only. "\s" would span the newline we put at every
    // element boundary, so <p>a</p><h2>order</h2> would read as "a order".
    re: /\b[Aa][^\S\n]+(?:order|appointment|estimate|inspection|install|upgrade|opening|hour|email|invoice|item|oil|urgent|emergency|appraisal|application|evaluation|assessment|inquiry|event|entry|exam)\b/g,
  },
  {
    id: 'an-before-consonant',
    severity: 'low',
    what: 'an before a consonant sound (an job)',
    re: /\b[Aa]n[^\S\n]+(?![aeiouAEIOU]|hour|honest|honor|heir)[b-df-hj-np-tv-z]\w+/g,
  },
  {
    id: 'unfilled-token',
    severity: 'high',
    what: 'a template token that never got filled ({job}, {biz}, {city})',
    re: /\{(?:job|biz|city|firstName|street|business|owner|phone|trade)\}/g,
  },
  {
    id: 'anti-voice-agent',
    severity: 'high',
    what: 'copy that argues against the voice agent we are selling',
    re: /\b(?:I answer my own phone|not a call cent(?:er|re)|not an answering service|a real person,? not a machine|no robots|never a machine)\b/gi,
  },
  {
    id: 'placeholder-prose',
    severity: 'high',
    what: 'lorem ipsum or a leftover placeholder',
    re: /\b(?:lorem ipsum|dolor sit amet|your business name here|insert (?:text|name|photo)|TODO|FIXME|XXX-PLACEHOLDER)\b/gi,
  },
  {
    id: 'em-dash',
    severity: 'low',
    what: "an em dash (Sarah's standing rule: never in prose)",
    re: /—/g,
  },
  {
    id: 'double-space-sentence',
    severity: 'low',
    what: 'a doubled word (the the, and and)',
    re: /\b(\w{2,})[^\S\n]+\1\b(?![-\w])/gi,
  },
];

/**
 * Lint one document. Returns [] when it is clean.
 *
 * `businessName` is optional but makes the possessive rule far stronger: we can
 * check the ONE name that matters instead of trusting a general pattern.
 */
export function copyFindings(html, businessName) {
  const text = visibleText(html);
  if (!text) return [];
  const findings = [];

  for (const rule of RULES) {
    const hits = [...text.matchAll(rule.re)].map((m) => m[0].trim());
    if (!hits.length) continue;
    const unique = [...new Set(hits)].slice(0, 6);
    findings.push({ id: rule.id, severity: rule.severity, what: rule.what, count: hits.length, samples: unique });
  }

  // The specific business, checked by name. A name we get wrong is worse than
  // any generic grammar slip, and this catches forms the pattern above cannot
  // (a name ending in x or z, a name that is already possessive).
  const name = String(businessName || '').trim();
  if (name && /s$/i.test(name)) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const wrong = [...text.matchAll(new RegExp(`${esc}['’]s\\b`, 'gi'))].map((m) => m[0]);
    if (wrong.length) {
      // SEVERITY TURNS ON WHETHER THE NAME IS ALREADY POSSESSIVE.
      //
      // "Olivia's Chocolates's" stutters. There is no style guide anywhere that
      // defends it, a customer reads it as a machine talking, and it is exactly
      // the defect that shipped to 25 surfaces on 2026-08-03. That pages.
      //
      // "Valley Glass's" is a singular proper noun taking 's, which Chicago
      // endorses outright. It only disagrees with OUR house rule (bare
      // apostrophe, what lib/business-name.ts emits), so it is worth reporting
      // and not worth waking anyone for.
      const stutters = /['’]s\b/i.test(name);
      findings.push({
        id: 'business-name-possessive',
        severity: stutters ? 'high' : 'low',
        what: stutters
          ? "the business's own name given a stuttering possessive"
          : "the business's name uses 's where our house rule is a bare apostrophe",
        count: wrong.length,
        samples: [...new Set(wrong)].slice(0, 4),
      });
    }
  }

  return findings;
}

/** One line per finding, for a log or an email. */
export function formatFindings(findings) {
  return findings
    .map((f) => `  [${f.severity}] ${f.id} x${f.count}: ${f.what}\n      e.g. ${f.samples.map((s) => JSON.stringify(s)).join(', ')}`)
    .join('\n');
}

/** True when anything worth waking a human for is present. */
export function hasHighSeverity(findings) {
  return findings.some((f) => f.severity === 'high');
}
