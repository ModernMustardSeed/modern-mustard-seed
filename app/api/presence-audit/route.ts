import { NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { trackServerConversion } from '@/lib/meta-capi';
import { getAffiliateByCode } from '@/lib/affiliate';
import { partnerSourceTag } from '@/lib/presence-audit-links';
import { announceAuditRequest, fileAuditRequest } from '@/lib/audit-requests';

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
 * The filing itself lives in lib/audit-requests.ts (`fileAuditRequest` and
 * `announceAuditRequest`), because Mr. Mustard files the same request from a
 * phone call through app/api/voice. One set of rules, two doors.
 *
 * Two quiet guards instead of a puzzle, because a puzzle on the one form this
 * page exists for costs real people: a honeypot field no person can see, and a
 * ceiling of five requests an hour from one address. The same person asking
 * twice for the same business inside a day is told yes without a second row.
 */

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

/**
 * THE PARTNER WHO HANDED THEM THE LINK, IF ONE DID.
 *
 * Every partner has a personal audit link (/presence-audit?ref=<code>, shown in
 * their portal and field guide). RefCapture turns that ref into the 60-day
 * mms_ref cookie on landing, and the form also posts the code it saw, for a
 * browser that refused the cookie. Either way the code is resolved against
 * APPROVED affiliates only, so a made-up or paused code files the request
 * exactly as it would have without one.
 *
 * Partner beats utm_source, the same precedence every checkout uses (the ref
 * cookie first): a request from somebody a partner sent is that partner's,
 * whichever link they tapped last. No migration: the partner rides in the
 * existing `source` tag, which the desk and the scoreboard already read.
 */
async function referringPartner(req: Request, body: Record<string, unknown>): Promise<{ code: string; name: string | null } | null> {
  const posted = clip(body.ref, 64);
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mms_ref=([^;]+)/);
  let cookie = '';
  try {
    cookie = m ? decodeURIComponent(m[1]).trim().slice(0, 64) : '';
  } catch {
    /* a mangled cookie is no cookie */
  }
  const code = posted || cookie;
  if (!code) return null;
  try {
    const aff = await getAffiliateByCode(code);
    return aff?.code ? { code: aff.code, name: aff.name ?? null } : null;
  } catch {
    return null;
  }
}

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

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'The audit desk is not available right now. Email sarah@modernmustardseed.com and we will run it.' }, { status: 503 });

  // A partner handed them the link: file it under that partner. See referringPartner.
  const partner = await referringPartner(req, body);
  const source = partner ? partnerSourceTag(partner.code) : clip(body.source, 80) || 'presence-audit';

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const ipHash = createHash('sha256').update(`${ip}:${process.env.ADMIN_SESSION_SECRET ?? 'mms'}`).digest('hex').slice(0, 32);

  const outcome = await fileAuditRequest(sb, {
    email: clip(body.email, 200),
    name: clip(body.name, 120),
    business: clip(body.business, 160),
    website: clip(body.website, 300),
    town: clip(body.town, 120),
    googleUrl: clip(body.googleUrl, 600),
    note: clip(body.note, 1500),
    source,
    referrer: clip(req.headers.get('referer'), 300),
    ipHash,
  });
  if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: outcome.status });

  const filed = outcome.request;
  if (filed.duplicate) return NextResponse.json({ ok: true, id: filed.id, duplicate: true });

  // Everything below is the heads-up, not the request. The row above is the
  // record that matters, so none of it is allowed to hold the visitor up.
  after(async () => {
    await announceAuditRequest(filed, {
      fields: partner ? [{ label: 'Partner credit', value: `${partner.name ?? partner.code} (${partner.code})` }] : [],
    });

    await trackServerConversion(req, {
      eventName: 'Lead',
      email: filed.email,
      eventId: clip(body.metaEventId, 120) || null,
      fbp: clip(body.fbp, 200) || null,
      fbc: clip(body.fbc, 400) || null,
      customData: { lead_source: 'presence-audit' },
    }).catch(() => {});
  });

  return NextResponse.json({ ok: true, id: filed.id });
}
