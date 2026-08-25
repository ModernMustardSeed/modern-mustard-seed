import { parse } from 'node-html-parser';
import { llmJson, LlmUnavailable } from '@/lib/llm';
import type { BlueprintInput } from './types';
import { blueprintFromTemplate, type ValidateResult } from './blueprint';
import { offerableTemplates } from './templates';
import type { DeepPartial } from './templates';

/**
 * CLIENT FACTORY BUILD. The primary delivery system.
 *
 * A business URL goes in. A structured, validated, editable blueprint comes
 * out. This is the difference between MMS engineering an acquisition system per
 * customer and MMS deploying one, and it is the single lever that decides
 * whether the company can carry a thousand Factories.
 *
 * ASK THE HUMAN ONLY WHAT ONLY THE HUMAN KNOWS. Services, positioning, market
 * and pain are readable off a public website. Average customer value, close
 * rate, lifetime value and what they can afford to spend to acquire a customer
 * are not, and no amount of confident prose makes a guessed number true. So the
 * Build researches everything it can, then CONFIRMS what it found and ASKS for
 * the handful of facts only the owner has.
 *
 * NOTHING HERE INVENTS. The model is given the fetched page text and the
 * operator's answers and nothing else, and is told, in the strongest terms the
 * prompt can carry, to leave a field empty rather than fill it plausibly. An
 * invented claim in a blueprint becomes an invented claim in a cold email
 * signed by a real business.
 */

/* ────────────────────────────── research ───────────────────────────── */

export type BusinessResearch = {
  url: string;
  ok: boolean;
  title: string | null;
  description: string | null;
  headings: string[];
  /** Trimmed visible copy. Enough to characterize the business, capped so a prompt stays sane. */
  text: string;
  emails: string[];
  phones: string[];
  navLabels: string[];
  error?: string;
};

const FETCH_TIMEOUT_MS = 12_000;
const MAX_TEXT = 14_000;

export async function researchBusiness(rawUrl: string): Promise<BusinessResearch> {
  let url = (rawUrl || '').trim();
  if (!url) return empty(rawUrl, 'No URL supplied.');
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return empty(rawUrl, 'That URL is not valid.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(target.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'ModernMustardSeed-Build/1.0 (+https://modernmustardseed.com)' },
    });
    if (!res.ok) return empty(target.toString(), `The site returned ${res.status}.`);

    const html = (await res.text()).slice(0, 500_000);
    const root = parse(html);
    root.querySelectorAll('script, style, noscript, svg').forEach((n) => n.remove());

    const text = root.structuredText.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim().slice(0, MAX_TEXT);
    const body = root.text;

    return {
      url: target.toString(),
      ok: true,
      title: root.querySelector('title')?.text?.trim() || null,
      description: root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || null,
      headings: root.querySelectorAll('h1, h2').slice(0, 25).map((h) => h.text.trim()).filter(Boolean),
      navLabels: root.querySelectorAll('nav a').slice(0, 30).map((a) => a.text.trim()).filter(Boolean),
      emails: [...new Set(body.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g) ?? [])].slice(0, 5),
      phones: [...new Set(body.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) ?? [])].slice(0, 5),
      text,
    };
  } catch (err) {
    return empty(target.toString(), err instanceof Error && err.name === 'AbortError' ? 'The site took too long to answer.' : 'Could not reach the site.');
  } finally {
    clearTimeout(timer);
  }
}

function empty(url: string, error: string): BusinessResearch {
  return { url, ok: false, title: null, description: null, headings: [], navLabels: [], emails: [], phones: [], text: '', error };
}

/* ────────────────────── template recommendation ────────────────────── */

