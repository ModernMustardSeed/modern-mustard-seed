/**
 * THE PER-MEMBER AI CREDIT METER.
 *
 * `HUNDREDFOLD.monthlyAiCreditCents` has been a number and a policy since the
 * day it was written, with nothing enforcing it. Sarah removed the seat cap on
 * 2026-08-07, which moved the risk from "can Sarah serve them" to "does a
 * member cost more in model calls than they pay". This module is the answer to
 * that question, and it is the only thing standing between the arsenal and a
 * member who discovers they can press a button that spends our money.
 *
 * ⚠️ FAILS CLOSED, in three separate places, because a meter that guesses low
 * is worse than no meter at all ([[feedback_never_leak_revenue]]):
 *
 *   1. Every price here ROUNDS UP and uses LIST rates, never the introductory
 *      or discounted ones. If the real bill is lower, the member got more than
 *      we charged them for, which is the direction we want to be wrong in.
 *   2. An UNREADABLE ledger is treated as OVER budget, not under. A database
 *      hiccup pauses the factory rather than opening the tap.
 *   3. The check happens BEFORE the work runs, against the estimate, and the
 *      actual cost is written after. A build that would cross the line queues
 *      to the next cycle instead of running and apologising.
 *
 * Nothing here bills the member. Past the cap the queue slips, exactly as the
 * offer copy promises.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { HUNDREDFOLD } from './hundredfold';

/* -------------------------------------------------------------------------- */
/* What things cost                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Anthropic LIST prices, in cents per MILLION tokens (verified 2026-08-07).
 *
 * ⚠️ Sonnet 5 carries an introductory rate ($2/$10) through 2026-08-31. This
 * table deliberately uses the FULL rate, so the meter keeps telling the truth
 * on 2026-09-01 without anybody remembering to come back and change it.
 */
const MODEL_RATES: Record<string, { inPerM: number; outPerM: number }> = {
  'claude-opus-5': { inPerM: 500, outPerM: 2500 },
  'claude-sonnet-5': { inPerM: 300, outPerM: 1500 },
  'claude-haiku-4-5': { inPerM: 100, outPerM: 500 },
};

/** An unknown model is charged at the most expensive rate we know. Fails closed. */
const FALLBACK_RATE = { inPerM: 500, outPerM: 2500 };

/** Cache reads are ~0.1x input; a 5 minute cache write is ~1.25x input. */
const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

/**
 * One fal still, rounded UP from the ~$0.03 Seedream v4 charges. The rounding
 * is the guard: an image generator that runs in a loop is exactly how a $400
 * ceiling gets discovered the expensive way.
 */
export const FAL_IMAGE_CENTS = 4;

export type ClaudeUsage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

/** Cost of one Claude call, in whole cents, always rounded up. */
export function claudeCostCents(model: string, usage: ClaudeUsage | null | undefined): number {
  if (!usage) return 0;
  const rate = MODEL_RATES[model] ?? FALLBACK_RATE;
  const inTok = usage.input_tokens ?? 0;
  const outTok = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;

  const cents =
    (inTok * rate.inPerM +
      outTok * rate.outPerM +
      cacheRead * rate.inPerM * CACHE_READ_MULTIPLIER +
      cacheWrite * rate.inPerM * CACHE_WRITE_MULTIPLIER) /
    1_000_000;

  // Ceil, so a sub-cent call still costs a cent. Ten thousand free calls is
  // exactly the leak this exists to close.
  return Math.ceil(cents);
}

/* -------------------------------------------------------------------------- */
/* The cycle                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The member's current billing month, anchored on the day they started.
 *
 * NOT the calendar month: a member who joins on the 28th would otherwise get a
 * full allowance for three days and then a fresh one, which is a hole big
 * enough to drive the whole cap through.
 */
