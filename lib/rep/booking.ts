import { getSupabase } from '@/lib/supabase';
import { cancelPendingFor } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';
import { queueProspectSite } from '@/lib/acq/suite';
import type { AcqProspect } from '@/lib/acq/types';

/**
 * The Rep's booking links read /book?r=<outbound_leads.id>. When a prospect
 * books from one, the booking lands on their row: meeting status, meeting time,
 * the acquisition stage, a meeting_booked event the scoreboard counts, and a
 * stop on anything still queued to chase them.
 *
 * It also queues their website mockup on the demo build worker, so Sarah walks
 * into the call with their homepage already rebuilt. /book holds an 18 hour
 * minimum lead time and a build takes under an hour, so it is ready first. The
 * suite-ready hook skips booked prospects: Sarah shows it on the call.
 *
 * Never writes `status`. `contacted` is a human mark only, and a self-booking
 * is not a person reaching the lead.
 *
 * Best effort by design: a failure here must never cost the visitor their
 * booking. Returns null when the ref is missing, malformed or unknown.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RepBooking = {
  business: string;
  channel: string;
  /** What ChatGPT answered when the Rep asked the customer's question. */
  aiAnswer: { engine: string; question: string; named: string[]; included: boolean; checkedAt: string } | null;
  mockup: string;
};

type RepDetail = { kind?: string; channel?: string; question?: string; named?: string[]; included?: boolean };

export async function noteRepBooking(
  ref: unknown,
  booking: { startIso: string; name: string; email: string; business: string },
): Promise<RepBooking | null> {
  if (typeof ref !== 'string' || !UUID.test(ref)) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: row } = await sb.from('outbound_leads').select('*').eq('id', ref).maybeSingle();
    if (!row) return null;
    const lead = row as AcqProspect;

    await sb
      .from('outbound_leads')
      .update({ meeting_status: 'booked', meeting_at: booking.startIso, acq_stage: 'meeting', needs_human: null })
      .eq('id', lead.id);
    await cancelPendingFor(sb, lead.id, ['email', 'followup'], 'They booked Sarah. Sales chasing stops.');

    const { data: events } = await sb
      .from('acq_events')
      .select('detail,occurred_at')
      .eq('lead_id', lead.id)
      .eq('type', 'rep')
      .order('occurred_at', { ascending: false })
      .limit(40);
    const rep = (events ?? []) as { detail: RepDetail; occurred_at: string }[];
    // An ai_check event's channel is the engine asked, not where they were messaged.
    const channel = rep.find((e) => e.detail?.channel && e.detail.kind !== 'ai_check')?.detail.channel ?? 'a direct message';
    const check = rep.find((e) => e.detail?.kind === 'ai_check');
    const aiAnswer = check
      ? {
          engine: check.detail.channel === 'google' ? "Google's AI Mode" : 'ChatGPT',
          question: String(check.detail.question ?? ''),
          named: Array.isArray(check.detail.named) ? check.detail.named.map(String) : [],
          included: Boolean(check.detail.included),
          checkedAt: check.occurred_at,
        }
      : null;

    let mockup = 'not queued';
    try {
      const queued = await queueProspectSite(sb, { ...lead, meeting_status: 'booked' });
      mockup = queued.ok
        ? `${queued.queued ? 'queued on the build worker' : queued.note}: ${queued.siteUrl}`
        : `not queued: ${queued.error}`;
    } catch (err) {
      mockup = `not queued: ${err instanceof Error ? err.message : 'unknown error'}`;
    }

    await recordEvent(sb, {
      leadId: lead.id,
      type: 'meeting_booked',
      label: `Booked Sarah for ${booking.startIso} from the Rep`,
      detail: { startIso: booking.startIso, rep: true, channel, name: booking.name, email: booking.email, mockup },
    });
    const place = [lead.city, lead.state].filter(Boolean).join(', ');
    return { business: `${lead.business_name ?? booking.business}${place ? ` (${place})` : ''}`, channel, aiAnswer, mockup };
  } catch (err) {
    console.error('rep booking note failed', err);
    return null;
  }
}
