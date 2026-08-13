import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape } from '@/lib/email';
import { mailable } from '@/lib/hundredfold-drip';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHAT MAKES A TOOL A TOOL.
 *
 * A generated calculator or intake form that computes a number and forgets it
 * looks identical in a screenshot and is worthless on a Tuesday. This endpoint
 * is the other half: the visitor finishes, the answer lands in the member's
 * submissions, and the owner gets an email with it while the customer is still
 * on the page.
 *
 * ⚠️ THIS IS A PUBLIC, CROSS-ORIGIN, UNAUTHENTICATED ENDPOINT, by necessity:
 * the tool is iframed on the member's own website and a stranger filling in a
 * quote form has no account here. Everything that keeps it safe is therefore in
 * this file:
 *   - the slug must resolve to a PUBLISHED, non-retired tool, or 404;
 *   - the body is capped, the field count is capped, every value is truncated,
 *     and nothing is interpolated into HTML unescaped;
 *   - one address is rate-limited per tool per hour, so the form cannot be used
 *     to mail-bomb the owner from their own website;
 *   - the member's address comes from OUR row, never from the payload, so a
 *     forged submission cannot redirect the notification anywhere.
 */

const MAX_BODY = 24_000;
const MAX_FIELDS = 40;
const MAX_VALUE = 2000;
const RATE_PER_HOUR = 20;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const pick = (payload: Record<string, string>, keys: string[]): string | null => {
  for (const [k, v] of Object.entries(payload)) {
    const key = k.toLowerCase().replace(/[^a-z]/g, '');
    if (keys.includes(key) && v.trim()) return v.trim().slice(0, 200);
  }
  return null;
};

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = getSupabase();
  if (!sb || !/^[a-z0-9-]{3,120}$/i.test(slug)) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404, headers: CORS });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ ok: false, error: 'Too much data.' }, { status: 413, headers: CORS });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return NextResponse.json({ ok: false, error: 'Could not read that.' }, { status: 400, headers: CORS });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ ok: false, error: 'Could not read that.' }, { status: 400, headers: CORS });
  }

  // Flatten to strings. A generated tool decides its own fields, so the shape is
  // free, but the SIZE never is.
  const payload: Record<string, string> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (Object.keys(payload).length >= MAX_FIELDS) break;
    if (v === null || v === undefined || v === '') continue;
    const value = typeof v === 'object' ? JSON.stringify(v) : String(v);
    payload[String(k).slice(0, 80)] = value.slice(0, MAX_VALUE);
  }
  if (!Object.keys(payload).length) {
    return NextResponse.json({ ok: false, error: 'Nothing was filled in.' }, { status: 400, headers: CORS });
  }

  const { data: system } = await sb
    .from('hundredfold_systems')
    .select('id, member_id, name, status, published_at, kind')
    .eq('public_slug', slug)
    .maybeSingle();
  if (!system || system.status === 'retired' || !system.published_at) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404, headers: CORS });
  }

  const name = pick(payload, ['name', 'fullname', 'firstname', 'yourname', 'contactname']);
  const email = pick(payload, ['email', 'emailaddress', 'youremail']);
  const phone = pick(payload, ['phone', 'phonenumber', 'tel', 'mobile', 'yourphone']);
  const summary = pick(payload, ['summary', 'result', 'estimate', 'total', 'quote']);

  // Per-tool, per-address hourly ceiling. Keyed on the address when there is one
  // and on the hashed IP otherwise, so a form with no email field is still
  // covered.
  const ipHash = createHash('sha256')
    .update((req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown')
    .digest('hex')
    .slice(0, 32);
  const since = new Date(Date.now() - 3600_000).toISOString();
  /*
   * THE VISITOR'S EMAIL IS UNTRUSTED INPUT AND `.or()` TAKES A FILTER GRAMMAR,
   * NOT A VALUE. Interpolating it raw let a submitter send an address like
   * `x,ip_hash.not.is.null`, rewriting the ceiling's own filter so the count
   * never reached the limit. That turns a member's published tool into a
   * mail-bomb aimed at that member's inbox, since every submission emails them.
   * Commas, dots and parentheses are all syntax here, so anything that is not a
   * plainly well-formed address is dropped back to the IP-only ceiling.
   */
  const SAFE_EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const rateEmail = email && SAFE_EMAIL.test(email) ? email : '';
  const { count } = await sb
    .from('hundredfold_tool_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('system_id', system.id)
    .gte('created_at', since)
    .or(rateEmail ? `email.eq.${rateEmail},ip_hash.eq.${ipHash}` : `ip_hash.eq.${ipHash}`);
  if ((count ?? 0) >= RATE_PER_HOUR) {
    // Deliberately a soft answer: the visitor is usually a real customer who
    // double-clicked, and telling them they are rate limited helps nobody.
    return NextResponse.json({ ok: true, throttled: true }, { headers: CORS });
  }

  const { data: row, error } = await sb
    .from('hundredfold_tool_submissions')
    .insert({
      system_id: system.id,
      member_id: system.member_id,
      payload,
      name,
      email,
      phone,
      referrer: (req.headers.get('referer') ?? '').slice(0, 300) || null,
      ip_hash: ipHash,
    })
    .select('id')
    .single();

  if (error) {
    console.error('hundredfold tool submit failed', error.message);
    return NextResponse.json({ ok: false, error: 'We could not save that. Try again.' }, { status: 500, headers: CORS });
  }

  // Tell the owner, from OUR record of who they are. Rides sendViaResend so the
  // suppression gate and the staff mute apply like every other send.
  const { data: member } = await sb
    .from('hundredfold_members')
    .select('email, name, business_name')
    .eq('id', system.member_id)
    .maybeSingle();

  // ⚠️ Skip the notify for an address we should never mail. The Whitaker demo
  // runs on a .demo address, and Resend accepts an undeliverable address and
  // then bounces it, which spends real sender reputation on a fictional med
  // spa. Deliverability here is already carried on one domain shared with
  // receipts and client delivery, so it is not a reputation to donate.
  if (member?.email && mailable(member.email)) {
    const rows = Object.entries(payload)
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#8A8378;font-size:13px;vertical-align:top">${escape(k)}</td><td style="padding:6px 0;font-size:14px;color:#161616">${escape(v)}</td></tr>`
      )
      .join('');

    const result = await sendViaResend({
      from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
      to: member.email,
      replyTo: email ?? 'sarah@modernmustardseed.com',
      subject: `${name ? `${name} ` : ''}used your ${system.name}${summary ? `: ${summary.slice(0, 60)}` : ''}`,
      html: clientEmail({
        preheader: summary ?? `Someone filled in your ${system.name}.`,
        eyebrow: 'A NEW ONE CAME IN',
        greeting: member.name ? `${member.name.split(/\s+/)[0]},` : 'Good news,',
        body:
          `<p>Somebody just used <strong>${escape(system.name)}</strong> on your site.${email ? ' You can reply straight to this email and it goes to them.' : ''}</p>` +
          `<table style="border-collapse:collapse;margin:14px 0">${rows}</table>` +
          `<p>Every one of these is saved in your Command Center too.</p>`,
        cta: { label: 'Open your Command Center', url: `${SITE.url}/portal/hundredfold` },
        signature: 'Your Hundredfold desk',
      }),
      mailbox: 'hello@modernmustardseed.com',
    });
    if (result.ok) {
      await sb.from('hundredfold_tool_submissions').update({ emailed_at: new Date().toISOString() }).eq('id', row.id);
    } else {
      // The submission is SAVED either way. A failed notification must never
      // look to the visitor like a failed submission.
      console.error('hundredfold tool notify failed', result.error);
    }
  }

  return NextResponse.json({ ok: true, id: row.id }, { headers: CORS });
}