export function cycleStart(anchorISO: string | null, now = new Date()): Date {
  const anchor = anchorISO ? new Date(anchorISO) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) {
    // No anchor: fall back to the calendar month rather than to "forever".
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const day = anchor.getUTCDate();
  const h = anchor.getUTCHours();
  const mi = anchor.getUTCMinutes();

  /**
   * The anniversary in a given month, clamped to that month's length so a member
   * anchored on the 31st still gets exactly one boundary in February.
   *
   * ⚠️ Built fresh with Date.UTC rather than mutated with setUTCMonth. Stepping
   * a Date sitting on the 31st back one month rolls it FORWARD (Feb 31 becomes
   * March 3), which silently hands that member a second allowance. Date.UTC
   * also handles month -1 as December of the previous year, so the year needs
   * no special case either.
   */
  const at = (year: number, month: number) => {
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(day, daysInMonth), h, mi));
  };

  let candidate = at(now.getUTCFullYear(), now.getUTCMonth());
  if (candidate > now) candidate = at(now.getUTCFullYear(), now.getUTCMonth() - 1);

  // Never report a cycle that starts before they did.
  return candidate < anchor ? anchor : candidate;
}

/* -------------------------------------------------------------------------- */
/* The meter                                                                   */
/* -------------------------------------------------------------------------- */

export type Meter = {
  capCents: number;
  spentCents: number;
  remainingCents: number;
  cycleStart: string;
  cycleEnd: string;
  /** True when the ledger could not be read. Callers must treat it as over. */
  unreadable: boolean;
};

export async function readMeter(
  sb: SupabaseClient,
  member: { id: string; started_at: string | null; created_at?: string },
  now = new Date()
): Promise<Meter> {
  const start = cycleStart(member.started_at ?? member.created_at ?? null, now);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const base = {
    capCents: HUNDREDFOLD.monthlyAiCreditCents,
    cycleStart: start.toISOString(),
    cycleEnd: end.toISOString(),
  };

  const { data, error } = await sb
    .from('hundredfold_spend')
    .select('cents')
    .eq('member_id', member.id)
    .gte('at', start.toISOString())
    .limit(5000);

  if (error) {
    // ⚠️ FAILS CLOSED. An unreadable ledger reports the cap as fully spent, so
    // the factory pauses instead of running blind. This is the same posture as
    // SuppressionReadError in the mail path: refuse, do not assume.
    console.error('hundredfold-credit: ledger unreadable, failing closed', error.message);
    return { ...base, spentCents: HUNDREDFOLD.monthlyAiCreditCents, remainingCents: 0, unreadable: true };
  }

  const spent = (data ?? []).reduce((sum, row) => sum + (Number(row.cents) || 0), 0);
  return {
    ...base,
    spentCents: spent,
    remainingCents: Math.max(0, HUNDREDFOLD.monthlyAiCreditCents - spent),
    unreadable: false,
  };
}

/**
 * May this build run right now?
 *
 * Checked against the ESTIMATE before any work starts. A build whose estimate
 * does not fit is not half-run and abandoned, it simply waits for the next
 * cycle, which is what the offer promises out loud.
 */
export async function affords(
  sb: SupabaseClient,
  member: { id: string; started_at: string | null; created_at?: string },
  estimateCents: number
): Promise<{ ok: true; meter: Meter } | { ok: false; meter: Meter; reason: string }> {
  const meter = await readMeter(sb, member);
  if (meter.unreadable) {
    return { ok: false, meter, reason: 'The credit meter could not be read, so nothing was run. Try again shortly.' };
  }
  if (estimateCents > meter.remainingCents) {
    return {
      ok: false,
      meter,
      reason: `This cycle's included AI work is spent. This build queues to the cycle that starts ${new Date(
        meter.cycleEnd
      ).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Nothing was charged.`,
    };
  }
  return { ok: true, meter };
}

/** Write one line to the ledger. The ONLY thing the meter reads. */
export async function recordSpend(
  sb: SupabaseClient,
  input: {
    memberId: string;
    systemId?: string | null;
    source: 'fal-image' | 'claude' | 'manual';
    kind?: string | null;
    cents: number;
    note?: string;
  }
): Promise<void> {
  if (input.cents <= 0) return;
  const { error } = await sb.from('hundredfold_spend').insert({
    member_id: input.memberId,
    system_id: input.systemId ?? null,
    source: input.source,
    kind: input.kind ?? null,
    cents: Math.ceil(input.cents),
    note: input.note ?? null,
  });
  // A failed ledger write is a real problem: the work happened and nothing
  // recorded it. Loud, because a silent one under-counts every later check.
  if (error) console.error('hundredfold-credit: SPEND NOT RECORDED', input, error.message);
}