const VERTICAL_HINTS: [string, RegExp][] = [
  ['roofing', /\broof(ing|er)?\b|shingle|storm damage/i],
  ['hvac', /\bhvac\b|heating and (air|cooling)|air condition|furnace/i],
  ['home-services', /\bplumb|electric(ian|al contractor)|garage door|restoration|landscap|pest control|remodel|contractor\b/i],
  ['agency-audit', /\b(marketing|digital|web|seo|advertising|creative) agency\b|we build websites|brand studio/i],
  ['saas-demo', /\bsaas\b|software platform|our app\b|api\b|free trial|per (seat|user)\/mo/i],
  ['commercial-services', /\binsurance\b|commercial finance|lending|underwrit|brokerage|wealth manage/i],
];

export type TemplateRecommendation = { key: string; name: string; confidence: 'high' | 'medium' | 'low'; why: string };

/**
 * Pick a starting template from what the site actually says. A low-confidence
 * match returns b2b-service, which is the honest default: a generic template an
 * operator adjusts beats a specific one that is wrong.
 */
export function recommendTemplate(research: BusinessResearch, industryHint?: string | null): TemplateRecommendation {
  const haystack = [industryHint ?? '', research.title ?? '', research.description ?? '', research.headings.join(' '), research.text.slice(0, 4000)].join(' ');
  for (const [key, re] of VERTICAL_HINTS) {
    const m = haystack.match(re);
    if (m) {
      const t = offerableTemplates(true).find((x) => x.key === key);
      if (t) return { key, name: t.name, confidence: industryHint ? 'high' : 'medium', why: `Matched "${m[0]}" on their own site.` };
    }
  }
  const fallback = offerableTemplates(true).find((t) => t.key === 'b2b-service');
  return {
    key: 'b2b-service',
    name: fallback?.name ?? 'B2B Service Factory',
    confidence: 'low',
    why: 'Nothing on the site matched a vertical template, so this starts from the general B2B structure.',
  };
}

/* ─────────────────────────── generation ────────────────────────────── */

/**
 * What the operator or customer supplies. Every field is optional, and
 * economics are ONLY ever taken from here: the model is never asked for them
 * and never given a way to supply them.
 */
export type BuildAnswers = {
  businessName?: string;
  website?: string;
  industry?: string;
  serviceArea?: string;
  targetCustomer?: string;
  offerHeadline?: string;
  pricing?: { name: string; priceCents: number | null; cadence: 'one_time' | 'monthly' | 'annual' | 'quote' }[];
  economics?: {
    avgFirstSaleCents?: number | null;
    avgRecurringCents?: number | null;
    lifetimeValueCents?: number | null;
    closeRatePct?: number | null;
    salesCycleDays?: number | null;
    qualifiedLeadValueCents?: number | null;
    targetCacCents?: number | null;
  };
  senderFrom?: string;
  postalAddress?: string;
  ownerEmail?: string;
  approvedClaims?: string[];
  prohibitedClaims?: string[];
  notes?: string;
};

