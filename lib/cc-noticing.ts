import type { SupabaseClient } from '@supabase/supabase-js';
import { LlmUnavailable, llmJson } from '@/lib/llm';
import type { ClientProject } from '@/lib/client-leads';
import { OPEN_STAGES, STAGE_LABEL, WON_STAGES, daysSince, listJobs, money } from '@/lib/cc-jobs';
import { summariseSources } from '@/lib/cc-sources';
import { remember } from '@/lib/cc-facts';
import { put, type BriefAction } from '@/lib/cc-briefs';

/**
 * WHAT NOBODY WOULD HAVE NOTICED.
 *
 * Every other brief in this system is a rule: a lead is a day old, a stage has
 * sat a fortnight, a certificate runs out. Rules are reliable and they are
 * blind. They cannot tell you that every job Kim Marland sent has closed and
 * two of your last three website leads did not, or that the estimates you
 * turn round in a week close and the ones that take a month do not.
 *
 * That is the difference between a dashboard and somebody who works here.
 *
 * THE ONE RULE THAT MAKES IT TRUSTWORTHY: every observation must carry the
 * count it came from. The evidence is assembled here, in code, from rows, and
 * the model is only allowed to phrase and rank what it is handed. It is never
 * asked what it thinks; it is asked which of these counted facts a builder
 * would act on this week, and why.
 *
 * And a pattern is not a fact. Anything it concludes about how the business
 * works is written as a PROPOSED fact, unconfirmed, and shown as a question.
 * A machine that quietly adopts its own guesses will act on a wrong one
 * eventually, and nobody will know where it came from.
 */

export type Evidence = { fact: string; n: number; detail?: string };

/**
 * The counted facts. No opinions, no adjectives, nothing that is not
 * arithmetic over their own rows.
 */
export async function gatherEvidence(sb: SupabaseClient, project: ClientProject): Promise<Evidence[]> {
  const email = project.clientEmail;
  const out: Evidence[] = [];
  const jobs = await listJobs(sb, email);

  if (jobs.length) {
    const open = jobs.filter((j) => OPEN_STAGES.includes(j.stage));
    const won = jobs.filter((j) => WON_STAGES.includes(j.stage));
    const lost = jobs.filter((j) => j.stage === 'lost');
    out.push({ fact: 'jobs on the board', n: jobs.length, detail: `${open.length} in play, ${won.length} signed, ${lost.length} lost` });

    // Which relationships actually produce signed work.
    const { rows } = summariseSources(jobs);
    for (const r of rows.slice(0, 6)) {
      if (r.jobs < 2) continue;
      out.push({
        fact: `work from ${r.name}`,
        n: r.jobs,
        detail: `${r.won} signed${r.wonValueCents ? ` worth ${money(r.wonValueCents)}` : ''}, ${r.lost} lost, ${r.open} still open`,
      });
    }

    // How long a stage takes when it closes, versus when it does not. This is
    // the one that changes behaviour: a builder who learns their fast
    // estimates close will start turning estimates round faster.
    const wonDays = won.map((j) => daysSince(j.created_at, Date.parse(j.stage_changed_at))).filter((d): d is number => d !== null);
    const lostDays = lost.map((j) => daysSince(j.created_at, Date.parse(j.stage_changed_at))).filter((d): d is number => d !== null);
    const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    // A duration is only evidence once there is a duration. Rows entered today
    // average zero days, and handing "zero" to a model produces a confident
    // sentence about a business that decides fast, which is a fact about the
    // data entry and not about the business.
    const wonAvg = avg(wonDays);
    const lostAvg = avg(lostDays);
    if (wonDays.length >= 2 && wonAvg !== null && wonAvg >= 1) out.push({ fact: 'days from first contact to signing, on the ones that signed', n: wonDays.length, detail: `average ${wonAvg} days` });
    if (lostDays.length >= 2 && lostAvg !== null && lostAvg >= 1) out.push({ fact: 'days from first contact to lost, on the ones that went away', n: lostDays.length, detail: `average ${lostAvg} days` });

    // Where things stall.
    const byStage = new Map<string, number[]>();
    for (const j of open) {
      const d = daysSince(j.stage_changed_at);
      if (d !== null) byStage.set(j.stage, [...(byStage.get(j.stage) ?? []), d]);
    }
    for (const [stage, days] of byStage) {
      const a = avg(days);
      if (days.length < 2 || a === null || a < 1) continue;
      out.push({ fact: `jobs sitting at ${STAGE_LABEL[stage as keyof typeof STAGE_LABEL] ?? stage}`, n: days.length, detail: `average ${a} days in that stage` });
    }

    const noValue = open.filter((j) => j.value_cents == null).length;
    if (noValue) out.push({ fact: 'jobs in play with no value on them', n: noValue, detail: 'they are missing from every total' });
    const noOwner = open.filter((j) => !j.owner_key).length;
    if (noOwner) out.push({ fact: 'jobs in play that nobody owns', n: noOwner });
  }

  // What the inquiries themselves say. The words people type into a form are
  // the cheapest market research a business will ever get, and nobody reads
  // them twice.
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data: leads } = await sb
    .from('client_leads')
    .select('project_type, land, town, message, created_at, handled_at')
    .eq('client_email', email)
    .gte('created_at', since)
    .limit(300);
  const ls = leads ?? [];
  if (ls.length) {
    out.push({ fact: 'website inquiries in the last four months', n: ls.length });
    const byTown = new Map<string, number>();
    const byType = new Map<string, number>();
    const byLand = new Map<string, number>();
    for (const l of ls) {
      const t = String(l.town ?? '').trim();
      if (t) byTown.set(t, (byTown.get(t) ?? 0) + 1);
      const k = String(l.project_type ?? '').trim();
      if (k) byType.set(k, (byType.get(k) ?? 0) + 1);
      const land = String(l.land ?? '').trim();
      if (land) byLand.set(land, (byLand.get(land) ?? 0) + 1);
    }
    const top = (m: Map<string, number>, label: string) => {
      for (const [k, n] of [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) if (n >= 2) out.push({ fact: `${label}: ${k}`, n });
    };
    top(byTown, 'inquiries from');
    top(byType, 'inquiries asking for');
    top(byLand, 'inquiries whose land answer was');

    const unanswered = ls.filter((l) => !l.handled_at).length;
    if (unanswered) out.push({ fact: 'inquiries in that window nobody has marked called', n: unanswered });
  }

  return out;
}

