/**
 * WHO ASKED FOR A DEMO.
 *
 * There are two jobs to do for these people, building the suite and mailing
 * it, and for a while there were two definitions of who they are. That is the
 * same fault the outbound governor was built to end: a system with two sets of
 * rules has no rules. So the definition lives here once, and both
 * scripts/acq-build-for-askers.mts and scripts/acq-send-late-suites.mts read
 * it.
 *
 * An asker is somebody who reached for this themselves: built one at the demo
 * station or the self-serve build page, clicked "the free build" or "the
 * Talking Website" in a campaign email, gave consent to be called, or talked
 * to Mr. Mustard. A prospect Sarah built for proactively from the board did
 * NOT ask, and neither script ever touches them; the board's own send button
 * is for those.
 *
 * WHAT THEY ASKED FOR is a website and a voice agent (Sarah, 2026-09-10:
 * "give what they wanted, which was mostly already made, website and voice
 * agent"). A suite missing either one is incomplete, however good the half
 * that exists is.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AcqProspect } from '@/lib/acq/types';

/** Lead sources that mean the person came to us. */
export const ASKED_SOURCES = ['demo-station', 'mms-demo-build', 'mr-mustard'] as const;

/**
 * Timeline events that mean a person reached for a demo or a call.
 *
 * Machine hits are filtered out separately. Four in five recorded clicks are
 * mail security software, and a scanner has never wanted a website.
 */
export const ASKED_EVENTS = [
  'forge_requested',
  'consent_captured',
  'reply',
  'link_clicked',
  'permission_visited',
  'call_inbound',
  'meeting_booked',
] as const;

/**
 * The studio's own addresses. Sarah, Anthony and the family have driven the
 * demo station many times and every one of those rows looks exactly like a
 * prospect who asked. None of them is a customer to mail.
 */
export const OURS = /makeourcitypretty|wildhopehouse|fiatluxdesign84|theclawconcierge|bizyai2023|bellavalentina22|@modernmustardseed\.com$/i;

/** An address that is a placeholder rather than a mailbox. */
export const PLACEHOLDER = /@example\.|unknown@|@\.com$|yourbusiness|@company\.site|safeguarding@|^abuse@|@fairpoint\.net$/i;

export type AskerLead = AcqProspect & {
  suite_film_status?: string | null;
  status?: string | null;
  is_test?: boolean;
};

export type Asker = {
  lead: AskerLead;
  /** Why we say they asked, in words, for the console and the timeline. */
  why: string[];
  /** The pieces they wanted and do not have. */
  missing: ('voice' | 'site')[];
  /** A website build is queued or running for them right now. */
  building: boolean;
  /** The last website build failed and is waiting on a retry. */
  failed: boolean;
  /** Everything they asked for exists and can be opened. */
  complete: boolean;
  /**
   * What they have been mailed.
   *   never   nothing has gone
   *   partial a suite went, and a piece has landed since that was not in it
   *   full    a suite went and nothing has landed since
   */
  sent: 'never' | 'partial' | 'full';
};

export type AskerReport = {
  askers: Asker[];
  /** Rows that matched but must never be mailed, each with the reason. */
  skipped: { name: string; reason: string }[];
};

/**
 * THE WHOLE ROW, ALWAYS.
 *
 * The governor reads email_status, email_source and email_confidence off the
 * lead to decide whether the address is mailable. A narrower select once fed
 * it four blanks, which read as Tier HOLD, and it refused four verified
 * addresses (2026-09-09). Nothing here selects columns by name.
 */
const COLS = '*';

/** Machine traffic never counts as a person asking. */
function isHuman(e: { label: string; detail: Record<string, unknown> | null }): boolean {
  if (e.detail && e.detail.machine === true) return false;
  return !/scanner|security|gateway/i.test(e.label);
}

/**
 * Everyone who asked, with what they have and what they are owed.
 *
 * `includeSent` keeps the people who already have their suite, which the send
 * script needs so it can spot a website that landed after the email went.
 */
