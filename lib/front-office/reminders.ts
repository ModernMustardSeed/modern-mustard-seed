/**
 * REMIND THEM ABOUT TOMORROW.
 *
 * A no-show costs the business the whole slot and the drive. A reminder is the
 * cheapest thing in this product and the easiest to get wrong in ways that are
 * worse than not sending one:
 *
 *   SENT ONCE. `reminder_sent_at` is claimed with a conditional update before
 *   the send, so an hourly cron that overlaps itself cannot text somebody four
 *   times about one appointment.
 *
 *   NEVER FOR A CANCELLED JOB. The status filter is on the claim, not on a
 *   check beforehand, so an appointment cancelled between the read and the
 *   send is not reminded about.
 *
 *   NEVER LATE. An appointment inside the next hour is not reminded about at
 *   all: a "reminder" that lands after somebody has already left, or as the
 *   technician pulls up, reads as a system that is not paying attention.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resendClient } from '@/lib/send-email';
import { clientEmail, escape, p } from '@/lib/email';

export type ReminderResult = { checked: number; sent: number; skipped: number };

/** How far ahead we remind. Long enough to rearrange a day, short enough to be about tomorrow. */
const WINDOW_HOURS = 24;
/** Anything sooner than this has already been prepared for. */
const TOO_SOON_HOURS = 1;

export async function sendAppointmentReminders(db: SupabaseClient, limit = 100): Promise<ReminderResult> {
  const now = Date.now();
  const from = new Date(now + TOO_SOON_HOURS * 3600_000).toISOString();
  const to = new Date(now + WINDOW_HOURS * 3600_000).toISOString();

  const { data } = await db
    .from('fo_appointments')
    .select('id, office_id, contact_id, title, service, starts_at, address, status')
    .is('reminder_sent_at', null)
    .in('status', ['booked', 'confirmed'])
    .gte('starts_at', from)
    .lte('starts_at', to)
    .limit(limit);

  const rows = data ?? [];
  let sent = 0;
  let skipped = 0;

  for (const a of rows) {
    // CLAIM FIRST. Whichever pass flips reminder_sent_at from null wins; the
    // loser sends nothing. Sending first and stamping after is how an hourly
    // cron becomes four reminders.
    const { data: claimed } = await db
      .from('fo_appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', a.id)
      .is('reminder_sent_at', null)
      .in('status', ['booked', 'confirmed'])
      .select('id')
      .maybeSingle();
    if (!claimed) {
      skipped++;
      continue;
    }

    const ok = await sendOne(db, a as Appointment);
    if (ok) sent++;
    else {
      // Release the claim so the next pass retries. A reminder that failed and
      // marked itself sent is the worst of both worlds.
      await db.from('fo_appointments').update({ reminder_sent_at: null }).eq('id', a.id);
      skipped++;
    }
  }

  return { checked: rows.length, sent, skipped };
}

type Appointment = { id: string; office_id: string; contact_id: string | null; title: string; service: string | null; starts_at: string; address: string | null };

async function sendOne(db: SupabaseClient, a: Appointment): Promise<boolean> {
  const [{ data: office }, { data: contact }] = await Promise.all([
    db.from('fo_offices').select('business_name, timezone, agent_phone, notify_email, client_email').eq('id', a.office_id).maybeSingle(),
    a.contact_id ? db.from('fo_contacts').select('name, email, phone').eq('id', a.contact_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!office) return false;

  const when = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: office.timezone || 'America/Denver',
  }).format(new Date(a.starts_at));

  const resend = resendClient();
  if (!resend) return false;

  // WHO GETS THIS.
  //
  // The customer, if the agent captured an email. Most phone callers do not
  // give one, so the fallback is the OWNER: "you have a job tomorrow, here is
  // who and where" is useful to them even when we cannot reach the customer
  // directly. Silently sending nothing because we lack a customer address
  // would waste the one piece of information anybody wanted.
  const toCustomer = (contact?.email ?? '').trim();
  const toOwner = (office.notify_email || office.client_email || '').trim();
  const to = toCustomer || toOwner;
  if (!to) return false;
  const forCustomer = Boolean(toCustomer);

  const body = forCustomer
    ? p(`This is a reminder that ${escape(office.business_name)} is booked to see you on <strong>${escape(when)}</strong>.`) +
      (a.address ? p(`At ${escape(a.address)}.`) : '') +
      (a.service ? p(`For: ${escape(a.service)}.`) : '') +
      p(`If that no longer works, call ${escape(office.agent_phone ?? 'us')} and we will move it.`)
    : p(`<strong>${escape(when)}</strong>: ${escape(a.title)}.`) +
      (a.address ? p(`At ${escape(a.address)}.`) : '') +
      (contact?.phone ? p(`Customer: ${escape(contact.name ?? 'no name given')}, ${escape(contact.phone)}.`) : '') +
      p('We could not reach the customer directly because your receptionist did not get an email address on the call.');

  try {
    const { error } = await resend.emails.send({
      from: `${office.business_name} <notifications@modernmustardseed.com>`,
      replyTo: toOwner || 'sarah@modernmustardseed.com',
      to,
      subject: forCustomer ? `Reminder: ${office.business_name}, ${when}` : `Tomorrow at ${office.business_name}: ${a.title}`,
      html: clientEmail({
        preheader: forCustomer ? `Your appointment is ${when}.` : `You have a job booked for ${when}.`,
        eyebrow: forCustomer ? 'APPOINTMENT REMINDER' : 'BOOKED FOR TOMORROW',
        greeting: forCustomer ? `Hi ${contact?.name?.split(/\s+/)[0] ?? 'there'},` : 'Hi,',
        body,
        signature: office.business_name,
      }),
    });
    return !error;
  } catch (err) {
    console.error('front office reminder failed', err);
    return false;
  }
}
