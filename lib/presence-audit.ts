/**
 * THE PRESENCE AUDIT.
 *
 * "Your website is weak" is an opinion a stranger can wave away. "You have 312
 * reviews at 4.9, which is the best asset you own, and the website they land on
 * after reading them scores 41" is an argument, because every number in it can
 * be checked by the person reading it in about ninety seconds.
 *
 * So this grades three pillars, not one:
 *
 *   WEBSITE   the existing seven-category engine (lib/website-audit.ts), which
 *             is an LLM reading their actual HTML. Rolled up to one score.
 *   PROFILE   their Google Business Profile, scored on eight checks that are
 *             either true or false. No model, no opinion.
 *   REVIEWS   volume and rating against a trades benchmark.
 *
 * TWO OF THE THREE ARE DELIBERATELY NOT AI. A rubric that a contractor can run
 * himself is a rubric he believes. Every profile check prints as pass or fail
 * with the consequence of failing it, every review number prints the benchmark
 * it was measured against, and the pillar weights are printed on the page. An
 * audit nobody can check is a horoscope with a logo.
 *
 * WHERE THE FACTS COME FROM. Rating, review count, hours, address and the
 * website link are read off their own Google listing when we source the lead
 * (scripts/acq-maps.mts drives a real browser against the public Maps feed).
 * They are FACTS about the business, not guesses, and the report says so. What
 * we do not hold, we score as "could not see" rather than as zero.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebsiteAuditReport } from '@/lib/website-audit';
import { auditPreferringWorker } from '@/lib/audit-queue';
import { SITE } from '@/lib/seo';

/* ────────────────────────────── the shapes ──────────────────────────────── */

export type Letter = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export type PillarKey = 'website' | 'profile' | 'reviews';

/** One true-or-false check, with what failing it actually costs them. */
export type Check = {
  label: string;
  passed: boolean;
  /** The consequence, in their language. Printed under the check either way. */
  detail: string;
  points: number;
  earned: number;
};

export type Pillar = {
  key: PillarKey;
  label: string;
  score: number;
  letter: Letter;
  /** One honest sentence about this pillar. */
  verdict: string;
  /** Deterministic checks. Empty for the website pillar, which is model-graded. */
  checks: Check[];
  /** True when we could not see enough to grade it, so the score is withheld. */
  unknown: boolean;
  /** How much of the overall score this pillar carries, printed on the page. */
  weight: number;
};

export type PresenceFix = { title: string; why: string; how: string };

export type PresenceAuditReport = {
  business_name: string;
  website: string | null;
  generated_at: string;
  overall_score: number;
  letter_grade: Letter;
  headline: string;
  summary: string;
  pillars: Pillar[];
  top_fixes: PresenceFix[];
  /** The full website to-do, carried through when the site could be graded. */
  website_todo: { category: string; priority: string; task: string }[];
  /** The seven-category website breakdown, when we have it. */
  website_categories: Record<string, { score: number; letter: string; notes: string }> | null;
  /** Every fact we used, with where it came from. Printed at the foot. */
  provenance: { label: string; value: string; source: string }[];
};

/* ─────────────────────────────── the grades ─────────────────────────────── */