export async function findAskers(db: SupabaseClient, opts: { only?: string } = {}): Promise<AskerReport> {
  /* ── by the lead row: consent, a completed call, or a source that means they came to us ── */
  const { data: byRow, error } = await db
    .from('outbound_leads')
    .select(COLS)
    .is('unsubscribed_at', null)
    .or(`consent_status.eq.granted,call_stage.eq.completed,source.in.(${ASKED_SOURCES.join(',')})`)
    .limit(2000);
  if (error) throw new Error(`Could not read the leads: ${error.message}`);

  /* ── by the timeline: a human clicked, consented, replied or rang ── */
  const { data: events } = await db
    .from('acq_events')
    .select('lead_id,type,label,detail,occurred_at')
    .in('type', [...ASKED_EVENTS])
    .order('occurred_at', { ascending: false })
    .limit(5000);
  const human = ((events ?? []) as { lead_id: string | null; type: string; label: string; detail: Record<string, unknown> | null; occurred_at: string }[])
    .filter((e) => e.lead_id && isHuman(e));

  const signals = new Map<string, string[]>();
  for (const e of human) {
    const list = signals.get(e.lead_id as string) ?? [];
    // One line per kind, with the day. Five identical clicks is one signal.
    const line = `${e.type.replace(/_/g, ' ')} ${e.occurred_at.slice(0, 10)}`;
    if (!list.includes(line)) list.push(line);
    signals.set(e.lead_id as string, list);
  }

  const eventIds = [...signals.keys()];
  const byEvent: AskerLead[] = [];
  for (let i = 0; i < eventIds.length; i += 40) {
    const { data } = await db.from('outbound_leads').select(COLS).in('id', eventIds.slice(i, i + 40)).is('unsubscribed_at', null);
    byEvent.push(...((data ?? []) as AskerLead[]));
  }

  const leads = new Map<string, AskerLead>();
  for (const l of [...((byRow ?? []) as AskerLead[]), ...byEvent]) leads.set(l.id, l);

  /*
   * ── what has ALREADY been mailed, from both records ──
   *
   * `demo_emailed_at` on the lead is one record. The suite-ready hook keeps
   * another: a `messages` row titled "Demo suite emailed", which is its own
   * dedupe key. Between 2026-07-30 and 2026-09-09 the hook wrote only the
   * second one, so fifty-three people who have their suite still read as
   * never mailed until scripts/acq-backfill-suite-sent.mts is run.
   *
   * Reading one record and not the other is exactly how four prospects were
   * sent the same suite three times on 2026-09-03. So this reads both and
   * takes the earlier, and it keeps working whether or not the backfill has
   * been run.
   */
  const { data: announcements } = await db
    .from('messages')
    .select('outbound_lead_id,occurred_at')
    .eq('subject', 'Demo suite emailed');
  const announcedAt = new Map<string, string>();
  for (const m of ((announcements ?? []) as { outbound_lead_id: string | null; occurred_at: string }[])) {
    if (!m.outbound_lead_id) continue;
    const prior = announcedAt.get(m.outbound_lead_id);
    if (!prior || m.occurred_at < prior) announcedAt.set(m.outbound_lead_id, m.occurred_at);
  }

  /* ── the website build rows, so "landed after the email" is a fact and not a guess ── */
  const siteIds = [...leads.values()].map((l) => l.site_demo_id).filter((v): v is string => Boolean(v));
  const builtAt = new Map<string, string | null>();
  for (let i = 0; i < siteIds.length; i += 40) {
    const { data } = await db.from('outbound_demo_sites').select('id,built_at').in('id', siteIds.slice(i, i + 40));
    for (const r of (data ?? []) as { id: string; built_at: string | null }[]) builtAt.set(r.id, r.built_at);
  }

  const askers: Asker[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const lead of [...leads.values()].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    // `only` is a comma separated list of name fragments, so a run can be
    // aimed at a few named businesses. Order matters when each website is
    // half an hour of the build queue: the first ones named go first.
    if (opts.only) {
      const wanted = opts.only.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!wanted.some((w) => lead.business_name.toLowerCase().includes(w))) continue;
    }

    const skip = (reason: string) => skipped.push({ name: lead.business_name, reason });
    if (lead.is_test) { skip('test row'); continue; }
    if (!lead.email) { skip('no email address'); continue; }
    if (PLACEHOLDER.test(lead.email)) { skip(`placeholder address ${lead.email}`); continue; }
    if (OURS.test(lead.email)) { skip(`one of ours (${lead.email})`); continue; }
    if (lead.client_status === 'client') { skip('already a client'); continue; }
    if (lead.unsubscribed_at) { skip('they opted out'); continue; }

    const siteReady = lead.site_demo_status === 'ready' && Boolean(lead.site_demo_url);
    const building = lead.site_demo_status === 'queued' || lead.site_demo_status === 'building';
    const failed = lead.site_demo_status === 'failed';

    const missing: ('voice' | 'site')[] = [];
    if (!lead.demo_url) missing.push('voice');
    if (!siteReady) missing.push('site');

    // A piece that landed after the email went is news they have not had.
    // Whichever record is older is when they actually heard from us.
    const stamps = [lead.demo_emailed_at, announcedAt.get(lead.id)].filter((v): v is string => Boolean(v)).map((v) => Date.parse(v));
    const emailedAt = stamps.length ? Math.min(...stamps) : NaN;
    const siteBuiltAt = lead.site_demo_id ? Date.parse(builtAt.get(lead.site_demo_id) ?? '') : NaN;
    const siteIsNews = siteReady && Number.isFinite(emailedAt) && Number.isFinite(siteBuiltAt) && siteBuiltAt > emailedAt;

    askers.push({
      lead,
      why: [
        lead.consent_status === 'granted' ? 'gave consent to be called' : null,
        lead.call_stage === 'completed' ? 'talked to Mr. Mustard' : null,
        lead.source && (ASKED_SOURCES as readonly string[]).includes(lead.source) ? `came in through ${lead.source}` : null,
        ...(signals.get(lead.id) ?? []),
      ].filter((x): x is string => Boolean(x)),
      missing,
      building,
      failed,
      complete: missing.length === 0,
      sent: !Number.isFinite(emailedAt) ? 'never' : siteIsNews ? 'partial' : 'full',
    });
  }

  return { askers, skipped };
}

/** One readable line naming what a person can open today. */
export function piecesOf(a: Asker): string {
  const l = a.lead;
  return (
    [
      l.demo_url ? 'receptionist' : null,
      l.site_demo_status === 'ready' && l.site_demo_url ? 'website' : l.site_demo_status ? `website ${l.site_demo_status}` : 'no website',
      l.suite_film_status === 'ready' ? 'film' : null,
    ]
      .filter(Boolean)
      .join(' + ') || 'nothing'
  );
}
