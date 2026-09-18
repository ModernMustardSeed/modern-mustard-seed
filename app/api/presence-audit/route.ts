import { NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase, insertLead } from '@/lib/supabase';
import { resendClient, sendViaResend } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { trackServerConversion } from '@/lib/meta-capi';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';
import { EMAIL_RE, hostOf, normalizeWebsite, presenceAuditReceivedEmail } from '@/lib/audit-requests';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SOMEBODY ASKED FOR THEIR ONLINE PRESENCE AUDIT.
 *
 * The audit is requested, not generated here. This route writes the request to
 * `audit_requests` (migration 132), puts it in front of Sarah by email and on
 * the Audit Desk, and tells the visitor it is in. Sarah runs it from
 * /admin/audit and the finished report is emailed from there.
 *
 * Two quiet guards instead of a puzzle, because a puzzle on the one form this
 * page exists for costs real people: a honeypot field no person can see, and a
 * ceiling of five requests an hour from one address. The same person asking
 * twice for the same business inside a day is told yes without a second row.
 */

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }

  // The honeypot. A person never sees this field, so anything in it is a bot,
  // and a bot is told it worked so it has no reason to try again.
  if (clip(body.company_site, 200)) return NextResponse.json({ ok: true });

  const email = clip(body.email, 200).toLowerCase();
  const name = clip(body.name, 120);
  const business = clip(body.business, 160);
  const websiteRaw = clip(body.website, 300);
  const town = clip(body.town, 120);
  const googleUrl = clip(body.googleUrl, 600);
  const note = clip(body.note, 1500);

  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'That email does not look right. Check it and try again.' }, { status: 400 });
  if (!business) return NextResponse.json({ error: 'Tell us the business name so we grade the right one.' }, { status: 400 });

  const website = websiteRaw ? normalizeWebsite(websiteRaw) : null;
  if (websiteRaw && !website) {
    return NextResponse.json({ error: 'That website address does not look right. Try it as yourbusiness.com.' }, { status: 400 });
  }
  const google = /^https?:\/\//i.test(googleUrl) ? googleUrl : null;

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'The audit desk is not available right now. Email sarah@modernmustardseed.com and we will run it.' }, { status: 503 });

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`${ip}:${process.env.ADMIN_SESSION_SECRET ?? 'mms'}`).digest('hex').slice(0, 32);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count: recent } = await sb
    .from('audit_requests')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', hourAgo);
  if ((recent ?? 0) >= 5) {
    return NextResponse.json({ error: 'That is a lot of audits in an hour. Email sarah@modernmustardseed.com and we will sort it out.' }, { status: 429 });
  }

  const { data: dupe } = await sb
    .from('audit_requests')
    .select('id')
    .eq('email', email)
    .ilike('business_name', business.replace(/[%_\\]/g, '\\$&'))
    .gte('created_at', dayAgo)
    .limit(1)
    .maybeSingle();
  if (dupe) return NextResponse.json({ ok: true, id: dupe.id, duplicate: true });

  const { data: row, error } = await sb
    .from('audit_requests')
    .insert({
      email,
      name: name || null,
      business_name: business,
      website,
      town: town || null,
      google_url: google,
      note: note || null,
      source: clip(body.source, 80) || 'presence-audit',
      referrer: clip(req.headers.get('referer'), 300) || null,
      ip_hash: ipHash,
    })
    .select('id')
    .single();
  if (error || !row) {
    console.error('presence-audit request insert failed:', error?.message);
    return NextResponse.json({ error: 'We could not take that just now. Try again, or email sarah@modernmustardseed.com.' }, { status: 500 });
  }

  const request = { name: name || null, business_name: business, website };

  // Everything below is the heads-up, not the request. The row above is the
  // record that matters, so none of it is allowed to hold the visitor up.
  after(async () => {
    await insertLead({
      type: 'audit',
      name: name || null,
      email,
      business_name: business,
      audit_url: website,
      message: note || null,
      source: 'presence-audit',
      notes: `Online Presence Audit requested. Run it at ${SITE.url}/admin/audit`,
    });

    await trackServerConversion(req, {
      eventName: 'Lead',
      email,
      eventId: clip(body.metaEventId, 120) || null,
      fbp: clip(body.fbp, 200) || null,
      fbc: clip(body.fbc, 400) || null,
      customData: { lead_source: 'presence-audit' },
    }).catch(() => {});

    const fields = [
      { label: 'Business', value: business },
      ...(website ? [{ label: 'Website', value: website, isLink: true }] : [{ label: 'Website', value: 'None given' }]),
      ...(town ? [{ label: 'Town', value: town }] : []),
      ...(google ? [{ label: 'Google listing', value: google, isLink: true }] : []),
      { label: 'Run it', value: `${SITE.url}/admin/audit`, isLink: true },
    ];
    // resendClient(), not sendViaResend: it is the client that hands the
    // @modernmustardseed.com copy to Zoho, so Sarah's own mailbox gets the
    // heads-up even when Resend is suppressing that address. Same path the
    // contact form's notice takes.
    await resendClient().emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      replyTo: email,
      subject: `Audit requested: ${business}${website ? ` (${hostOf(website)})` : ''}`,
      html: leadNotification({
        type: 'AI Audit',
        name: name || business,
        email,
        fields,
        message: note || undefined,
        suggestedAction: 'Open their Google listing, fill the listing facts on the Audit Desk, and press Run. The report emails itself.',
      }),
    }).catch((e) => console.error('presence-audit owner notice failed:', e));

    await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: email,
      replyTo: 'sarah@modernmustardseed.com',
      subject: `Your audit is in, ${business}`,
      html: presenceAuditReceivedEmail(request),
    }).catch((e) => console.error('presence-audit receipt failed:', e));
  });

  return NextResponse.json({ ok: true, id: row.id });
}
