/**
 * THE HUNDREDFOLD DRIP: follow-up for the two audiences that were leaking.
 *
 * WHY THIS EXISTS (2026-08-07). Two funnels were landing warm hands and then
 * dropping them on the floor:
 *
 *   A. ROADMAP TAKERS. /scaling-roadmap now gates on name + email BEFORE it
 *      generates, so every run produces a real contact with a real diagnosis
 *      attached. They got exactly one email (their roadmap) and then silence.
 *   B. INTERVIEWEES. Someone who sat through Mr. Mustard's thirty one questions
 *      and did not join got nothing at all. That is the hottest hand this
 *      business produces and it was going cold in a database row.
 *
 * ⚠️ THE RULE THAT SHAPES EVERY LINE HERE: the mail is written FROM THEIR OWN
 * DOCUMENT. Their constraint, their gate, their first move, their built offer,
 * in the words the engine already wrote for them. If a touch could be sent to
 * anybody else, it is a bug. That is why `personalise()` FAILS CLOSED: a row
 * with no readable diagnosis is not mailed a generic nudge, it is surfaced in
 * `unwritable()` for a human to look at.
 *
 * Design notes, mostly inherited from lib/demo-agent-drip.ts because that pattern
 * is proven here:
 *  - State lives in `app_state` as {step, at}, never as tags inside a notes
 *    string. Advances only after a CONFIRMED send.
 *  - Sends through sendViaResend, so the unified suppression gate, the Sent
 *    store, and the staff mute (Easton: sign-in links only) all apply. An
 *    unsubscribed address is a hard stop, not a phantom success.
 *  - Every touch carries RFC 8058 one-click unsubscribe.
 *  - A sequence may only START inside a freshness window. Cron lag can never
 *    cold-open "you ran your roadmap yesterday" on a three week old row.
 *  - The two sequences are MUTUALLY EXCLUSIVE. An interviewee is dropped from
 *    the roadmap drip the moment their interview completes, so nobody is ever
 *    worked by both.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { HUNDREDFOLD, GUARANTEE, priceSentence } from '@/lib/hundredfold';
import type { RoadmapReport } from '@/lib/roadmap-shape';
import type { BuiltOffer } from '@/lib/hundredfold-synthesis';

/* -------------------------------------------------------------------------- */
/* Shared guards                                                               */
/* -------------------------------------------------------------------------- */

const CAP_PER_RUN = 15;
const WINDOW_DAYS = 60;

const RM_KEY = (id: string) => `hfdrip:rm:${id}`;
const IV_KEY = (id: string) => `hfdrip:iv:${id}`;

/** Old enough not to be pushy, young enough that touch one is still true. */
const START_MAX_AGE_HRS_ROADMAP = 96;
const START_MAX_AGE_HRS_INTERVIEW = 72;

type DripState = { step: number; at: string };

/**
 * Member statuses that end a sequence. `offered` is deliberately NOT here: an
 * offer sent is not an offer taken, and that is exactly who this drip is for.
 */
const TERMINAL_MEMBER = new Set(['active', 'paused', 'alumni', 'declined']);

/**
 * Addresses this drip must never mail.
 *
 * The reserved TLDs matter more than they look: the Whitaker Med Spa demo runs
 * on dana@whitakermedspa.demo and the earlier test pass on .test. Both are real
 * rows in hundredfold_members with a real completed interview, so without this
 * the first production run would have tried to mail the demo. Owner and studio
 * addresses are excluded for the same reason: we run our own tools on our own
 * site constantly and must not drip ourselves.
 */
const RESERVED_TLD = /\.(demo|test|invalid|example|local|localhost)$/i;
const INTERNAL_DOMAINS = new Set(['modernmustardseed.com', 'crossandcovenant.co']);
const INTERNAL_ADDRS = new Set([
  'makeourcitypretty@gmail.com',
  'wildhopehouse@gmail.com',
  'easton12parrot@gmail.com',
]);

