import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { mustardAnalytics } from '@/lib/mustard/analytics';
import { mintLink, revokeLink } from '@/lib/mustard/links';
import { getSurface } from '@/lib/mustard/surface';
import { getSession } from '@/lib/admin-auth';
import { recordEvent } from '@/lib/acq/events';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const [analytics, surface] = await Promise.all([mustardAnalytics(), getSurface(undefined, g.db)]);
  return NextResponse.json({
    analytics,
    surface,
    baseUrl: `${SITE.url}/mustard`,
    // The links Sarah pastes. One page, one query parameter, every channel.
    entryPoints: [
      'human-call', 'facebook-group', 'facebook-post', 'facebook-dm', 'linkedin', 'linkedin-dm',
      'cold-email', 'partner', 'qr', 'homepage', 'paid-facebook', 'paid-google',
    ].map((s) => ({ source: s, url: `${SITE.url}/mustard?source=${s}` })),
  });
}

/**
 * SEND MUSTARD DEMO. Mints a signed, expiring link that prefills a known
 * prospect's number so they type nothing.
 *
 * The token is returned exactly once, here. Only its hash is stored, so this
 * response is the only chance to copy it.
 */
export async function POST(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  const { db } = g;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? 'mint');

  if (action === 'revoke') {
    const id = String(body.linkId ?? '');
    if (!id) return NextResponse.json({ error: 'linkId is required.' }, { status: 400 });
    await revokeLink(db, id);
    return NextResponse.json({ ok: true });
  }

  const leadId = String(body.leadId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) return NextResponse.json({ error: 'A prospect is required.' }, { status: 400 });

  const { data: lead } = await db.from('outbound_leads').select('id,business_name,contact_name,phone').eq('id', leadId).maybeSingle();
  if (!lead) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });

  const session = await getSession();
  const surface = await getSurface(undefined, db);
  const link = await mintLink(db, {
    leadId,
    source: String(body.source ?? 'human-call'),
    campaign: body.campaign ? String(body.campaign) : null,
    createdBy: session?.email ?? null,
    ttlHours: body.ttlHours ? Number(body.ttlHours) : undefined,
    surfaceId: surface.id || null,
  });
  if (!link) return NextResponse.json({ error: 'Could not mint the link.' }, { status: 500 });

  await recordEvent(db, {
    leadId,
    type: 'note',
    label: `Mustard demo link created (${body.source ?? 'human-call'}), good for ${body.ttlHours ?? 72} hours`,
    detail: { linkId: link.id, expiresAt: link.expiresAt, createdBy: session?.email ?? null },
  });

  return NextResponse.json({
    ok: true,
    url: link.url,
    expiresAt: link.expiresAt,
    linkId: link.id,
    // Ready to paste into a DM or read down a phone. It prefills; it does not
    // consent, and the prospect still presses the button themselves.
    message: `Send this to ${lead.contact_name ?? lead.business_name}. It fills in their number; they still tick the box and press the button.`,
  });
}
