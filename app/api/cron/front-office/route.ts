import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sweepUnnotified } from '@/lib/front-office/notify';
import { sendAppointmentReminders } from '@/lib/front-office/reminders';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * THE FRONT OFFICE HEARTBEAT.
 *
 * Two jobs, both of them safety nets rather than primary paths:
 *
 *   1. NOTIFY WHAT THE WEBHOOK MISSED. Owners are told about emergencies and
 *      bookings from the webhook, in the moment. This catches the ones where
 *      the webhook died mid-flight or Resend was briefly down, because a
 *      notification that silently failed is the same as no notification.
 *
 *   2. REMIND CUSTOMERS ABOUT TOMORROW. A no-show costs the business the whole
 *      slot, and a reminder is the cheapest thing in this product.
 *
 * Runs hourly. Both halves are idempotent and both are bounded, so an overlap,
 * a retry, or Sarah hitting it by hand cannot double-send.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && !/^\[SENSITIVE\]$/i.test(secret)) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  // Independent on purpose: a failure in one must not stop the other. An
  // unsent emergency notice matters more than a reminder, and vice versa is
  // never true, so neither is allowed to block the other.
  const [notified, reminded] = await Promise.allSettled([sweepUnnotified(db), sendAppointmentReminders(db)]);

  return NextResponse.json({
    ok: true,
    notified: notified.status === 'fulfilled' ? notified.value : { error: String(notified.reason) },
    reminders: reminded.status === 'fulfilled' ? reminded.value : { error: String(reminded.reason) },
  });
}