/** The shape the model must return. Notice what is absent: every number. */
const BUILD_SCHEMA = {
  type: 'object',
  required: ['business', 'offer', 'icp', 'pain', 'agent', 'campaign'],
  properties: {
    business: {
      type: 'object',
      required: ['description', 'services'],
      properties: {
        description: { type: 'string', description: 'One paragraph, drawn only from their own site.' },
        services: { type: 'array', items: { type: 'string' }, maxItems: 15 },
        service_area: { type: ['string', 'null'] },
        competitors: { type: 'array', items: { type: 'string' }, maxItems: 5, description: 'Only if the site names them. Otherwise empty.' },
        approved_claims: {
          type: 'array', items: { type: 'string' }, maxItems: 12,
          description: 'Claims the site itself already makes. Quote or closely paraphrase. Never add one.',
        },
      },
    },
    offer: {
      type: 'object',
      required: ['headline'],
      properties: {
        headline: { type: 'string' },
        detail: { type: ['string', 'null'] },
      },
    },
    icp: {
      type: 'array', maxItems: 3,
      items: {
        type: 'object',
        required: ['label'],
        properties: {
          label: { type: 'string' },
          industries: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          job_titles: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          geographies: { type: 'array', items: { type: 'string' }, maxItems: 8 },
          business_signals: { type: 'array', items: { type: 'string' }, maxItems: 8, description: 'Public, observable traits only. Never demographic or protected attributes.' },
          audience: { type: 'string', enum: ['b2b', 'b2c', 'both'] },
        },
      },
    },
    pain: {
      type: 'object',
      required: ['primary'],
      properties: {
        primary: { type: 'string' },
        secondary: { type: ['string', 'null'] },
        trigger_events: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        fears: { type: 'array', items: { type: 'string' }, maxItems: 6 },
        objections: {
          type: 'array', maxItems: 6,
          items: {
            type: 'object',
            required: ['objection', 'response'],
            properties: { objection: { type: 'string' }, response: { type: 'string' } },
          },
        },
        urgency: { type: ['string', 'null'] },
      },
    },
    agent: {
      type: 'object',
      required: ['name', 'role'],
      properties: {
        name: { type: 'string', description: 'A plain professional first name, or a role name. Not a pun.' },
        role: { type: 'string' },
        may_discuss: { type: 'array', items: { type: 'string' }, maxItems: 8 },
        qualification_questions: { type: 'array', items: { type: 'string' }, maxItems: 6 },
      },
    },
    campaign: {
      type: 'object',
      required: ['name', 'hook', 'cta', 'sequence'],
      properties: {
        name: { type: 'string' },
        hook: { type: 'string', description: 'Why this specific prospect should care. Never "we help companies grow".' },
        secondary_hook: { type: ['string', 'null'] },
        cta: { type: 'string' },
        sequence: {
          type: 'array', minItems: 2, maxItems: 4,
          items: {
            type: 'object',
            required: ['step', 'day_offset', 'subject', 'body'],
            properties: {
              step: { type: 'integer' },
              day_offset: { type: 'integer' },
              subject: { type: 'string' },
              body: { type: 'string', description: 'Plain text. Variables only from the allowed list.' },
            },
          },
        },
      },
    },
    fit_notes: { type: ['string', 'null'], description: 'Anything that makes this business a poor fit for outbound acquisition. Say it plainly.' },
    missing: { type: 'array', items: { type: 'string' }, description: 'Facts you could not determine and a human must supply.' },
  },
};

type BuildDraft = {
  business: { description: string; services: string[]; service_area?: string | null; competitors?: string[]; approved_claims?: string[] };
  offer: { headline: string; detail?: string | null };
  icp: { label: string; industries?: string[]; job_titles?: string[]; geographies?: string[]; business_signals?: string[]; audience?: 'b2b' | 'b2c' | 'both' }[];
  pain: { primary: string; secondary?: string | null; trigger_events?: string[]; fears?: string[]; objections?: { objection: string; response: string }[]; urgency?: string | null };
  agent: { name: string; role: string; may_discuss?: string[]; qualification_questions?: string[] };
  campaign: { name: string; hook: string; secondary_hook?: string | null; cta: string; sequence: { step: number; day_offset: number; subject: string; body: string }[] };
  fit_notes?: string | null;
  missing?: string[];
};

export type BuildOutcome =
  | { ok: true; result: ValidateResult; draft: BuildDraft; templateKey: string; missing: string[]; fitNotes: string | null }
  | { ok: false; error: string; queuedJobId?: string | null };

/**
 * Generate a blueprint.
 *
 * The template supplies structure and defaults. The model supplies only what it
 * could read off the site. The operator's answers overwrite both, because a
 * human who typed a number outranks a model that inferred one.
 */
