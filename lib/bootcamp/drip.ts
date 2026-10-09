import type { SupabaseClient } from '@supabase/supabase-js';
import { BOOTCAMP } from '@/data/bootcamp';
import { sendViaResend } from '@/lib/send-email';
import { OUTREACH_FROM, OUTREACH_REPLY_TO } from '@/lib/outreach-domain';
import { SITE } from '@/lib/seo';
import { unsubscribeLink } from '@/lib/bootcamp/key';
import { STEP_TEMPLATES, type StepName } from '@/lib/bootcamp/emails';
import { firstNameOf, listDripCandidates, markSteps, recordEvent, type RegistrationRow } from '@/lib/bootcamp/store';
import { getStage, replayReady } from '@/lib/bootcamp/stage';
import type { SessionKey } from '@/lib/bootcamp/sessions';

/**
 * THE BOOTCAMP DRIP: every reminder, replay and offer, on the clock.
 *
 * Like the Celebrate drip, this is anchored to dates, not to signup. A person
 * who registers the morning of the masterclass gets the one-hour reminder and
 * nothing stale before it, because a step is only ever due inside its window:
 * from `at` to six hours after. Past the window a step is gone for good, which
 * is the right outcome for "we start in an hour" and the wrong outcome for
 * nothing in this sequence.
 *
 * Which steps a person gets depends on their tier at the moment of the run,
 * never on where they started. A masterclass seat hears the masterclass
 * reminders and then the ticket offer. A ticket holder hears the session
 * reminders and then the three doors. A cohort seat hears the session
 * reminders too (they bought the bootcamp, the seat sits above it) but never
 * the pitch for what they already own. Every send is confirmed before the
 * step is marked, so a provider blip retries on the next run of the cron and a
 * suppressed address simply stops.
 *
 * One letter per person per run. When two windows overlap (the one-hour
 * reminder still open when the replay comes due) the newest wins and the
 * older one is dropped, because a reminder for a session that already ended
 * is worse than no reminder.
 *
 * A replay letter says the replay is up, so it waits until it is: a step
 * with `replay` set leaves the schedule entirely (neither sent nor dropped)
 * until the stage desk has a replay link for that session. Its window is
 * long enough for a replay posted the next morning and short enough that it
 * never collides with the next session's reminders.
 *
 * The morning-of letter goes at 8:00 AM Mountain (five hours before every
 * 1:00 PM session) with the person's own room link, and every reminder after
 * it carries the same link, so dropping one for a newer one loses nothing.
 */

export const CAP_PER_RUN = 400;
export const WINDOW_MS = 6 * 60 * 60 * 1000;

const H = 60 * 60 * 1000;
const DAY = 24 * H;

export type Lane = 'masterclass' | 'paid' | 'operator';

export type DripStep = {
  step: StepName;
  at: number;
  lanes: Lane[];
  /** How long the step stays due. Six hours unless set. */
  window?: number;
  /** A replay letter: held until the stage has a replay link for this session. */
  replay?: SessionKey;
};

export type ScheduleOpts = {
  /** Which sessions have a replay posted. Omitted, every replay counts as ready (the test's view). */
  replayReady?: (key: SessionKey) => boolean;
};

const t = (iso: string) => new Date(iso).getTime();

/** Five hours before a 1:00 PM Mountain session is 8:00 AM Mountain. */
export const MORNING_OF_MS = 5 * H;

