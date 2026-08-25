/**
 * SARAH FINDS OUT THE MOMENT SOMEBODY BOOKS ON A DEMO.
 *
 * Sarah, 2026-08-25: "def needs to be known if i have a demo booking or cal or
 * anything!!!"
 *
 * ── WHY THIS IS ITS OWN ALERT AND NOT JUST A LINE IN THE CALL SUMMARY ────────
 * Every voice call already emails her an end-of-call report. The trouble is
 * that a built demo call arrives as "Mr. Mustard call summary · Web call",
 * which is the identical subject line whether somebody poked at it for five
 * seconds or booked a job for Thursday. Real signal has been landing in that
 * inbox looking exactly like noise. Two things fix it, and both are needed:
 * the report itself now names the business and says what happened (see
 * handleEndOfCallReport), and a booking, which is rare and is the strongest
 * signal in the entire funnel, gets its own alert the second it happens.
 *
 * ── THE LEAD MOVES TOO, WHICH IS THE PART THAT IS ACTUALLY HANDS OFF ─────────
 * An email is a thing she has to read. A prospect who called their own demo,
 * played a customer and got put on a schedule is somebody to phone TODAY, so
 * the record moves itself onto the dial floor with the reason written on it.
 * If she never opens the email, the lead still surfaces where she works.
 *
 * Never throws. This runs behind a live phone call and a failed notification
 * must never cost a caller their booking.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

export type BookedDemo = {
  runId: string;
  business: string;
  label: string;
  customerName: string | null;
  customerPhone: string | null;
  service: string | null;
  startsAt: string;
};

/**
 * The outbound lead this demo belongs to, if it is one.
 *
 * Self-serve builds (somebody who built their own on /voice-agents/build) have
 * no lead row, and that is fine: they still produce the email. Only a demo Sarah
 * sent has a record to move.
 */
async function leadForRun(db: SupabaseClient, runId: string) {
  const { data } = await db
    .from('outbound_leads')
    .select('id, business_name, contact_name, email, phone, status, notes, hub_demo_url')
    .eq('demo_run_id', runId)
    .maybeSingle();
  return data;
}

export async function notifyDemoBooking(db: SupabaseClient, booked: BookedDemo): Promise<void> {
  const lead = await leadForRun(db, booked.runId).catch(() => null);

  /* Move the record first. The email is the nice-to-have; the lead landing on
   * the dial floor flagged hot is the thing that still works when nobody reads
   * their inbox until Thursday. */
  if (lead) {
    try {
      const note = `BOOKED ON THEIR OWN DEMO: ${booked.customerName || 'a caller'} for ${booked.label}${booked.service ? ` (${booked.service})` : ''}. They called the demo agent, played a customer, and it put them on a schedule.`;
      await db
        .from('outbound_leads')
        .update({
          notes: [lead.notes, note].filter(Boolean).join('\n'),
          next_action: `They BOOKED on their own demo. Call today, this is the hottest signal we get.`,
          ...(lead.status === 'new' ? { status: 'contacted' } : {}),
        })
        .eq('id', lead.id);
    } catch (err) {
      console.error('demo booking lead update failed', err);
    }
  }

  if (!process.env.RESEND_API_KEY) return;

  try {
    const resend = resendClient();
    const who = booked.customerName || 'Somebody';
    const hub = lead?.hub_demo_url ?? null;

    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject: `DEMO BOOKING: ${booked.business} · ${booked.label}`,
      html: clientEmail({
        preheader: `${who} was booked on ${booked.business}' demo agent for ${booked.label}.`,
        eyebrow: 'THE DEMO CLOSED SOMETHING',
        greeting: `${booked.business} just booked a job on their own demo.`,
        body:
          `<p>Somebody called the ${escapeHtml(booked.business)} demo agent, played a customer, and the agent put them on the schedule. Nobody typed this in.</p>` +
          `<p><strong>${escapeHtml(booked.label)}</strong><br>` +
          `${escapeHtml(who)}${booked.customerPhone ? ` · ${escapeHtml(booked.customerPhone)}` : ''}` +
          `${booked.service ? `<br>${escapeHtml(booked.service)}` : ''}</p>` +
          (lead
            ? `<p>This is <strong>${escapeHtml(lead.business_name ?? booked.business)}</strong>${lead.contact_name ? ` (${escapeHtml(lead.contact_name)}` : ''}${lead.phone ? `, ${escapeHtml(lead.phone)}` : ''}${lead.contact_name ? ')' : ''} on the dial floor. They are flagged and the reason is on the record.</p>`
            : `<p>This one built their own demo, so there is no lead row behind it. The booking is on the demo either way.</p>`) +
          `<p>A prospect who takes the trouble to test the booking is not browsing. This is the call to make today.</p>`,
        cta: hub ? { label: 'Open their hub', url: hub } : { label: 'The dial floor', url: `${SITE.url}/admin/outbound` },
        signature: 'The Voice Line',
      }),
    });
  } catch (err) {
    console.error('demo booking notify failed', err);
  }
}

/** Names and free text from a phone call land in an HTML email. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