export async function buildBlueprint(input: {
  research: BusinessResearch;
  answers: BuildAnswers;
  templateKey?: string;
}): Promise<BuildOutcome> {
  const { research, answers } = input;
  const businessName = answers.businessName || research.title?.split(/[|\-–]/)[0]?.trim() || 'This business';
  const templateKey = input.templateKey || recommendTemplate(research, answers.industry).key;

  if (!research.ok && !answers.offerHeadline) {
    return { ok: false, error: `${research.error ?? 'Could not read the site.'} Supply the offer and services by hand, or fix the URL.` };
  }

  let draft: BuildDraft;
  try {
    draft = await llmJson<BuildDraft>({
      label: 'factory.forge.blueprint',
      model: 'sonnet',
      schema: BUILD_SCHEMA,
      timeoutMs: 55_000,
      system: [
        'You are configuring a customer acquisition system for a real business. Everything you write will be sent to strangers over that business\'s name.',
        '',
        'GROUNDING RULES, in order of importance:',
        '1. Use ONLY the website text and the operator answers given below. If something is not there, put it in "missing" and leave the field out.',
        '2. Never state a number: no prices, no percentages, no customer counts, no years in business, no results. Those come from a human.',
        '3. "approved_claims" must be claims the site ALREADY makes. Quote or closely paraphrase. Do not add one, do not strengthen one.',
        '4. ICP criteria must be public, observable business characteristics. Never infer or target demographic or protected attributes.',
        '5. If the business looks like a poor fit for cold outbound acquisition, say so plainly in fit_notes. Do not talk yourself into it.',
        '',
        'THE CAMPAIGN:',
        `- The hook must be specific to the prospect. "We help ${'{{industry}}'} companies grow" is a failure.`,
        '- The first email leads with something useful or something observed, not with who we are.',
        '- Short. Plain. No hype, no fake urgency, no flattery.',
        '- No em dashes anywhere.',
        '- The ONLY variables you may use are: {{company}}, {{first_name}}, {{contact_name}}, {{industry}}, {{website}}, {{city}}, {{state}}, {{sender_name}}, {{value_action_url}}, {{research_note}}, {{offer_headline}}. Any other variable will not render and the blueprint will be rejected.',
      ].join('\n'),
      user: [
        `BUSINESS NAME: ${businessName}`,
        answers.industry ? `INDUSTRY (from the operator): ${answers.industry}` : '',
        answers.targetCustomer ? `WHO THEY WANT (from the operator): ${answers.targetCustomer}` : '',
        answers.offerHeadline ? `OFFER (from the operator): ${answers.offerHeadline}` : '',
        answers.serviceArea ? `SERVICE AREA (from the operator): ${answers.serviceArea}` : '',
        answers.notes ? `OPERATOR NOTES: ${answers.notes}` : '',
        '',
        `THEIR WEBSITE (${research.url}):`,
        research.title ? `Title: ${research.title}` : '',
        research.description ? `Description: ${research.description}` : '',
        research.headings.length ? `Headings: ${research.headings.join(' | ')}` : '',
        research.navLabels.length ? `Navigation: ${research.navLabels.join(', ')}` : '',
        '',
        research.text || '(no readable page text)',
      ].filter(Boolean).join('\n'),
    });
  } catch (err) {
    if (err instanceof LlmUnavailable) {
      return { ok: false, error: 'The blueprint is queued and will finish shortly. It did not land inside this request.', queuedJobId: err.jobId };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'The Build could not generate a blueprint.' };
  }

  const overlay = toOverlay(draft, answers, businessName, research);
  const result = blueprintFromTemplate(templateKey, overlay, businessName);

  return {
    ok: true,
    result,
    draft,
    templateKey,
    missing: draft.missing ?? [],
    fitNotes: draft.fit_notes ?? null,
  };
}