/** The whole schedule, computed from data/bootcamp.ts so a moved date moves every step. */
export function dripSchedule(dates: typeof BOOTCAMP.dates = BOOTCAMP.dates, opts: ScheduleOpts = {}): DripStep[] {
  const sessions: Lane[] = ['paid', 'operator'];
  const everyone: Lane[] = ['masterclass', 'paid', 'operator'];
  const steps: DripStep[] = [
    { step: 'mc-24h', at: t(dates.masterclass) - DAY, lanes: ['masterclass'] },
    { step: 'mc-live', at: t(dates.masterclass) - MORNING_OF_MS, lanes: everyone, window: MORNING_OF_MS },
    { step: 'mc-1h', at: t(dates.masterclass) - H, lanes: ['masterclass'], window: H },
    // Held for the replay link; closes before the second offer letter opens.
    { step: 'mc-replay', at: t(dates.masterclass) + 4 * H, lanes: ['masterclass'], window: 40 * H, replay: 'masterclass' },
    { step: 'mc-offer-2', at: t(dates.masterclass) + 2 * DAY, lanes: ['masterclass'] },
    { step: 'mc-offer-3', at: t(dates.masterclass) + 5 * DAY, lanes: ['masterclass'] },
    // The pre-work: from the day after the masterclass (clear of its letters and of the
    // seats bought during it) until the kickoff reminder opens, so a late buyer still gets it.
    { step: 'worksheet', at: t(dates.masterclass) + DAY, lanes: sessions, window: t(dates.kickoff) - DAY - (t(dates.masterclass) + DAY) },
    { step: 'kickoff-24h', at: t(dates.kickoff) - DAY, lanes: sessions },
    { step: 'kickoff-live', at: t(dates.kickoff) - MORNING_OF_MS, lanes: sessions, window: MORNING_OF_MS },
    { step: 'day1-24h', at: t(dates.day1) - DAY, lanes: sessions },
    { step: 'day1-live', at: t(dates.day1) - MORNING_OF_MS, lanes: sessions, window: MORNING_OF_MS },
    { step: 'day1-1h', at: t(dates.day1) - H, lanes: sessions, window: H },
    // Day 2 is two days after Day 1: the replay letter closes before the Day 2 reminder opens.
    { step: 'day1-replay', at: t(dates.day1) + 4 * H, lanes: sessions, window: 20 * H, replay: 'day1' },
    { step: 'day2-24h', at: t(dates.day2) - DAY, lanes: sessions },
    { step: 'day2-live', at: t(dates.day2) - MORNING_OF_MS, lanes: sessions, window: MORNING_OF_MS },
    { step: 'day2-1h', at: t(dates.day2) - H, lanes: sessions, window: H },
    { step: 'day2-replay', at: t(dates.day2) + 4 * H, lanes: sessions, window: 40 * H, replay: 'day2' },
    { step: 'day3-24h', at: t(dates.day3) - DAY, lanes: sessions },
    { step: 'day3-live', at: t(dates.day3) - MORNING_OF_MS, lanes: sessions, window: MORNING_OF_MS },
    { step: 'day3-1h', at: t(dates.day3) - H, lanes: sessions, window: H },
    { step: 'day3-replay', at: t(dates.day3) + 4 * H, lanes: ['paid'], window: 40 * H, replay: 'day3' },
    { step: 'day3-replay-op', at: t(dates.day3) + 4 * H, lanes: ['operator'], window: 40 * H, replay: 'day3' },
    { step: 'op-2', at: t(dates.day3) + 2 * DAY, lanes: ['paid'] },
    { step: 'op-3', at: t(dates.day3) + 5 * DAY, lanes: ['paid'] },
    // After the Day 3 replay letter closes, until the week 1 reminder opens.
    { step: 'op-worksheet', at: t(dates.day3) + 2 * DAY, lanes: ['operator'], window: t(dates.operatorStart) - DAY - (t(dates.day3) + 2 * DAY) },
    { step: 'op-start-24h', at: t(dates.operatorStart) - DAY, lanes: ['operator'] },
  ];
  const ready = opts.replayReady;
  return ready ? steps.filter((s) => !s.replay || ready(s.replay)) : steps;
}

export function laneOf(tier: string): Lane | null {
  if (tier === 'masterclass') return 'masterclass';
  if (tier === 'ga' || tier === 'vip' || tier === 'platinum') return 'paid';
  if (tier === 'operator') return 'operator';
  return null;
}

export type DueRegistration = Pick<RegistrationRow, 'tier' | 'sent_steps' | 'unsubscribed_at'>;

/**
 * Every step inside its window right now that this person has not had,
 * oldest first. Pure, so the test can pin it at fixed clocks.
 */
export function dueSteps(reg: DueRegistration, now: number, schedule: DripStep[] = dripSchedule()): StepName[] {
  if (reg.unsubscribed_at) return [];
  const lane = laneOf(reg.tier);
  if (!lane) return [];
  const sent = new Set(reg.sent_steps ?? []);
  return schedule
    .filter((s) => s.lanes.includes(lane) && !sent.has(s.step) && now >= s.at && now < s.at + (s.window ?? WINDOW_MS))
    .sort((a, b) => a.at - b.at)
    .map((s) => s.step);
}

