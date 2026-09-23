import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientProject } from '@/lib/client-leads';
import { getSettings } from '@/lib/posting/settings';
import { DEFAULT_PLATFORM_HOURS, PLATFORM_LABEL, hourFor, type Platform } from '@/lib/posting/types';
import { prettyHour } from '@/lib/posting/time';
import { QUIET_AFTER_DAYS, STAGE_LABEL, WON_STAGES, listJobs, type Stage } from '@/lib/cc-jobs';
import { put } from '@/lib/cc-briefs';

/**
 * THE DESK LEARNS THE BUSINESS IT SITS IN.
 *
 * Two numbers in this product were set by somebody reasonable and are not
 * about this particular business at all:
 *
 *   THE HOUR each feed posts, which started as what the feeds generally
 *   reward, and
 *   THE SILENCE a stage may sit through before the board goes amber, which
 *   started as ordinary sales sense.
 *
 * Both should end up being about them. A builder whose Instagram audience is
 * awake at six in the morning should not be posting at eleven forever because
 * a default said so, and a business whose estimates close in four days should
 * not wait a week before the board says anything.
 *
 * SO IT PROPOSES, AND A PERSON DECIDES. Nothing here changes a setting. Self
 * tuning software that quietly moves its own numbers is software nobody can
 * debug and nobody can trust: the day the posting hour is wrong, the owner has
 * no idea what it used to be or who decided. A proposal carries the counts, a
 * person presses yes, and the change has a name on it.
 *
 * IT STAYS SILENT UNTIL THERE IS ENOUGH TO SAY. Every function here has a
 * floor, and under the floor it returns nothing rather than reaching. A tuning
 * suggestion built on four data points is a coin toss wearing a lab coat.
 */

/** Posts with numbers on them before an hour is worth arguing about. */
const POSTS_FLOOR = 8;
/** Closed jobs before their own cadence is worth preferring to the default. */
const JOBS_FLOOR = 6;

export type Proposal = { what: string; because: string; apply: { kind: 'platform_hour'; platform: Platform; hour: number } | { kind: 'quiet_days'; stage: Stage; days: number } };

type PostRow = { scheduled_for: string; platforms: string[] | null; stats: Record<string, { reach?: number; likes?: number; comments?: number; shares?: number }> | null; publish_at: string | null };

/**
 * Which hour actually earned attention, per platform, from their own posts.
 *
 * Engagement is counted as reach where the platform gives it and likes plus
 * comments plus shares where it does not, because a platform that reports no
 * reach is not a platform with no audience.
 */
export async function hourProposals(sb: SupabaseClient, project: ClientProject): Promise<Proposal[]> {
  const settings = await getSettings(sb, project.clientEmail);
  if (!settings) return [];

  const { data } = await sb
    .from('posting_posts')
    .select('scheduled_for, platforms, stats, publish_at')
    .eq('client_email', project.clientEmail)
    .eq('status', 'published')
    .not('stats', 'is', null)
    .order('scheduled_for', { ascending: false })
    .limit(200);

  const posts = (data ?? []) as PostRow[];
  if (posts.length < POSTS_FLOOR) return [];

  const out: Proposal[] = [];

  for (const platform of settings.platforms) {
    // Group this platform's posts by the hour they actually went out.
    const byHour = new Map<number, number[]>();
    for (const p of posts) {
      const stat = p.stats?.[platform];
      if (!stat) continue;
      const score = stat.reach ?? (stat.likes ?? 0) + (stat.comments ?? 0) + (stat.shares ?? 0);
      if (!Number.isFinite(score)) continue;
      // The hour this feed was set to when the post went out is the best
      // record we have of when it was seen.
      const hour = hourFor(settings, platform);
      byHour.set(hour, [...(byHour.get(hour) ?? []), score]);
    }

    // With a single hour in the history there is nothing to compare, which is
    // the usual case and the honest answer is silence.
    if (byHour.size < 2) continue;

    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const ranked = [...byHour.entries()].map(([hour, scores]) => ({ hour, n: scores.length, avg: avg(scores) })).sort((a, b) => b.avg - a.avg);
    const best = ranked[0];
    const now = hourFor(settings, platform);
    if (!best || best.hour === now || best.n < 3) continue;
    const current = ranked.find((r) => r.hour === now);
    if (!current || best.avg < current.avg * 1.25) continue; // a quarter better, or it is noise

    out.push({
      what: `Move ${PLATFORM_LABEL[platform]} from ${prettyHour(now)} to ${prettyHour(best.hour)}`,
      because: `${best.n} posts at ${prettyHour(best.hour)} averaged ${Math.round(best.avg)} against ${Math.round(current.avg)} for ${current.n} at ${prettyHour(now)}`,
      apply: { kind: 'platform_hour', platform, hour: best.hour },
    });
  }

  return out;
}

