import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { masterclassConfirm } from '@/lib/bootcamp/emails';
import { countEventsToday, recordEvent, upsertRegistration } from '@/lib/bootcamp/store';

/**
 * The free masterclass seat. A form post becomes a registration at tier
 * masterclass (never lowering anyone who already holds a ticket), the
 * confirmation goes out from the root address with the calendar link, and
 * Sarah hears about the first fifty of the day. Past fifty the desk has the
 * list and her inbox does not need it fifty-one times.
 *
 * Posting twice with the same email is fine: the row is reused, the fields
 * fill in, and the confirmation simply goes again, because the person asked.
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,47}$/;
const OWNER_NOTES_PER_DAY = 50;

type Body = {
  email?: string;
  name?: string;
  business?: string;
  website?: string;
  trade?: string;
  phone?: string;
  why?: string;
  via?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  const name = (body.name || '').trim();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A real email address, please.' }, { status: 400 });
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Your name, two to eighty characters.' }, { status: 400 });

  const viaRaw = (body.via || '').trim().toLowerCase();
  const cookieRef = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_bc_ref=([^;]+)/);
  const cookieVia = cookieRef ? decodeURIComponent(cookieRef[1]).trim().toLowerCase() : '';
  const via = SLUG_RE.test(viaRaw) ? viaRaw : SLUG_RE.test(cookieVia) ? cookieVia : null;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { row, isNew } = await upsertRegistration(sb, {
      email,
      name,
      business: body.business,
      website: body.website,
      trade: body.trade,
      phone: body.phone,
      why: body.why,
      source: via ?? 'masterclass',
      hostSlug: via,
      tier: 'masterclass',
    });

    const letter = masterclassConfirm({ firstName: row.first_name, email });
    const sent = await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
    });
    if (!sent.ok) console.error('bootcamp register: confirmation failed', email, sent.error);

    await recordEvent(sb, 'register', {
      email,
      registrationId: row.id,
      hostSlug: via,
      detail: { isNew, tier: row.tier, confirmed: sent.ok, trade: body.trade?.trim() || null },
    });

    if (isNew) {
      const today = await countEventsToday(sb, 'register');
      if (today <= OWNER_NOTES_PER_DAY) {
        const fields = [
          { label: 'Seat', value: 'Masterclass (free)' },
          ...(body.business?.trim() ? [{ label: 'Business', value: body.business.trim().slice(0, 160) }] : []),
          ...(body.website?.trim() ? [{ label: 'Website', value: body.website.trim().slice(0, 300), isLink: true }] : []),
          ...(body.trade?.trim() ? [{ label: 'Trade', value: body.trade.trim().slice(0, 80) }] : []),
          ...(via ? [{ label: 'Via host', value: via }] : []),
          { label: 'Desk', value: `${SITE.url}/admin/bootcamp`, isLink: true },
        ];
        const note = await sendViaResend({
          from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: OWNER_NOTIFY_TO,
          replyTo: email,
          subject: `Masterclass seat: ${name}${body.business?.trim() ? `, ${body.business.trim().slice(0, 60)}` : ''}`,
          html: leadNotification({
            type: 'Newsletter',
            name,
            email,
            fields,
            message: body.why?.trim() || undefined,
            suggestedAction: `Registration ${today} of ${OWNER_NOTES_PER_DAY} today. The confirmation and calendar link already went.`,
          }),
        });
        if (!note.ok) console.error('bootcamp register: owner note failed', note.error);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('bootcamp register failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