/** One place that turns a number into a letter, so no two pillars disagree. */
export function letterFor(score: number): Letter {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * What each pillar is worth.
 *
 * The website carries the most because it is the only one of the three we can
 * fix outright, and because it is the surface every other channel points at: a
 * five star profile sends people to a page that either closes them or does not.
 * These numbers are printed on the report; a weighting nobody can see is a
 * weighting nobody can argue with, which is the wrong kind of persuasive.
 */
export const PILLAR_WEIGHTS: Record<PillarKey, number> = { website: 0.45, reviews: 0.3, profile: 0.25 };

export const PILLAR_LABELS: Record<PillarKey, string> = {
  website: 'Website',
  profile: 'Google Business Profile',
  reviews: 'Reviews',
};

/* ───────────────────────────── what we grade ────────────────────────────── */

/** Everything the audit reads. A plain object so the scorer is pure and testable. */
export type PresenceInput = {
  business_name: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  rating: number | null;
  review_count: number | null;
  hours: Record<string, string> | null;
  open_24_7: boolean | null;
  emergency_service: boolean | null;
  trade: string | null;
  /** Where the listing facts came from, for the provenance footer. */
  source_urls: string[] | null;
};

/* ──────────────────────────── the reviews pillar ────────────────────────── */

/**
 * Reviews, out of 100. Volume is worth more than rating on purpose.
 *
 * A 5.0 from nine people is not evidence, and every owner knows it. A 4.6 from
 * four hundred is the most valuable marketing asset a local trades business
 * will ever own, and most of them have never been told that in a sentence.
 *
 * The volume curve is deliberately generous early (getting from 0 to 25 is the
 * hardest stretch there is) and flattens after 300, where more reviews stop
 * changing whether a stranger calls you.
 */
export function scoreReviews(input: PresenceInput): Pillar {
  const count = input.review_count ?? null;
  const rating = input.rating ?? null;
  const checks: Check[] = [];

  if (count === null && rating === null) {
    return {
      key: 'reviews',
      label: PILLAR_LABELS.reviews,
      score: 0,
      letter: 'F',
      verdict: 'We could not find any reviews for you. That is either a profile nobody has claimed or a profile nobody has been asked to review, and both are fixable in a week.',
      checks,
      unknown: true,
      weight: PILLAR_WEIGHTS.reviews,
    };
  }

  const n = count ?? 0;
  // 0 → 0, 25 → 28, 50 → 37, 100 → 46, 200 → 53, 300 → 55, flat after.
  const volume = n <= 0 ? 0 : Math.min(55, Math.round(18 * Math.log10(n + 1) * 1.35));
  const volumeNote =
    n === 0
      ? 'Nobody has reviewed you yet, so a stranger comparing three names has nothing of yours to read.'
      : n < 25
        ? `${n} reviews. Under about 25 most people read you as new, whatever the star rating says.`
        : n < 100
          ? `${n} reviews. Past 25 you are credible. Past 100 you are the obvious call.`
          : n < 300
            ? `${n} reviews. This is real proof, and it is worth more than any ad you could buy.`
            : `${n} reviews. This is the best asset you own, and it is doing more work than your website is.`;
  checks.push({ label: 'Review volume', passed: n >= 25, detail: volumeNote, points: 55, earned: volume });

  const stars =
    rating === null
      ? 0
      : rating >= 4.8
        ? 45
        : rating >= 4.5
          ? 38
          : rating >= 4.2
            ? 30
            : rating >= 4.0
              ? 22
              : rating >= 3.5
                ? 12
                : 4;
  const starNote =
    rating === null
      ? 'No star rating found on your listing.'
      : rating >= 4.8
        ? `${rating} stars. That is the top of the trade and it should be the first thing on your website. It almost certainly is not.`
        : rating >= 4.5
          ? `${rating} stars. Strong. People filter at 4.5, so you clear the filter.`
          : rating >= 4.0
            ? `${rating} stars. Solid, but a lot of people filter searches at 4.5 and never see you.`
            : `${rating} stars. This is costing you calls before the phone ever rings.`;
  checks.push({ label: 'Star rating', passed: rating !== null && rating >= 4.5, detail: starNote, points: 45, earned: stars });

  const score = Math.max(0, Math.min(100, volume + stars));
  return {
    key: 'reviews',
    label: PILLAR_LABELS.reviews,
    score,
    letter: letterFor(score),
    verdict:
      n >= 100 && (rating ?? 0) >= 4.5
        ? 'Your reviews are excellent, and they are the strongest thing you have. The question is whether anything you own is using them.'
        : n >= 25
          ? 'You have enough reviews to be believed. There is room to make them work harder than they currently do.'
          : 'Reviews are the cheapest trust you can buy and you are leaving them on the table.',
    checks,
    unknown: false,
    weight: PILLAR_WEIGHTS.reviews,
  };
}

/* ──────────────────────────── the profile pillar ────────────────────────── */

/**
 * The Google Business Profile, out of 100, on eight checks that are each either
 * true or false. No model runs here on purpose: this is the pillar an owner is
 * most likely to argue with, so it has to be the one he can verify fastest.
 *
 * "Hours published" is worth as much as "website linked" because a profile with
 * no hours is the single most common reason a business gets skipped at 6pm.
 */
export function scoreProfile(input: PresenceInput): Pillar {
  const hoursCount = input.hours ? Object.keys(input.hours).length : 0;
  const alwaysOpen = Boolean(input.open_24_7);
  const checks: Check[] = [
    {
      label: 'You have a listing we could find',
      passed: true,
      detail: 'We found you the same way a customer would, by searching your trade and your town.',
      points: 20,
      earned: 20,
    },
    {
      label: 'Phone number on the listing',
      passed: Boolean(input.phone),
      detail: input.phone
        ? 'A customer can tap and call you without visiting anything else.'
        : 'Without a number on the profile, the tap-to-call button does not exist and the call goes to whoever has one.',
      points: 10,
      earned: input.phone ? 10 : 0,
    },
    {
      label: 'Website linked from the listing',
      passed: Boolean(input.website),
      detail: input.website
        ? 'People who want to know more before calling have somewhere to go.'
        : 'There is no website on your profile, so everyone who wants to check you out first has nowhere to land, and the ones who want proof go find somebody who has it.',
      points: 15,
      earned: input.website ? 15 : 0,
    },
    {
      label: 'Street address published',
      passed: Boolean(input.address),
      detail: input.address
        ? 'A real address is a trust signal and it is what puts you in the local map pack.'
        : 'No address on the profile. Service-area businesses can hide the address on purpose, but it has to be set either way or the local map pack skips you.',
      points: 10,
      earned: input.address ? 10 : 0,
    },
    {
      label: 'Hours published',
      passed: alwaysOpen || hoursCount >= 5,
      detail:
        alwaysOpen
          ? 'Your profile says you are open around the clock, which is the strongest hours signal there is. It is also a promise somebody has to answer.'
          : hoursCount >= 5
            ? 'Your week is published, so nobody has to guess whether you are open right now.'
            : 'Your hours are missing or incomplete. "Hours not available" is the most common reason a business gets skipped at six in the evening.',
      points: 15,
      earned: alwaysOpen || hoursCount >= 5 ? 15 : 0,
    },
    {
      label: 'Profile is active enough to carry a rating',
      passed: input.rating !== null,
      detail:
        input.rating !== null
          ? 'Google is showing a star rating on you, which means the profile is live and being used.'
          : 'No rating is showing, which usually means the profile is unclaimed or brand new.',
      points: 10,
      earned: input.rating !== null ? 10 : 0,
    },
    {
      label: 'Enough reviews to rank locally',
      passed: (input.review_count ?? 0) >= 10,
      detail:
        (input.review_count ?? 0) >= 10
          ? 'You clear the rough floor where Google starts trusting a profile enough to rank it.'
          : 'Under about ten reviews, the local pack tends to rank you below businesses with fewer years and more feedback.',
      points: 10,
      earned: (input.review_count ?? 0) >= 10 ? 10 : 0,
    },
    {
      label: 'Emergency or after-hours service stated',
      passed: alwaysOpen || Boolean(input.emergency_service),
      detail:
        alwaysOpen || input.emergency_service
          ? 'You say you take urgent work, which is the highest-value search there is in the trades.'
          : 'Nothing on your profile says you take urgent or after-hours work. That is the search with the least price shopping in it.',
      points: 10,
      earned: alwaysOpen || input.emergency_service ? 10 : 0,
    },
  ];

  const score = checks.reduce((sum, c) => sum + c.earned, 0);
  const failed = checks.filter((c) => !c.passed).length;
  return {
    key: 'profile',
    label: PILLAR_LABELS.profile,
    score,
    letter: letterFor(score),
    verdict:
      failed === 0
        ? 'Your profile is complete. That is rarer than it sounds and it is worth protecting.'
        : failed === 1
          ? 'One thing is missing from your profile, and it is free to fix this afternoon.'
          : `${failed} things are missing from your profile. Every one of them is free to fix and none of them takes an hour.`,
    checks,
    unknown: false,
    weight: PILLAR_WEIGHTS.profile,
  };
}

/* ──────────────────────────── the website pillar ────────────────────────── */

/** Roll the seven-category website report into one pillar. */
export function scoreWebsite(input: PresenceInput, report: WebsiteAuditReport | null): Pillar {
  if (!input.website) {
    return {
      key: 'website',
      label: PILLAR_LABELS.website,
      score: 0,
      letter: 'F',
      verdict:
        'You do not have a website on your listing. Every person who looks you up lands on a page Google owns, next to three competitors who each have one.',
      checks: [],
      unknown: false,
      weight: PILLAR_WEIGHTS.website,
    };
  }
  if (!report) {
    return {
      key: 'website',
      label: PILLAR_LABELS.website,
      score: 0,
      letter: 'F',
      verdict: 'We could not load your website to grade it. A page our reader cannot open is a page some of your customers cannot open either.',
      checks: [],
      unknown: true,
      weight: PILLAR_WEIGHTS.website,
    };
  }
  const score = Math.max(0, Math.min(100, Math.round(report.overall_score)));
  return {
    key: 'website',
    label: PILLAR_LABELS.website,
    score,
    letter: letterFor(score),
    verdict: report.headline,
    checks: [],
    unknown: false,
    weight: PILLAR_WEIGHTS.website,
  };
}

/* ──────────────────────────────── the report ────────────────────────────── */

/**
 * Blend the three. A pillar we could not see is dropped and the remaining
 * weights are renormalized, because scoring an unknown as zero is how an audit
 * turns into an insult about something the owner did not do wrong.
 */
export function blend(pillars: Pillar[]): number {
  const known = pillars.filter((p) => !p.unknown);
  if (!known.length) return 0;
  const total = known.reduce((s, p) => s + p.weight, 0);
  return Math.round(known.reduce((s, p) => s + p.score * p.weight, 0) / total);
}

/**
 * The headline. Built from the SHAPE of the three scores rather than the
 * average, because the interesting thing about a local business is almost never
 * the average: it is the gap between the part they earned by doing good work
 * and the part nobody ever told them about.
 */
export function headlineFor(pillars: Pillar[], business: string): { headline: string; summary: string } {
  const by = Object.fromEntries(pillars.map((p) => [p.key, p])) as Record<PillarKey, Pillar>;
  const web = by.website;
  const rev = by.reviews;
  const gbp = by.profile;

  const gap = rev.score - web.score;

  if (!web.unknown && web.score === 0 && !rev.unknown && rev.score >= 55) {
    return {
      headline: 'Great reputation, nowhere to send it.',
      summary: `${business} has the hard part done. People trust you, and they say so in public. What is missing is the one thing that turns that trust into a booked job at ten at night, which is a page of your own that answers for you.`,
    };
  }
  if (gap >= 30 && !rev.unknown) {
    return {
      headline: 'Your reviews are outrunning your website.',
      summary: `Your reputation scores ${rev.score} and your website scores ${web.score}. That gap is the whole story. People read the reviews, click through, and land somewhere that does not sound like the business those reviews are describing. The fix is not more marketing, it is closing that gap.`,
    };
  }
  if (web.score >= 80 && rev.score >= 70 && gbp.score >= 80) {
    return {
      headline: 'Strong across all three. Now make it answer the phone.',
      summary: `${business} is in the top slice of what we audit. Website, profile and reviews all hold up. The only thing left is the part almost nobody has: something that picks up at eleven at night and turns those searches into booked work while you sleep.`,
    };
  }
  if (gbp.score < 60) {
    return {
      headline: 'The free stuff is the part that is broken.',
      summary: `Your Google profile scores ${gbp.score}, and everything missing from it costs nothing to fix. That is the good news and the annoying news at once: you are losing calls to a form you have not finished filling in.`,
    };
  }
  if (web.score < 60) {
    return {
      headline: 'You are being judged in eight seconds and losing.',
      summary: `Your website scores ${web.score}. People decide about a contractor before they ever speak to one, and right now that decision is being made on a page that is not making your case. Your reviews say you do good work. Your site does not say it back.`,
    };
  }
  return {
    headline: 'Solid foundation, three specific gaps.',
    summary: `${business} is not broken anywhere. It is average in places where average loses to whoever showed up more prepared, and every gap below is specific enough to hand to somebody on Monday.`,
  };
}

/**
 * The fixes, ranked. Profile failures come first when the profile is weak,
 * because they are free and same-day, and an audit that opens with "rebuild
 * your website" reads as a sales document no matter how true it is.
 */
export function fixesFor(pillars: Pillar[], report: WebsiteAuditReport | null): PresenceFix[] {
  const by = Object.fromEntries(pillars.map((p) => [p.key, p])) as Record<PillarKey, Pillar>;
  const out: PresenceFix[] = [];

  for (const c of by.profile.checks.filter((c) => !c.passed)) {
    out.push({
      title: c.label.replace(/^You have a/, 'Claim your'),
      why: c.detail,
      how: 'Google Business Profile, edit, then the matching field. It is free, it takes about five minutes, and it goes live the same day.',
    });
  }

  if (!by.reviews.unknown && by.reviews.score < 55) {
    out.push({
      title: 'Ask for reviews on the job, not by email',
      why: by.reviews.checks[0]?.detail ?? 'You do not have enough public proof yet.',
      how: 'Ask while you are still standing there and the problem is freshly fixed. A text with the direct link, sent from the driveway, converts many times better than anything sent the next week.',
    });
  }

  for (const f of report?.top_three_fixes ?? []) out.push(f);

  if (!by.website.unknown && by.website.score === 0 && !report) {
    out.push({
      title: 'Get a website you actually own',
      why: 'Right now every search for your name ends on a page Google controls, sitting next to your competitors.',
      how: 'It does not need to be big. It needs your name, your trade, your town, your reviews, your phone number, and one obvious way to book you.',
    });
  }

  return out.slice(0, 6);
}

/** The facts, and where each one came from. Printed at the foot of the report. */
export function provenanceFor(input: PresenceInput): { label: string; value: string; source: string }[] {
  const listing = (input.source_urls ?? []).find((u) => /google|maps/i.test(u)) ?? 'your public Google Business Profile';
  const rows: { label: string; value: string; source: string }[] = [];
  if (input.rating !== null) rows.push({ label: 'Star rating', value: `${input.rating}`, source: listing });
  if (input.review_count !== null) rows.push({ label: 'Review count', value: input.review_count.toLocaleString('en-US'), source: listing });
  if (input.website) rows.push({ label: 'Website', value: input.website, source: 'read live at the time of this audit' });
  if (input.phone) rows.push({ label: 'Phone', value: input.phone, source: listing });
  if (input.address) rows.push({ label: 'Address', value: input.address, source: listing });
  const hoursCount = input.hours ? Object.keys(input.hours).length : 0;
  if (hoursCount) rows.push({ label: 'Published hours', value: `${hoursCount} days listed`, source: listing });
  return rows;
}

/** Assemble the whole report from an input plus an optional website grade. */
export function buildPresenceReport(input: PresenceInput, report: WebsiteAuditReport | null): PresenceAuditReport {
  const pillars = [scoreWebsite(input, report), scoreReviews(input), scoreProfile(input)];
  const overall = blend(pillars);
  const { headline, summary } = headlineFor(pillars, input.business_name);

  return {
    business_name: input.business_name,
    website: input.website,
    generated_at: new Date().toISOString(),
    overall_score: overall,
    letter_grade: letterFor(overall),
    headline,
    summary,
    pillars,
    top_fixes: fixesFor(pillars, report),
    website_todo: report?.full_todo ?? [],
    website_categories: report?.categories ?? null,
    provenance: provenanceFor(input),
  };
}

/* ─────────────────────────── running and storing ────────────────────────── */

export type PresenceAuditResult =
  | { ok: true; auditId: string; auditUrl: string; score: number; existing: boolean }
  | { ok: false; status: number; error: string };

/** Read a lead row into the pure input shape. */
export function inputFromLead(lead: Record<string, unknown>): PresenceInput {
  return {
    business_name: String(lead.business_name ?? 'this business'),
    website: (lead.website as string | null) ?? null,
    phone: (lead.phone as string | null) ?? null,
    address: (lead.address as string | null) ?? null,
    city: (lead.city as string | null) ?? null,
    state: (lead.state as string | null) ?? null,
    rating: (lead.rating as number | null) ?? null,
    review_count: (lead.review_count as number | null) ?? null,
    hours: (lead.hours as Record<string, string> | null) ?? null,
    open_24_7: (lead.open_24_7 as boolean | null) ?? null,
    emergency_service: (lead.emergency_service as boolean | null) ?? null,
    trade: (lead.trade as string | null) ?? null,
    source_urls: (lead.source_urls as string[] | null) ?? null,
  };
}

/**
 * Run the audit for one lead and file it.
 *
 * The website pillar reuses the cached grade when the lead already carries a
 * recent one, because re-grading a site nobody has touched in a week burns a
 * model call to print the same number. `force` skips the cache.
 *
 * IT NEVER FAILS THE WHOLE AUDIT OVER THE WEBSITE. A dead domain is a finding,
 * not an error: the profile and reviews pillars still grade, and the website
 * pillar says plainly that the page could not be opened.
 */
export async function runPresenceAudit(
  sb: SupabaseClient,
  lead: Record<string, unknown>,
  opts: { force?: boolean; waitMs?: number } = {},
): Promise<PresenceAuditResult> {
  const leadId = String(lead.id ?? '');
  if (!leadId) return { ok: false, status: 400, error: 'No lead id.' };

  const input = inputFromLead(lead);

  const cachedAt = lead.audit_at ? new Date(String(lead.audit_at)).getTime() : 0;
  const cacheFresh = !opts.force && cachedAt > 0 && Date.now() - cachedAt < 14 * 24 * 60 * 60 * 1000;
  let report: WebsiteAuditReport | null = cacheFresh ? ((lead.audit_json as WebsiteAuditReport | null) ?? null) : null;

  if (!report && input.website) {
    const outcome = await auditPreferringWorker(sb, {
      url: input.website,
      sourceTable: 'outbound_leads',
      sourceId: leadId,
      waitMs: opts.waitMs ?? 85_000,
    });
    if (outcome.kind === 'report') {
      report = outcome.report;
      await sb
        .from('outbound_leads')
        .update({ audit_score: outcome.report.overall_score, audit_url: outcome.url, audit_json: outcome.report, audit_at: new Date().toISOString() })
        .eq('id', leadId);
    }
    // 'queued' and 'error' both fall through with report null, and the website
    // pillar reports honestly instead of the whole audit dying.
  }

  const built = buildPresenceReport(input, report);

  const { data: row, error } = await sb
    .from('presence_audits')
    .insert({
      lead_id: leadId,
      business_name: input.business_name,
      website: input.website,
      score: built.overall_score,
      letter: built.letter_grade,
      report: built,
      status: 'ready',
    })
    .select('id')
    .single();
  if (error || !row) return { ok: false, status: 500, error: error?.message ?? 'Could not save the audit.' };

  const auditUrl = `${SITE.url}/demo/audit/${row.id}`;
  await sb
    .from('outbound_leads')
    .update({ presence_audit_id: row.id, presence_audit_url: auditUrl, presence_audit_score: built.overall_score, presence_audit_at: new Date().toISOString() })
    .eq('id', leadId);

  return { ok: true, auditId: row.id as string, auditUrl, score: built.overall_score, existing: false };
}

/**
 * Make sure this lead has an audit, and never let that get in the way.
 *
 * Called from every path that mints a demo suite, so the audit is simply part
 * of what a suite IS rather than something a rep remembers to click. Three
 * rules, all of them about not being annoying:
 *
 *   IDEMPOTENT   an audit under thirty days old is left alone. The website
 *                does not change weekly and the review count barely moves.
 *   FAIL SOFT    it returns false instead of throwing, always. A suite with
 *                four doors is a good day; a forge that died grading a
 *                website is a lost customer.
 *   NEVER INLINE ON A HUMAN  callers that have somebody waiting (a phone call,
 *                a form submit) must run this inside `after()`. It can spend a
 *                minute and a half waiting on the website grader.
 */
export async function ensurePresenceAudit(
  sb: SupabaseClient,
  lead: Record<string, unknown>,
  opts: { waitMs?: number } = {},
): Promise<boolean> {
  try {
    const existingAt = lead.presence_audit_at ? new Date(String(lead.presence_audit_at)).getTime() : 0;
    if (lead.presence_audit_url && existingAt > 0 && Date.now() - existingAt < 30 * 24 * 60 * 60 * 1000) return true;
    const res = await runPresenceAudit(sb, lead, { waitMs: opts.waitMs ?? 85_000 });
    return res.ok;
  } catch (err) {
    console.error('presence audit failed, suite ships without it:', err instanceof Error ? err.message : String(err));
    return false;
  }
}
