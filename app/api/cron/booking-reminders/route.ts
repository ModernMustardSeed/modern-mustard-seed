/**
 * Day-of discovery-call reminders.
 *
 * Runs Tuesday through Friday morning via Vercel Cron (the days Sarah takes
 * consults). Finds bookings scheduled for later today (Mountain
 * Time) that have not yet been reminded and emails the visitor a reminder
 * with the Zoho join link front and center.
 *
 * Dedup: sent reminders are marked in the `notes` column with a `[reminded]`
 * substring, mirroring the mustard-sequence cron. Safe to run repeatedly.
 *
 * Auth: requires the standard Vercel cron secret (Authorization: Bearer …).
 */

import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { displayForIso, mtDayBoundsUtc } from '@/lib/booking';
import { availability } from '@/data/availability';
import { bookingReminderEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

const REMINDED_TAG = '[reminded]';

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer ${CRON_SECRET}
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const client = getSupabase();
  if (!client) return NextResponse.json({ ok: true, sent: 0, note: 'supabase not configured' });

  const resend = process.env.RESEND_API_KEY ? resendClient() : null;

  const now = new Date();
  const { endUtc } = mtDayBoundsUtc(now);

  // Window: from now through the end of the current Mountain day. Catches every
  // appointment still ahead today; never re-reminds a call that already passed.
  const { data, error } = await client
    .from('leads')
    .select('id, name, email, notes, timeline')
    .eq('source', 'mustard-seed-booking')
    .eq('status', 'booked')
    .gte('timeline', now.toISOString())
    .lte('timeline', endUtc);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of data ?? []) {
    const notes = (lead.notes as string | null) ?? '';
    if (notes.includes(REMINDED_TAG)) {
      skipped++;
      continue;
    }
    const email = (lead.email as string | null) ?? '';
    const startIso = (lead.timeline as string | null) ?? '';
    if (!email || !email.includes('@') || !startIso) {
      skipped++;
      continue;
    }

    const firstName = (lead.name as string | null)?.split(' ')[0] || 'there';
    const { display, shortLabel } = displayForIso(startIso);

    try {
      if (resend) {
        const { error: sendError } = await resend.emails.send({
          from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: email,
          replyTo: 'sarah@modernmustardseed.com',
          subject: `${firstName}, our call is today . ${shortLabel}`,
          html: bookingReminderEmail({
            firstName,
            whenDisplay: display,
            conferenceLink: availability.conferenceLink || undefined,
          }),
        });
        if (sendError) {
          console.error(`booking reminder failed for ${email}`, sendError);
          errors++;
          continue;
        }
      }
      await client
        .from('leads')
        .update({ notes: `${notes}${notes ? ' ' : ''}${REMINDED_TAG}` })
        .eq('id', lead.id);
      sent++;
    } catch (err) {
      console.error(`booking reminder failed for ${email}`, err);
      errors++;
    }
  }

  return NextResponse.json({ ok: true, timestamp: now.toISOString(), sent, skipped, errors });
}
