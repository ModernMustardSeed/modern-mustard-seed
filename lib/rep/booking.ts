import { getSupabase } from '@/lib/supabase';
import { cancelPendingFor } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';

/**
 * The Rep's booking links read /book?r=<outbound_leads.id>. When a prospect
 * books from one, the booking lands on their row: meeting status, meeting time,
 * the acquisition stage, a meeting_booked event the scoreboard counts, and a
 * stop on anything still queued to chase them.
 *
 * Never writes `status`. `contacted` is a human mark only, and a self-booking
 * is not a person reaching the lead.
 *
 * Best effort by design: a failure here must never cost the visitor their
 * booking. Returns null when the ref is missing, malformed or unknown.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function noteRepBooking(
  ref: unknown,
  booking: { startIso: string; name: string; email: string; business: string },
): Promise<{ business: string; channel: string } | null> {
  if (typeof ref !== 'string' || !UUID.test(ref)) return null;
  try {
    const sb = getSupabase();
    if (!sb) return null;
    const { data: lead } = await sb
      .from('outbound_leads')
      .select('id,business_name,city,state,last_dm_at')
      .eq('id', ref)
      .maybeSingle();
    if (!lead) return null;

    await sb
      .from('outbound_leads')
      .update({ meeting_status: 'booked', meeting_at: booking.startIso, acq_stage: 'meeting', needs_human: null })
      .eq('id', lead.id);
    await cancelPendingFor(sb, lead.id, ['email', 'followup'], 'They booked Sarah. Sales chasing stops.');

    const { data: last } = await sb
      .from('acq_events')
      .select('detail')
      .eq('lead_id', lead.id)
      .eq('type', 'rep')
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const channel = String((last?.detail as { channel?: string } | null)?.channel ?? 'a direct message');

    await recordEvent(sb, {
      leadId: lead.id,
      type: 'meeting_booked',
      label: `Booked Sarah for ${booking.startIso} from the Rep`,
      detail: { startIso: booking.startIso, rep: true, channel, name: booking.name, email: booking.email },
    });
    const place = [lead.city, lead.state].filter(Boolean).join(', ');
    return { business: `${lead.business_name ?? booking.business}${place ? ` (${place})` : ''}`, channel };
  } catch (err) {
    console.error('rep booking note failed', err);
    return null;
  }
}