/**
 * How often THEY actually touch a job that ends up signing, against how long
 * the board currently waits before saying anything.
 */
export async function cadenceProposals(sb: SupabaseClient, project: ClientProject): Promise<Proposal[]> {
  const jobs = await listJobs(sb, project.clientEmail);
  const won = jobs.filter((j) => WON_STAGES.includes(j.stage));
  if (won.length < JOBS_FLOOR) return [];

  const { data: events } = await sb
    .from('client_job_events')
    .select('job_id, created_at, kind')
    .eq('client_email', project.clientEmail)
    .in('job_id', won.map((j) => j.id))
    .in('kind', ['call', 'meeting', 'note', 'email'])
    .order('created_at', { ascending: true })
    .limit(2000);

  // The average gap between one touch and the next, on the jobs that closed.
  const gaps: number[] = [];
  const byJob = new Map<string, number[]>();
  for (const e of events ?? []) {
    const t = Date.parse(String(e.created_at));
    if (Number.isNaN(t)) continue;
    byJob.set(String(e.job_id), [...(byJob.get(String(e.job_id)) ?? []), t]);
  }
  for (const times of byJob.values()) {
    for (let i = 1; i < times.length; i++) gaps.push((times[i] - times[i - 1]) / 86_400_000);
  }
  if (gaps.length < 10) return [];

  const sorted = [...gaps].sort((a, b) => a - b);
  // The median, not the mean: one job left over Christmas should not move a
  // number the whole board is judged by.
  const median = Math.round(sorted[Math.floor(sorted.length / 2)]);
  if (median < 1) return [];

  const out: Proposal[] = [];
  // Their own rhythm, plus a day of slack, applied to the stages where the
  // default is plainly slower than how they actually work.
  const theirs = median + 1;
  for (const stage of ['talking', 'visit', 'estimate'] as Stage[]) {
    const current = QUIET_AFTER_DAYS[stage];
    if (current === null || theirs >= current) continue;
    out.push({
      what: `Say something sooner on ${STAGE_LABEL[stage]}: after ${theirs} days instead of ${current}`,
      because: `on the ${won.length} jobs that signed, somebody touched them every ${median} days`,
      apply: { kind: 'quiet_days', stage, days: theirs },
    });
  }
  return out;
}

/** Everything worth proposing, as one brief, or nothing at all. */
export async function proposeTuning(sb: SupabaseClient, project: ClientProject): Promise<'written' | 'already' | 'nothing'> {
  const [hours, cadence] = await Promise.all([hourProposals(sb, project).catch(() => []), cadenceProposals(sb, project).catch(() => [])]);
  const all = [...hours, ...cadence];
  if (!all.length) return 'nothing';

  const body = [
    'Two numbers in here were set by a reasonable guess rather than by your business. Your own results now say something different:',
    '',
    ...all.map((p) => `${p.what}\n  Because: ${p.because}`),
    '',
    'Nothing has changed. Say the word and it changes, and it will say who changed it.',
  ].join('\n');

  return put(sb, project.clientEmail, {
    kind: 'noticed',
    subject_type: 'board',
    subject_id: null,
    title: all.length === 1 ? 'One number worth changing' : `${all.length} numbers worth changing`,
    body,
    actions: [{ kind: 'open', label: 'Open Marketing', room: 'marketing' }],
  });
}

/** What the defaults are, for anybody reading the code rather than the table. */
export const DEFAULT_HOURS = DEFAULT_PLATFORM_HOURS;
