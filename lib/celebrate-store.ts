/**
 * THE CELEBRATE WAITLIST, durable on the existing app_state key/value table
 * (migration 030, live in prod), so the pre-launch funnel ships with real drip
 * state and zero new DDL.
 *
 * Keys:
 *   celebrate:wl:<lowercased email>   one row per person, forever
 *
 * WHY NOT THE `leads` TABLE. The lead row still gets written (the pipeline and
 * the admin inbox are built on it, and Sarah works leads there), but a lead row
 * cannot hold drip state: it has no step counter, no last-sent stamp, and its
 * `notes` column belongs to whoever is working the lead by hand. State that a
 * cron advances must never live in a column a human edits. So the lead is the
 * pipeline record and this is the machine record, keyed by email so a repeat
 * signup enriches one person instead of forking into two.
 *
 * The text primary key does the deduping for free. Someone who joins from the
 * countdown band and again from the parade builder is one entry with a merged
 * parade, not two people who both get six letters.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CelebrateAudience } from '@/data/celebrate';

export type CelebrateEntry = {
  email: string;
  business: string | null;
  audience: CelebrateAudience;
  /** Free text as typed. Drives the vendor-route demand map, not a validated field. */
  city: string | null;
  /** The parade they built, as "Name · MAR 14 · Birthday" strings. May be empty. */
  people: string[];
  /** Which surface captured them: 'countdown' or 'parade'. */
  surface: string;
  createdAt: string;
  /** Next drip touch to send. Equals the touch count when the sequence is finished. */
  step: number;
  /** ISO stamp of the last CONFIRMED send. Seeded to createdAt so spacing works from touch one. */
  lastAt: string;
  /** Set when a human closes the file: booked, bought, or asked to be left alone. */
  done: boolean;
  /** Why the file was closed, for the admin view. */
  doneReason?: string;
};

const PREFIX = 'celebrate:wl:';
export const waitlistKey = (email: string) => `${PREFIX}${email.trim().toLowerCase()}`;

type Row = { key: string; value: CelebrateEntry };

/**
 * Record or enrich one signup. Read-then-write rather than a blind upsert: a
 * second visit must not reset `step` to zero and re-run the whole sequence, and
 * must not wipe a parade they built on their first visit.
 *
 * Returns the stored entry and whether this was their first time.
 */
export async function saveWaitlistEntry(
  sb: SupabaseClient,
  input: {
    email: string;
    business?: string | null;
    audience: CelebrateAudience;
    city?: string | null;
    people?: string[];
    surface: string;
  }
): Promise<{ entry: CelebrateEntry; isNew: boolean }> {
  const email = input.email.trim().toLowerCase();
  const key = waitlistKey(email);
  const now = new Date().toISOString();

  const { data } = await sb.from('app_state').select('value').eq('key', key).maybeSingle();
  const prior = (data?.value as CelebrateEntry | undefined) ?? null;

  // Merge, never clobber. Later submissions add what they know and leave the
  // rest of the file alone. A longer parade wins, because the only way to get a
  // longer one is to have built it.
  const entry: CelebrateEntry = {
    email,
    business: input.business?.trim() || prior?.business || null,
    audience: input.audience || prior?.audience || 'team',
    city: input.city?.trim() || prior?.city || null,
    people: (input.people?.length ?? 0) >= (prior?.people?.length ?? 0) ? (input.people ?? []) : (prior?.people ?? []),
    surface: prior?.surface ?? input.surface,
    createdAt: prior?.createdAt ?? now,
    step: prior?.step ?? 0,
    lastAt: prior?.lastAt ?? now,
    done: prior?.done ?? false,
    ...(prior?.doneReason ? { doneReason: prior.doneReason } : {}),
  };

  const { error } = await sb.from('app_state').upsert({ key, value: entry });
  if (error) {
    console.error('celebrate waitlist save failed', email, error.message);
    throw new Error(error.message);
  }
  return { entry, isNew: !prior };
}

/** Every waitlist entry, newest first. The list is small by design; the cap is a backstop. */
export async function listWaitlist(sb: SupabaseClient, limit = 1000): Promise<CelebrateEntry[]> {
  const { data, error } = await sb
    .from('app_state')
    .select('key, value')
    .like('key', `${PREFIX}%`)
    .limit(limit);
  if (error) {
    console.error('celebrate waitlist read failed', error.message);
    return [];
  }
  return ((data ?? []) as Row[])
    .map((r) => r.value)
    .filter((v): v is CelebrateEntry => Boolean(v?.email))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Advance the sequence. Called ONLY after a send the provider confirmed, so a
 * suppressed address or a provider blip leaves the pointer where it was and the
 * touch retries on the next run instead of being silently skipped.
 */
export async function advanceStep(sb: SupabaseClient, entry: CelebrateEntry, toStep: number): Promise<void> {
  const next: CelebrateEntry = { ...entry, step: toStep, lastAt: new Date().toISOString() };
  const { error } = await sb.from('app_state').upsert({ key: waitlistKey(entry.email), value: next });
  if (error) console.error('celebrate waitlist advance failed', entry.email, error.message);
}

/** Close a file so the drip stops touching it. Booked, bought, or bowed out. */
export async function closeWaitlistEntry(sb: SupabaseClient, email: string, reason: string): Promise<boolean> {
  const key = waitlistKey(email);
  const { data } = await sb.from('app_state').select('value').eq('key', key).maybeSingle();
  const prior = data?.value as CelebrateEntry | undefined;
  if (!prior) return false;
  const { error } = await sb
    .from('app_state')
    .upsert({ key, value: { ...prior, done: true, doneReason: reason } satisfies CelebrateEntry });
  if (error) {
    console.error('celebrate waitlist close failed', email, error.message);
    return false;
  }
  return true;
}

export type WaitlistCounts = {
  total: number;
  team: number;
  family: number;
  withParade: number;
  /** Signups in the last seven days, the only growth number worth watching pre-launch. */
  last7: number;
  /** Demand by city, biggest first. This is how the second vendor route gets picked. */
  cities: { city: string; count: number }[];
};

export function waitlistCounts(entries: CelebrateEntry[]): WaitlistCounts {
  const weekAgo = Date.now() - 7 * 86400000;
  const cities = new Map<string, number>();
  for (const e of entries) {
    const c = (e.city ?? '').trim();
    if (c) cities.set(c, (cities.get(c) ?? 0) + 1);
  }
  return {
    total: entries.length,
    team: entries.filter((e) => e.audience === 'team').length,
    family: entries.filter((e) => e.audience === 'family').length,
    withParade: entries.filter((e) => e.people.length > 0).length,
    last7: entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length,
    cities: [...cities.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20),
  };
}