/** Fold the model's draft and the operator's answers into one overlay. Answers win. */
function toOverlay(
  draft: BuildDraft,
  answers: BuildAnswers,
  businessName: string,
  research: BusinessResearch,
): DeepPartial<BlueprintInput> {
  const econ = answers.economics ?? {};
  return {
    business: {
      name: businessName,
      website: answers.website ?? research.url,
      industry: answers.industry ?? null,
      description: draft.business.description,
      services: draft.business.services,
      service_area: answers.serviceArea ?? draft.business.service_area ?? null,
      competitors: draft.business.competitors ?? [],
      approved_claims: answers.approvedClaims?.length ? answers.approvedClaims : (draft.business.approved_claims ?? []),
      prohibited_claims: answers.prohibitedClaims ?? [],
    },
    offer: {
      headline: answers.offerHeadline || draft.offer.headline,
      detail: draft.offer.detail ?? null,
      packages: (answers.pricing ?? []).map((p) => ({ name: p.name, price_cents: p.priceCents, cadence: p.cadence, includes: [] })),
      // Quoting stays OFF until a human has both entered prices and turned it on.
      ai_may_quote_price: false,
      ai_may_discount: false,
    },
    icp: draft.icp.map((i) => ({
      label: i.label,
      industries: i.industries ?? [],
      job_titles: i.job_titles ?? [],
      geographies: i.geographies ?? [],
      business_signals: i.business_signals ?? [],
      technology_signals: [],
      exclusions: [],
      audience: i.audience ?? 'b2b',
    })),
    economics: {
      avg_first_sale_cents: econ.avgFirstSaleCents ?? null,
      avg_recurring_cents: econ.avgRecurringCents ?? null,
      lifetime_value_cents: econ.lifetimeValueCents ?? null,
      close_rate_pct: econ.closeRatePct ?? null,
      sales_cycle_days: econ.salesCycleDays ?? null,
      qualified_lead_value_cents: econ.qualifiedLeadValueCents ?? null,
      target_cac_cents: econ.targetCacCents ?? null,
      value_drivers: [],
    },
    pain: {
      primary: draft.pain.primary,
      secondary: draft.pain.secondary ?? null,
      trigger_events: draft.pain.trigger_events ?? [],
      fears: draft.pain.fears ?? [],
      objections: draft.pain.objections ?? [],
      alternatives: [],
      urgency: draft.pain.urgency ?? null,
    },
    agent: {
      name: draft.agent.name,
      role: draft.agent.role,
      may_discuss: draft.agent.may_discuss ?? [],
      qualification_questions: draft.agent.qualification_questions ?? [],
      escalation_to: answers.ownerEmail ? [{ label: 'The owner', email: answers.ownerEmail, when: 'Anything outside the approved scope' }] : [],
    },
    campaigns: [
      {
        name: draft.campaign.name,
        channel: 'email',
        hook: draft.campaign.hook,
        secondary_hook: draft.campaign.secondary_hook ?? null,
        cta: draft.campaign.cta,
        sequence: draft.campaign.sequence.map((s) => ({ ...s, variant: 'A' })),
      },
    ],
    crm: { owner_email: answers.ownerEmail ?? null },
    compliance: {
      sender_from: answers.senderFrom ?? null,
      postal_address: answers.postalAddress ?? null,
      sender_domain: answers.senderFrom?.split('@')[1]?.replace(/>$/, '') ?? null,
    },
  };
}

/**
 * What the Build still needs from a human, phrased as questions rather than
 * field names. Shown at the end of the wizard so the gap is obvious and small.
 */
export function outstandingQuestions(answers: BuildAnswers, missing: string[]): string[] {
  const q: string[] = [];
  const e = answers.economics ?? {};
  if (e.avgFirstSaleCents === undefined || e.avgFirstSaleCents === null) q.push('What is one new customer worth on the first sale?');
  if (e.closeRatePct === undefined || e.closeRatePct === null) q.push('Of the qualified leads you talk to, what share become customers?');
  if (e.lifetimeValueCents === undefined || e.lifetimeValueCents === null) q.push('What is a customer worth over the whole relationship, if you know it?');
  if (!answers.senderFrom) q.push('Which address should this send from?');
  if (!answers.postalAddress) q.push('What postal address goes in the email footer? Commercial email needs one and it cannot be invented.');
  if (!answers.ownerEmail) q.push('Who does the AI hand a live conversation to?');
  if (!answers.pricing?.length) q.push('What are the packages and prices, exactly as you would quote them?');
  return [...q, ...missing.map((m) => `The Build could not determine: ${m}`)];
}