export function mailable(email: string | null | undefined): boolean {
  const e = (email ?? '').trim().toLowerCase();
  if (!e || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return false;
  if (RESERVED_TLD.test(e)) return false;
  if (INTERNAL_ADDRS.has(e)) return false;
  const domain = e.split('@')[1] ?? '';
  if (INTERNAL_DOMAINS.has(domain)) return false;
  return true;
}

const firstNameOf = (name: string | null | undefined): string | null => {
  const n = (name ?? '').trim().split(/\s+/)[0];
  return n && n.length > 1 ? n : null;
};

/** Trim a sentence the engine wrote so it sits in an email without sprawling. */
const clip = (s: string | null | undefined, max = 320): string => {
  const t = (s ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/[\s,;:.]+$/, '')}…`;
};

const unsubUrlFor = (email: string) =>
  `${SITE.url}/api/outreach/unsubscribe?c=${encodeURIComponent(email)}`;

const unsubFooter = (url: string) =>
  `<div style="text-align:center;font-size:12px;color:#8a857a;padding:18px 0"><a href="${url}" style="color:#8a857a">Unsubscribe</a> and I will never email you again.</div>`;

/* -------------------------------------------------------------------------- */
/* The personalisation gate                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Everything a touch is allowed to be built from. If this cannot be filled from
 * the row, NOTHING IS SENT. A follow-up that does not quote their own document
 * is a generic nudge, and Sarah's instruction was explicit that these are
 * written from their own roadmap or not at all.
 */
export type Personal = {
  business: string;
  firstName: string | null;
  constraintType: string;
  constraintTitle: string;
  evidence: string;
  costOfIgnoring: string;
  firstMove: string;
  headline: string;
  stage: string;
  score: number | null;
  nextThree: string[];
  windowOne: { title: string; goal: string; metric: string; gate: string } | null;
  offerName: string;
  offerPromise: string;
  offerPriceLogic: string;
  offerCut: string;
};

export function personalise(report: RoadmapReport | null, fallbackBusiness?: string | null): Personal | null {
  if (!report) return null;
  const c = report.constraint;
  // The two load-bearing sentences. Without them there is no letter to write.
  if (!c?.type || !clip(c.title) || !clip(c.first_move)) return null;

  const p0 = report.phases?.[0];
  return {
    business: (report.business_name || fallbackBusiness || '').trim() || 'your business',
    firstName: null,
    constraintType: String(c.type),
    constraintTitle: clip(c.title, 180),
    evidence: clip(c.evidence, 420),
    costOfIgnoring: clip(c.cost_of_ignoring, 420),
    firstMove: clip(c.first_move, 420),
    headline: clip(report.headline, 220),
    stage: String(report.stage ?? ''),
    score: typeof report.scale_score === 'number' ? report.scale_score : null,
    nextThree: (report.next_three ?? []).slice(0, 3).map((s) => clip(s, 200)).filter(Boolean),
    windowOne: p0
      ? {
          title: clip(p0.title, 120),
          goal: clip(p0.goal, 260),
          metric: clip(p0.metric, 160),
          gate: clip(p0.gate, 200),
        }
      : null,
    offerName: clip(report.offer?.name, 120),
    offerPromise: clip(report.offer?.promise, 260),
    offerPriceLogic: clip(report.offer?.price_logic, 300),
    offerCut: clip(report.offer_cuts?.[0], 200),
  };
}

/* -------------------------------------------------------------------------- */
/* Sequence A: the roadmap takers                                              */
/* -------------------------------------------------------------------------- */

/**
 * Cadence, in hours since they ran it. They already have the roadmap in hand
 * (delivery mails it at generation time), so touch one waits two days: long
 * enough that they either acted or did not, short enough that it is still the
 * live thing on their desk.
 */
function dueRoadmap(step: number, ageHrs: number, sinceLastHrs: number): boolean {
  if (step === 0) return ageHrs >= 40 && ageHrs <= START_MAX_AGE_HRS_ROADMAP;
  if (step === 1) return ageHrs >= 110 && sinceLastHrs >= 60;
  if (step === 2) return ageHrs >= 210 && sinceLastHrs >= 80;
  if (step === 3) return ageHrs >= 330 && sinceLastHrs >= 100;
  return false;
}

export const ROADMAP_TOUCHES = 4;

export function roadmapDripEmail(
  p: Personal,
  step: number,
  ctx: { reportUrl: string; firstName: string | null }
): { subject: string; html: string; snippet: string } {
  const first = ctx.firstName;
  const hi = first ? `Hi ${first},` : 'Hi there,';
  const biz = escape(p.business);
  const openTheRoadmap = { label: 'Open your roadmap', url: ctx.reportUrl };
  const interview = { label: 'Do the interview', url: `${SITE.url}${HUNDREDFOLD.path}#interview` };

  if (step === 0) {
    return {
      subject: `${p.business}: the first move on your roadmap`,
      snippet: 'Roadmap follow-up 1 of 4: did the first move happen?',
      html: clientEmail({
        preheader: `Your constraint was ${p.constraintType}. Here is the one move that was on top of the list.`,
        eyebrow: 'YOUR HUNDREDFOLD ROADMAP',
        greeting: hi,
        body:
          `<p>A couple of days ago the roadmap for ${biz} came back and named one thing as the cap on the whole business: <strong>${escape(p.constraintTitle)}</strong>.</p>` +
          (p.evidence ? `<p>The reason it landed there: ${escape(p.evidence)}</p>` : '') +
          `<p>Everything else in that document waits behind one move, and this was it:</p>` +
          `<blockquote style="margin:0 0 18px;padding:14px 18px;border-left:3px solid #F5B700;background:#FFF3CC;font-size:16px;line-height:1.6">${escape(p.firstMove)}</blockquote>` +
          `<p>I am not asking you to buy anything today. I am asking whether that happened. If it did, tell me what came of it and I will tell you what I would do next. If it did not, the honest question is what got in the way, because that answer is usually the real constraint.</p>`,
        cta: openTheRoadmap,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 1) {
    const gate = p.windowOne;
    return {
      subject: first ? `${first}, what the ${p.constraintType} problem costs you` : `What the ${p.constraintType} problem costs you`,
      snippet: 'Roadmap follow-up 2 of 4: the cost of leaving it, and the number to clear.',
      html: clientEmail({
        preheader: 'The part of the roadmap most owners skip: what happens if nothing changes.',
        eyebrow: 'WINDOW ONE',
        greeting: hi,
        body:
          (p.costOfIgnoring
            ? `<p>There is a line in your roadmap that is easy to scroll past, because nobody enjoys reading it:</p><blockquote style="margin:0 0 18px;padding:14px 18px;border-left:3px solid #C2261A;background:#FFFDF6;font-size:16px;line-height:1.6">${escape(p.costOfIgnoring)}</blockquote>`
            : `<p>The roadmap put ${escape(p.constraintTitle.toLowerCase())} at the top for a reason, and that reason does not get smaller by waiting.</p>`) +
          (gate
            ? `<p>The plan does not ask you to fix everything. Window one is <strong>${escape(gate.title)}</strong>, the goal is ${escape(gate.goal)}, and you watch exactly one number: ${escape(gate.metric)}. You do not move to window two because ninety days passed. You move when the gate clears: <strong>${escape(gate.gate)}</strong>.</p>`
            : '') +
          `<p>That is the whole method. One constraint, one window, one number. Most plans fail because they give an owner eleven things to do on a Monday.</p>`,
        cta: openTheRoadmap,
        secondary: interview,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 2) {
    return {
      subject: p.offerName ? `About "${p.offerName}"` : `The offer your roadmap wants you to sell`,
      snippet: 'Roadmap follow-up 3 of 4: the offer rebuild, and the interview.',
      html: clientEmail({
        preheader: 'The offer section is the hardest part of that document to do alone.',
        eyebrow: 'THE OFFER',
        greeting: hi,
        body:
          (p.offerName
            ? `<p>Your roadmap proposed rebuilding what you sell and called it <strong>${escape(p.offerName)}</strong>${p.offerPromise ? `: ${escape(p.offerPromise)}` : '.'}</p>`
            : `<p>Your roadmap proposed rebuilding what you sell before touching traffic.</p>`) +
          (p.offerPriceLogic ? `<p>On the price it said: ${escape(p.offerPriceLogic)}</p>` : '') +
          (p.offerCut ? `<p>And it named something to stop doing: ${escape(p.offerCut)}</p>` : '') +
          `<p>Here is the honest part. That section is written from your website, which is the thinnest possible read on a business. It cannot hear what your customers actually say on the phone, what you quietly discount, or which job you dread. The version built from a real conversation is a different document.</p>` +
          `<p>So the next step is not a sales call. It is an interview. Mr. Mustard, our coach, asks you thirty one questions about ${biz} and does not accept a vague answer. It costs nothing, it runs in your browser or on the phone, and the transcript is yours whatever you decide afterwards.</p>`,
        cta: interview,
        secondary: openTheRoadmap,
        signature: 'Sarah',
      }),
    };
  }

  return {
    subject: first ? `Last one from me, ${first}` : 'Last one from me',
    snippet: 'Roadmap follow-up 4 of 4: the honest close.',
    html: clientEmail({
      preheader: 'Your roadmap stays live either way. This is the last email about it.',
      eyebrow: 'THE HONEST CLOSE',
      greeting: hi,
      body:
        `<p>This is my last email about the roadmap, and I mean it. Your document stays at that link permanently, so nothing expires and nobody is going to chase you.</p>` +
        `<p>If you want the version that gets built instead of read, that is HUNDREDFOLD. We interview you properly, rebuild the offer, write the twelve month plan with a number on every gate, and then build the systems that run it: the phone answered day and night, the follow-up that never forgets a warm lead, the numbers on one board. Your coach sits in your Command Center and knows your whole file, so there is no call to schedule and no waiting until Tuesday.</p>` +
        `<p>It is ${priceSentence()}, month to month. ${escape(GUARANTEE.short)}</p>` +
        `<p>If the timing is wrong, ignore this with a clear conscience. ${p.firstMove ? `Either way, the first move on your own roadmap is still the right thing to do this week: ${escape(p.firstMove)}` : ''}</p>`,
      cta: { label: 'See what HUNDREDFOLD is', url: `${SITE.url}${HUNDREDFOLD.path}` },
      secondary: openTheRoadmap,
      signature: 'Sarah',
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* Sequence B: the interviewees                                                */
/* -------------------------------------------------------------------------- */

/**
 * Hotter and shorter. They sat through thirty one questions, so the first touch
 * lands the next day while it is still the thing they did yesterday.
 */
function dueInterview(step: number, ageHrs: number, sinceLastHrs: number): boolean {
  if (step === 0) return ageHrs >= 18 && ageHrs <= START_MAX_AGE_HRS_INTERVIEW;
  if (step === 1) return ageHrs >= 90 && sinceLastHrs >= 60;
  if (step === 2) return ageHrs >= 200 && sinceLastHrs >= 90;
  return false;
}

export const INTERVIEW_TOUCHES = 3;

export function interviewDripEmail(
  p: Personal,
  step: number,
  ctx: { firstName: string | null; offer: BuiltOffer | null; roadmapUrl: string | null }
): { subject: string; html: string; snippet: string } {
  const first = ctx.firstName;
  const hi = first ? `Hi ${first},` : 'Hi there,';
  const biz = escape(p.business);
  const join = { label: 'Start HUNDREDFOLD', url: `${SITE.url}${HUNDREDFOLD.path}` };
  const roadmapLink = ctx.roadmapUrl ? { label: 'Your roadmap', url: ctx.roadmapUrl } : undefined;

  if (step === 0) {
    return {
      subject: `${p.business}: what your own answers said`,
      snippet: 'Interview follow-up 1 of 3: the read from their own interview.',
      html: clientEmail({
        preheader: p.headline || 'The read from your interview, in one paragraph.',
        eyebrow: 'FROM YOUR INTERVIEW',
        greeting: hi,
        body:
          `<p>You gave Mr. Mustard a real interview about ${biz}, which most owners will not sit still for. Here is what came out of it, before anything else happens.</p>` +
          (p.headline ? `<p style="font-family:Georgia,serif;font-size:20px;line-height:1.45;color:#161616;margin:0 0 18px">“${escape(p.headline)}”</p>` : '') +
          `<p><strong>The constraint: ${escape(p.constraintTitle)}.</strong>${p.evidence ? ` ${escape(p.evidence)}` : ''}</p>` +
          (p.windowOne
            ? `<p>Window one is <strong>${escape(p.windowOne.title)}</strong>. The goal is ${escape(p.windowOne.goal)}, the number you watch is ${escape(p.windowOne.metric)}, and the gate that unlocks window two is ${escape(p.windowOne.gate)}.</p>`
            : '') +
          `<p>None of that came from your website. It came from your answers, which is why it is uncomfortable and why it is right. The first move stands on its own whether we ever work together:</p>` +
          `<blockquote style="margin:0 0 18px;padding:14px 18px;border-left:3px solid #F5B700;background:#FFF3CC;font-size:16px;line-height:1.6">${escape(p.firstMove)}</blockquote>`,
        cta: join,
        secondary: roadmapLink,
        signature: 'Sarah',
      }),
    };
  }

  if (step === 1) {
    const o = ctx.offer;
    return {
      subject: o?.name ? `The offer we built for you: ${o.name}` : `The offer we built for ${p.business}`,
      snippet: 'Interview follow-up 2 of 3: the built offer.',
      html: clientEmail({
        preheader: 'Named, promised, priced, and guaranteed. Built from your interview.',
        eyebrow: 'THE OFFER BUILD',
        greeting: hi,
        body: o
          ? `<p>This is the part of the program people underestimate until they see theirs. From your interview we built the thing ${biz} should actually be selling:</p>` +
            `<p style="font-family:Georgia,serif;font-size:22px;line-height:1.35;color:#161616;margin:0 0 6px">${escape(o.name)}</p>` +
            (o.one_liner ? `<p style="margin:0 0 18px;color:#8A8378">${escape(clip(o.one_liner, 200))}</p>` : '') +
            (o.promise ? `<p><strong>The promise.</strong> ${escape(clip(o.promise, 300))}</p>` : '') +
            (o.price ? `<p><strong>The price.</strong> ${escape(clip(o.price, 200))}${o.price_logic ? ` ${escape(clip(o.price_logic, 260))}` : ''}</p>` : '') +
            (o.guarantee ? `<p><strong>The guarantee.</strong> ${escape(clip(o.guarantee, 260))}</p>` : '') +
            (o.call_opening ? `<p>And when the phone rings, you open with this: “${escape(clip(o.call_opening, 240))}”</p>` : '') +
            `<p>That document is yours. What HUNDREDFOLD does next is build the machine that sells it, one window at a time.</p>`
          : `<p>The next thing your plan calls for is rebuilding what ${biz} sells: named, promised, priced, and guaranteed, written from your interview rather than your homepage.</p>` +
            (p.offerName ? `<p>The working name on it is <strong>${escape(p.offerName)}</strong>${p.offerPromise ? `: ${escape(p.offerPromise)}` : '.'}</p>` : '') +
            `<p>That is window one of HUNDREDFOLD, alongside ${escape(p.constraintTitle.toLowerCase())}.</p>`,
        cta: join,
        secondary: roadmapLink,
        signature: 'Sarah',
      }),
    };
  }

  return {
    subject: first ? `Last note, ${first}` : 'Last note from me',
    snippet: 'Interview follow-up 3 of 3: the honest close.',
    html: clientEmail({
      preheader: 'Your interview and your plan are yours either way.',
      eyebrow: 'THE HONEST CLOSE',
      greeting: hi,
      body:
        `<p>Last email from me on this. Your transcript and your plan are yours whether or not you ever join, and nothing in them expires.</p>` +
        `<p>What joining changes is who does the work. ${escape(p.constraintTitle)} does not get fixed by a document. It gets fixed by the systems that sit underneath it, and building those is the part that has been sitting on your list for a year. That is what the ${HUNDREDFOLD.termMonths} months are: four windows, a number on every gate, the builds made for you, and a coach who has read your whole file and answers at any hour.</p>` +
        `<p>${priceSentence()}, month to month, thirty days notice. ${escape(GUARANTEE.short)}</p>` +
        `<p>If it is not the year for it, say so and I will close the file properly rather than leave you on a list.</p>`,
      cta: join,
      secondary: roadmapLink,
      signature: 'Sarah',
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* The run                                                                     */
/* -------------------------------------------------------------------------- */

export type DripResult = {
  sent: number;
  due: number;
  skipped: number;
  unwritable: number;
  dryRun?: true;
};

export type HundredfoldDripReport = {
  roadmap: DripResult;
  interview: DripResult;
  /** Rows a human should look at: real contacts the robot refused to write to. */
  needsAHuman: { kind: 'roadmap' | 'interview'; label: string; email: string; why: string; ageDays: number }[];
};

type StateMap = Map<string, DripState>;

async function readStates(sb: SupabaseClient, keys: string[]): Promise<StateMap> {
  if (!keys.length) return new Map();
  const out: StateMap = new Map();
  // Chunked: an `in` filter with hundreds of keys builds a URL long enough to
  // be refused by the gateway, and a silently truncated read would restart
  // sequences from step 0. Loud and chunked beats clever and wrong.
  for (let i = 0; i < keys.length; i += 100) {
    const { data } = await sb.from('app_state').select('key, value').in('key', keys.slice(i, i + 100));
    for (const r of data ?? []) out.set(r.key as string, r.value as DripState);
  }
  return out;
}

/**
 * Emails that must never receive the ROADMAP sequence because the INTERVIEW
 * sequence owns them: anyone with a completed interview, and anyone who is
 * already a member in a terminal state.
 */
async function roadmapExclusions(sb: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>();
  const { data: interviews } = await sb
    .from('hundredfold_interviews')
    .select('email')
    .eq('status', 'complete')
    .not('email', 'is', null)
    .limit(2000);
  for (const r of interviews ?? []) out.add(String(r.email).toLowerCase());

  const { data: members } = await sb
    .from('hundredfold_members')
    .select('email, status')
    .in('status', [...TERMINAL_MEMBER])
    .limit(2000);
  for (const r of members ?? []) out.add(String(r.email).toLowerCase());

  return out;
}

async function sendTouch(args: {
  to: string;
  subject: string;
  html: string;
  stateKey: string;
  step: number;
  sb: SupabaseClient;
}): Promise<boolean> {
  const unsub = unsubUrlFor(args.to);
  const result = await sendViaResend({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: args.to,
    replyTo: 'sarah@modernmustardseed.com',
    subject: args.subject,
    html: args.html + unsubFooter(unsub),
    mailbox: 'sarah@modernmustardseed.com',
    unsubscribeUrl: unsub,
  });

  if (!result.ok) {
    // Suppressed, muted, or a transient provider failure. State is NOT advanced,
    // so a suppressed address simply never moves and a blip retries next run.
    console.error(`hundredfold drip send failed for ${args.stateKey}: ${result.error}`);
    return false;
  }

  await args.sb.from('app_state').upsert({
    key: args.stateKey,
    value: { step: args.step + 1, at: new Date().toISOString() } satisfies DripState,
  });
  return true;
}

/** Sequence A. Roadmap takers who never came back. */
export async function roadmapDrip(
  sb: SupabaseClient,
  opts: { dryRun?: boolean; onlyId?: string } = {}
): Promise<{ result: DripResult; needsAHuman: HundredfoldDripReport['needsAHuman'] }> {
  const now = Date.now();
  const needsAHuman: HundredfoldDripReport['needsAHuman'] = [];
  const result: DripResult = { sent: 0, due: 0, skipped: 0, unwritable: 0, ...(opts.dryRun ? { dryRun: true as const } : {}) };

  // Summary columns only. The `report` jsonb is large and is fetched for the
  // handful of rows that turn out to be due, never for the whole window.
  const { data: rows, error } = await sb
    .from('scaling_roadmaps')
    .select('id, slug, host, business_name, email, name, source, created_at')
    .eq('source', 'public')
    .not('email', 'is', null)
    .gte('created_at', new Date(now - WINDOW_DAYS * 86400000).toISOString())
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) {
    console.error('hundredfold roadmap drip query failed:', error.message);
    return { result, needsAHuman };
  }

  const pool = (opts.onlyId ? (rows ?? []).filter((r) => r.id === opts.onlyId) : (rows ?? [])) as {
    id: string;
    slug: string;
    host: string;
    business_name: string | null;
    email: string;
    name: string | null;
    created_at: string;
  }[];
  if (!pool.length) return { result, needsAHuman };

  const excluded = await roadmapExclusions(sb);
  const states = await readStates(sb, pool.map((r) => RM_KEY(r.id)));

  // One address can run the tool more than once. Only the newest roadmap for a
  // given address is ever worked, or the same person gets the same four letters
  // twice from two different rows.
  const seenEmail = new Set<string>();

  for (const row of pool) {
    if (result.sent >= CAP_PER_RUN) break;
    const email = row.email.trim().toLowerCase();

    if (!mailable(email) || excluded.has(email) || seenEmail.has(email)) {
      result.skipped += 1;
      continue;
    }
    seenEmail.add(email);

    const state = states.get(RM_KEY(row.id)) ?? { step: 0, at: row.created_at };
    if (state.step >= ROADMAP_TOUCHES) continue;

    const ageHrs = (now - new Date(row.created_at).getTime()) / 3600000;
    const sinceLastHrs = (now - new Date(state.at).getTime()) / 3600000;
    if (!dueRoadmap(state.step, ageHrs, sinceLastHrs)) {
      // Never started and now past the freshness ceiling: a real contact the
      // robot will not cold-open on. Surface it rather than lose it.
      if (state.step === 0 && ageHrs > START_MAX_AGE_HRS_ROADMAP) {
        needsAHuman.push({
          kind: 'roadmap',
          label: row.business_name || row.host,
          email,
          why: 'Ran the roadmap before the drip existed, too old to cold-open',
          ageDays: Math.round(ageHrs / 24),
        });
      }
      continue;
    }

    const { data: full } = await sb.from('scaling_roadmaps').select('report').eq('id', row.id).maybeSingle();
    const p = personalise((full?.report as RoadmapReport) ?? null, row.business_name || row.host);
    if (!p) {
      // FAILS CLOSED. No readable diagnosis means no letter, not a generic one.
      result.unwritable += 1;
      needsAHuman.push({
        kind: 'roadmap',
        label: row.business_name || row.host,
        email,
        why: 'Roadmap has no readable constraint, nothing personal to write from',
        ageDays: Math.round(ageHrs / 24),
      });
      continue;
    }

    result.due += 1;
    if (opts.dryRun) continue;

    const mail = roadmapDripEmail(p, state.step, {
      reportUrl: `${SITE.url}/scaling-roadmap/r/${row.slug}`,
      firstName: firstNameOf(row.name),
    });
    const ok = await sendTouch({ to: email, subject: mail.subject, html: mail.html, stateKey: RM_KEY(row.id), step: state.step, sb });
    if (ok) result.sent += 1;
    else result.skipped += 1;
  }

  return { result, needsAHuman };
}

/** Sequence B. Finished the interview, did not join. */
export async function interviewDrip(
  sb: SupabaseClient,
  opts: { dryRun?: boolean; onlyMemberId?: string } = {}
): Promise<{ result: DripResult; needsAHuman: HundredfoldDripReport['needsAHuman'] }> {
  const now = Date.now();
  const needsAHuman: HundredfoldDripReport['needsAHuman'] = [];
  const result: DripResult = { sent: 0, due: 0, skipped: 0, unwritable: 0, ...(opts.dryRun ? { dryRun: true as const } : {}) };

  const { data: interviews, error } = await sb
    .from('hundredfold_interviews')
    .select('id, member_id, email, business_name, status, completed_at')
    .eq('status', 'complete')
    .not('member_id', 'is', null)
    .gte('completed_at', new Date(now - WINDOW_DAYS * 86400000).toISOString())
    .order('completed_at', { ascending: false })
    .limit(400);

  if (error) {
    console.error('hundredfold interview drip query failed:', error.message);
    return { result, needsAHuman };
  }

  const done = (interviews ?? []) as { id: string; member_id: string; email: string | null; business_name: string | null; completed_at: string }[];
  const scoped = opts.onlyMemberId ? done.filter((i) => i.member_id === opts.onlyMemberId) : done;
  if (!scoped.length) return { result, needsAHuman };

  // Newest completed interview per member. A member who was re-interviewed is
  // one sequence, not two.
  const byMember = new Map<string, (typeof scoped)[number]>();
  for (const iv of scoped) if (!byMember.has(iv.member_id)) byMember.set(iv.member_id, iv);

  const memberIds = [...byMember.keys()];
  const { data: memberRows } = await sb
    .from('hundredfold_members')
    .select('id, email, name, business_name, status, deep_roadmap, offer, roadmap_slug')
    .in('id', memberIds);
  const members = new Map((memberRows ?? []).map((m) => [m.id as string, m]));

  const states = await readStates(sb, memberIds.map(IV_KEY));

  for (const [memberId, iv] of byMember) {
    if (result.sent >= CAP_PER_RUN) break;
    const member = members.get(memberId) as
      | {
          id: string;
          email: string;
          name: string | null;
          business_name: string | null;
          status: string;
          deep_roadmap: RoadmapReport | null;
          offer: BuiltOffer | null;
          roadmap_slug: string | null;
        }
      | undefined;
    if (!member) {
      result.skipped += 1;
      continue;
    }

    const email = (member.email || iv.email || '').trim().toLowerCase();
    // They bought, paused, graduated, or said no. The drip's job is over.
    if (TERMINAL_MEMBER.has(member.status) || !mailable(email)) {
      result.skipped += 1;
      continue;
    }

    const state = states.get(IV_KEY(memberId)) ?? { step: 0, at: iv.completed_at };
    if (state.step >= INTERVIEW_TOUCHES) continue;

    const ageHrs = (now - new Date(iv.completed_at).getTime()) / 3600000;
    const sinceLastHrs = (now - new Date(state.at).getTime()) / 3600000;
    if (!dueInterview(state.step, ageHrs, sinceLastHrs)) {
      if (state.step === 0 && ageHrs > START_MAX_AGE_HRS_INTERVIEW) {
        needsAHuman.push({
          kind: 'interview',
          label: member.business_name || iv.business_name || email,
          email,
          why: 'Completed the interview before the drip existed, too old to cold-open',
          ageDays: Math.round(ageHrs / 24),
        });
      }
      continue;
    }

    const p = personalise(member.deep_roadmap, member.business_name || iv.business_name);
    if (!p) {
      // An interview finished but never synthesised. That is OUR gap, not
      // theirs, and mailing them a generic nudge would paper over it.
      result.unwritable += 1;
      needsAHuman.push({
        kind: 'interview',
        label: member.business_name || iv.business_name || email,
        email,
        why: 'Interview complete but no deep roadmap yet. Run the synthesis, then this drips.',
        ageDays: Math.round(ageHrs / 24),
      });
      continue;
    }

    result.due += 1;
    if (opts.dryRun) continue;

    const mail = interviewDripEmail(p, state.step, {
      firstName: firstNameOf(member.name),
      offer: member.offer,
      roadmapUrl: member.roadmap_slug ? `${SITE.url}/scaling-roadmap/r/${member.roadmap_slug}` : null,
    });
    const ok = await sendTouch({ to: email, subject: mail.subject, html: mail.html, stateKey: IV_KEY(memberId), step: state.step, sb });
    if (ok) result.sent += 1;
    else result.skipped += 1;
  }

  return { result, needsAHuman };
}

/** Both sequences, one pass. Called by the cron and by the admin trigger. */
export async function hundredfoldDrip(
  sb: SupabaseClient,
  opts: { dryRun?: boolean } = {}
): Promise<HundredfoldDripReport> {
  const a = await roadmapDrip(sb, opts);
  const b = await interviewDrip(sb, opts);
  return {
    roadmap: a.result,
    interview: b.result,
    needsAHuman: [...a.needsAHuman, ...b.needsAHuman].slice(0, 50),
  };
}
