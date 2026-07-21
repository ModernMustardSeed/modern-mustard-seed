import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { PAYOUT_METHODS, payoutMethodLabel } from '@/lib/payout-methods';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A partner saves how they want to be paid, from their own dashboard. Stored on
 * their affiliate row and shown in admin right next to the Mark paid action, so
 * a payable commission never waits on a "where do I send this?" thread. Sarah
 * gets a heads-up email the moment payout info lands or changes.
 */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const affiliate = await getAffiliateByEmail(session.email);
  if (!affiliate || affiliate.status !== 'approved') {
    return NextResponse.json({ error: 'Not an approved partner' }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { method?: string; details?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const method = (body.method ?? '').trim().toLowerCase();
  const details = (body.details ?? '').trim().slice(0, 300);
  if (!PAYOUT_METHODS.some((m) => m.value === method)) {
    return NextResponse.json({ error: 'Pick how you want to be paid.' }, { status: 400 });
  }
  if (details.length < 3) {
    return NextResponse.json({ error: 'Add the details for that method (the email, handle, or address).' }, { status: 400 });
  }

  const { error } = await supabase
    .from('affiliates')
    .update({ payout_method: method, payout_details: details, payout_updated_at: new Date().toISOString() })
    .eq('id', affiliate.id);
  if (error) return NextResponse.json({ error: error.message || 'Could not save.' }, { status: 500 });

  // Heads-up to Sarah so she knows this partner is ready to be paid. Best
  // effort: a mail hiccup must never fail the save, but it is logged loudly.
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = resendClient();
      const label = payoutMethodLabel(method);
      const { error: mailErr } = await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: affiliate.email,
        subject: `Payout info on file: ${affiliate.name || affiliate.email} (${label})`,
        text:
          `${affiliate.name || affiliate.email} just saved how they want to be paid.\n\n` +
          `Method: ${label}\nDetails: ${details}\n\n` +
          `Their payable balance and the Mark paid action are at https://modernmustardseed.com/admin/partners`,
        html: leadNotification({
          type: 'Contact',
          name: affiliate.name || affiliate.email,
          email: affiliate.email,
          fields: [
            { label: 'Pays via', value: label },
            { label: 'Details', value: details },
            { label: 'Partner admin', value: 'https://modernmustardseed.com/admin/partners', isLink: true },
          ],
          suggestedAction: 'Payout info is on file. When their commissions turn payable, Mark paid sends the money here.',
        }),
      });
      if (mailErr) console.error('partner payout: owner notification failed', affiliate.email, mailErr);
    } catch (err) {
      console.error('partner payout: owner notification threw', affiliate.email, err);
    }
  }

  return NextResponse.json({ ok: true, method, details });
}
