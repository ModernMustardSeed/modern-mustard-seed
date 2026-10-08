import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { hostReceived } from '@/lib/bootcamp/emails';
import { createHost, firstNameOf, recordEvent } from '@/lib/bootcamp/store';

/**
 * Host a Room: the application. Inserts the host as `applied` with a slug
 * from the brand or the name, tells the applicant it landed, and tells Sarah.
 * Approval, the links and the dashboard key happen on the admin desk.
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Body = {
  name?: string;
  brand?: string;
  email?: string;
  website?: string;
  platforms?: string;
  audience?: string;
  vertical?: string;
  room?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: 'Your name, two to eighty characters.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'A real email address, please.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const host = await createHost(sb, {
      name,
      brand: body.brand,
      email,
      website: body.website,
      platforms: body.platforms,
      audience: body.audience,
      vertical: body.vertical,
      room: body.room,
      status: 'applied',
    });

    await recordEvent(sb, 'host-applied', { email, hostSlug: host.slug, detail: { brand: host.brand, vertical: host.vertical } });

    const letter = hostReceived({ firstName: firstNameOf(name), name, brand: host.brand, email });
    const sent = await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
    });
    if (!sent.ok) console.error('bootcamp host: received note failed', email, sent.error);

    const fields = [
      ...(host.brand ? [{ label: 'Brand', value: host.brand }] : []),
      ...(host.website ? [{ label: 'Website', value: host.website, isLink: true }] : []),
      ...(host.platforms ? [{ label: 'Platforms', value: host.platforms }] : []),
      ...(host.audience ? [{ label: 'Audience', value: host.audience }] : []),
      ...(host.vertical ? [{ label: 'Vertical', value: host.vertical }] : []),
      ...(host.room ? [{ label: 'Room', value: host.room }] : []),
      { label: 'Slug', value: host.slug },
      { label: 'Desk', value: `${SITE.url}/admin/bootcamp`, isLink: true },
    ];
    const note = await sendViaResend({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      replyTo: email,
      subject: `Host application: ${host.brand || name}`,
      html: leadNotification({
        type: 'Contact',
        name: host.brand ? `${name}, ${host.brand}` : name,
        email,
        fields,
        suggestedAction: 'Approve or decline on the bootcamp desk. Approval mints the links and sends the host their dashboard.',
      }),
    });
    if (!note.ok) console.error('bootcamp host: owner note failed', note.error);

    return NextResponse.json({ ok: true, slug: host.slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('bootcamp host application failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
