/**
 * WHO ACTUALLY MOVED, reduced to one row per prospect.
 *
 * The Who Is Moving board renders the full story: every signal, the consent
 * record, the call, the live feed. The Build board needs one much smaller
 * answer about the same events, asked thousands of times: did a PERSON open,
 * click, or reach the permission page, and when was the last one.
 *
 * Both read the same rows through this file so they can never disagree about
 * who counts as engaged. That matters more here than anywhere else in the
 * engine, because on 2026-08-19 the campaign's "clicks" turned out to be mail
 * security gateways following the link on the recipient's behalf. A board that
 * counts antivirus as interest sends demos to nobody and reports a great week
 * doing it, so the machine filter is applied HERE, once, rather than trusted to
 * every caller.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { ENGAGEMENT_TYPES } from '@/lib/acq/events';
import type { AcqEvent } from '@/lib/acq/types';

/** How far back the boards look by default. Ninety days of campaign memory. */
export const ENGAGEMENT_WINDOW_DAYS = 90;

/** Hard ceiling on rows pulled in one read, so a busy month cannot stall a page. */
export const ENGAGEMENT_ROW_CAP = 8000;

/**
 * Read the engagement timeline, newest first, paging past PostgREST's 1000-row
 * ceiling. `since` is an ISO stamp or null for all of time.
 */
export async function readEngagementEvents(
  db: SupabaseClient,
  since: string | null,
  cap = ENGAGEMENT_ROW_CAP,
): Promise<AcqEvent[]> {
  const out: AcqEvent[] = [];
  for (let from = 0; from < cap; from += 1000) {
    let q = db
      .from('acq_events')
      .select('*')
      .in('type', ENGAGEMENT_TYPES)
      .order('occurred_at', { ascending: false })
      .range(from, from + 999);
    if (since) q = q.gte('occurred_at', since);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as AcqEvent[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** True when this event was software following a link, not a person clicking it. */
export function isMachineHit(e: Pick<AcqEvent, 'detail'>): boolean {
  return (e.detail as Record<string, unknown> | null)?.machine === true;
}

/** What one prospect did, on their side, reduced to the flags a board needs. */
export type Movement = {
  /** They opened at least one campaign email. */
  opened: boolean;
  /** They clicked a call-to-action in one. */
  clicked: boolean;
  /** They reached the permission page: the sharpest intent short of consenting. */
  visitedDoor: boolean;
  /** They wrote back. */
  replied: boolean;
  /** The most recent human signal of any kind. */
  lastAt: string | null;
  /** How many human signals in total. */
  hits: number;
};

const EMPTY: Movement = { opened: false, clicked: false, visitedDoor: false, replied: false, lastAt: null, hits: 0 };

export function blankMovement(): Movement {
  return { ...EMPTY };
}

/**
 * Fold the timeline into one Movement per prospect. Machine hits are dropped
 * here and nowhere else.
 */
export function foldMovement(events: AcqEvent[]): Map<string, Movement> {
  const out = new Map<string, Movement>();
  for (const e of events) {
    if (!e.lead_id || isMachineHit(e)) continue;
    let m = out.get(e.lead_id);
    if (!m) {
      m = blankMovement();
      out.set(e.lead_id, m);
    }
    switch (e.type) {
      case 'email_opened':
        m.opened = true;
        break;
      case 'link_clicked':
        m.clicked = true;
        break;
      case 'permission_visited':
        m.visitedDoor = true;
        break;
      case 'reply':
        m.replied = true;
        break;
      default:
        // Consents, calls and purchases are read off the prospect row, which is
        // authoritative and never expires out of the window.
        continue;
    }
    m.hits += 1;
    if (!m.lastAt || e.occurred_at > m.lastAt) m.lastAt = e.occurred_at;
  }
  return out;
}

/**
 * One call: read the window and fold it. The map is keyed by prospect id and
 * holds only prospects who did something a person can do.
 */
export async function readMovement(
  db: SupabaseClient,
  opts: { days?: number | null; cap?: number } = {},
): Promise<Map<string, Movement>> {
  const days = opts.days === undefined ? ENGAGEMENT_WINDOW_DAYS : opts.days;
  const since = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
  return foldMovement(await readEngagementEvents(db, since, opts.cap ?? ENGAGEMENT_ROW_CAP));
}