/** The one letter to send this run: the newest due step. Older due steps are dropped with it. */
export function pickStep(reg: DueRegistration, now: number, schedule?: DripStep[]): { send: StepName; drop: StepName[] } | null {
  const due = dueSteps(reg, now, schedule);
  if (!due.length) return null;
  const send = due[due.length - 1];
  return { send, drop: due.slice(0, -1) };
}

export type DripResult = {
  scanned: number;
  sent: number;
  skipped: number;
  dryRun: boolean;
  perStep: Record<string, { due: number; sent: number; skipped: number }>;
  /** The first fifty letters that would go, or went. For the desk and for ?dry=1. */
  preview: { email: string; tier: string; step: StepName; subject: string }[];
  errors: string[];
};

export async function runBootcampDrip(
  sb: SupabaseClient | null,
  opts: { dryRun?: boolean; now?: number } = {},
): Promise<DripResult> {
  const now = opts.now ?? Date.now();
  const dryRun = Boolean(opts.dryRun);
  const result: DripResult = { scanned: 0, sent: 0, skipped: 0, dryRun, perStep: {}, preview: [], errors: [] };
  const tally = (step: string) => (result.perStep[step] ??= { due: 0, sent: 0, skipped: 0 });

  if (!sb) {
    result.errors.push('Database not configured');
    return result;
  }

  // Replay letters wait for the replay link. An unreadable stage holds them
  // all (fail closed): a late replay letter beats one that points at nothing.
  let ready: (key: SessionKey) => boolean = () => false;
  try {
    const stage = await getStage(sb);
    ready = (key) => replayReady(stage, key);
  } catch (err) {
    result.errors.push(`stage unreadable, replay letters held: ${err instanceof Error ? err.message : String(err)}`);
  }
  const schedule = dripSchedule(BOOTCAMP.dates, { replayReady: ready });
  const rows = await listDripCandidates(sb, BOOTCAMP.launch);
  result.scanned = rows.length;

  for (const reg of rows) {
    if (result.sent >= CAP_PER_RUN) break;

    const pick = pickStep(reg, now, schedule);
    if (!pick) continue;

    // A dropped step is a window that closed on this person while a newer one
    // opened. Mark it so the desk can see it was skipped on purpose, not lost.
    for (const d of pick.drop) {
      tally(d).due += 1;
      tally(d).skipped += 1;
    }

    const step = pick.send;
    tally(step).due += 1;

    const unsubscribeUrl = unsubscribeLink(SITE.url, reg.id);
    if (!unsubscribeUrl) {
      // No ADMIN_SESSION_SECRET means no signed unsubscribe link, and a drip
      // without an unsubscribe link does not leave the building.
      tally(step).skipped += 1;
      result.skipped += 1;
      if (!result.errors.includes('unsubscribe link unavailable')) result.errors.push('unsubscribe link unavailable');
      continue;
    }

    const letter = STEP_TEMPLATES[step]({
      email: reg.email,
      firstName: reg.first_name ?? firstNameOf(reg.name),
      regId: reg.id,
      tier: reg.tier,
      unsubscribeUrl,
    });

    if (result.preview.length < 50) result.preview.push({ email: reg.email, tier: reg.tier, step, subject: letter.subject });
    if (dryRun) continue;

    const send = await sendViaResend({
      from: OUTREACH_FROM,
      to: reg.email,
      replyTo: OUTREACH_REPLY_TO,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
      mailbox: OUTREACH_REPLY_TO,
      unsubscribeUrl,
    });

    if (!send.ok) {
      console.error(`bootcamp drip ${step} failed for ${reg.email}: ${send.error}`);
      tally(step).skipped += 1;
      result.skipped += 1;
      continue;
    }

    // Confirmed by the provider, and only now. Dropped steps are marked too
    // so a later run with a wider clock cannot resurrect them.
    try {
      await markSteps(sb, reg.id, [step, ...pick.drop]);
      await recordEvent(sb, `drip:${step}`, {
        email: reg.email,
        registrationId: reg.id,
        hostSlug: reg.host_slug,
        detail: { subject: letter.subject, id: send.id, dropped: pick.drop },
      });
    } catch (err) {
      result.errors.push(`${reg.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
    tally(step).sent += 1;
    result.sent += 1;
  }

  return result;
}