const NOTICE_SCHEMA = {
  type: 'object',
  required: ['noticed', 'patterns'],
  properties: {
    noticed: {
      type: 'array',
      description: 'Two to four things worth a business owner’s attention this week, most useful first. Each must quote the numbers it came from.',
      items: {
        type: 'object',
        required: ['say', 'because', 'do'],
        properties: {
          say: { type: 'string', description: 'The observation in one sentence, with the number in it.' },
          because: { type: 'string', description: 'The counted evidence it rests on, quoted from what you were given.' },
          do: { type: 'string', description: 'The one thing to do about it this week. Concrete. Never "consider" or "review".' },
        },
      },
    },
    patterns: {
      type: 'array',
      description: 'Zero to two things that look like they might be true about how this business works, worth asking the owner to confirm. Leave empty when nothing is well enough supported.',
      items: {
        type: 'object',
        required: ['fact', 'evidence'],
        properties: {
          fact: { type: 'string', description: 'One sentence, as a statement about the business.' },
          evidence: { type: 'string', description: 'The counts behind it.' },
        },
      },
    },
  },
} as const;

export type Noticed = { say: string; because: string; do: string };
export type Pattern = { fact: string; evidence: string };

export async function noticeThings(
  sb: SupabaseClient,
  project: ClientProject,
): Promise<'written' | 'already' | 'nothing'> {
  const evidence = await gatherEvidence(sb, project);
  // Under a handful of counted facts there is nothing to notice, and a brief
  // that reaches for a pattern in four rows is how a business learns to
  // distrust the whole feature.
  if (evidence.length < 6) return 'nothing';

  const system = [
    `You are reading the numbers of ${project.business}, a custom home builder, for its owner.`,
    'You are handed counted facts from their own records. You may not add a fact, a cause or a number that is not in them. You are not guessing at the market, the economy or their competitors.',
    'Your job is to say which of these a builder would act on THIS WEEK, and what the act is. Two to four of them, most useful first.',
    'Every observation quotes its numbers. "Three of the four jobs that signed came from one architect" is useful. "Referrals are important" is noise and you will not write it.',
    'The action is concrete and small enough to do between job sites: a call, a page, a number to write down. Never "consider", never "review", never "explore".',
    'In patterns, put at most two things that look like they might be true about how this business works, for the owner to confirm or reject. If nothing is well enough supported by the counts, return an empty list. An empty list is a good answer.',
    'No em dashes. Plain words. Never flatter them.',
    'Return only the JSON.',
  ].join('\n');

  const user = ['The counted facts from their own records:', ...evidence.map((e) => `- ${e.fact}: ${e.n}${e.detail ? ` (${e.detail})` : ''}`), '', 'Write the JSON.'].join('\n');

  let noticed: Noticed[] = [];
  let patterns: Pattern[] = [];
  try {
    const j = await llmJson<{ noticed: Noticed[]; patterns: Pattern[] }>({ system, user, label: `notice:${project.clientEmail}`, model: 'sonnet', schema: NOTICE_SCHEMA, timeoutMs: 60_000 });
    noticed = (Array.isArray(j.noticed) ? j.noticed : []).slice(0, 4);
    patterns = (Array.isArray(j.patterns) ? j.patterns : []).slice(0, 2);
  } catch (err) {
    if (err instanceof LlmUnavailable) return 'nothing';
    throw err;
  }
  if (!noticed.length) return 'nothing';

  const body = noticed
    .map((n) => [`${String(n.say).trim()}`, `  Because: ${String(n.because).trim()}`, `  Do: ${String(n.do).trim()}`].join('\n'))
    .join('\n\n');

  // A pattern is a question, never knowledge. It is written unconfirmed and
  // the owner is asked.
  for (const p of patterns) {
    try {
      await remember(sb, project.clientEmail, { fact: p.fact, kind: 'about', source: 'noticed', evidence: p.evidence, by: 'the standing work' });
    } catch {
      /* the brief still stands without it */
    }
  }

  const actions: BriefAction[] = [{ kind: 'open', label: 'Open the board', room: 'jobs' }];
  const asked = patterns.length ? `\n\nTwo things I think might be true, which you can confirm or throw out in Contacts:\n${patterns.map((p) => `- ${p.fact} (${p.evidence})`).join('\n')}` : '';

  return put(sb, project.clientEmail, {
    kind: 'noticed',
    subject_type: 'board',
    subject_id: null,
    title: 'What I noticed in your numbers',
    body: `${body}${asked}`,
    actions,
  });
}
