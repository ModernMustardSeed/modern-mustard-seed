import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getMemberByEmail } from '@/lib/hundredfold-store';
import { getBrand, saveBrand, brandSourceUrl, type Brand } from '@/lib/hundredfold-brand';
import { readBrandFromSite } from '@/lib/hundredfold-brand-read';
import { affords, recordSpend } from '@/lib/hundredfold-credit';

export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * The member's own brand kit: what every generated asset is painted with.
 *
 * GET   the current kit
 * PATCH change any of it by hand
 * POST  { action: 'read' } re-read it off their live website
 *
 * Scoped hard to the session email, like every other portal route here.
 */

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ ok: true, brand: null });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 500 });

  return NextResponse.json({
    ok: true,
    brand: await getBrand(sb, member.id),
    canRead: !!brandSourceUrl(member),
    site: brandSourceUrl(member),
  });
}

export async function PATCH(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 500 });

  let body: Partial<Brand>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }

  // Only the fields a member owns. `source` and the extraction stamps are ours,
  // and letting a form set them would let a hand-typed kit claim it was read
  // off their site.
  const brand = await saveBrand(
    sb,
    member.id,
    {
      ink: body.ink,
      paper: body.paper,
      accent: body.accent,
      accent_soft: body.accent_soft,
      line: body.line,
      display_font: body.display_font,
      body_font: body.body_font,
      logo_url: body.logo_url,
      photo_direction: body.photo_direction,
      voice: body.voice,
      avoid: body.avoid,
      contact: body.contact,
      legal: body.legal,
      source: 'member',
    },
    session.email
  );
  return NextResponse.json({ ok: true, brand });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 500 });

  let body: { action?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.action !== 'read') return NextResponse.json({ error: 'unknown action' }, { status: 400 });

  const url = (body.url ?? brandSourceUrl(member) ?? '').trim();
  if (!url) return NextResponse.json({ ok: false, reason: 'Give me your website address and I will read it.' });

  // Reading a brand is a model call, so it is metered like every other one.
  const gate = await affords(sb, member, 12);
  if (!gate.ok) return NextResponse.json({ ok: false, reason: gate.reason, meter: gate.meter });

  const read = await readBrandFromSite({
    memberId: member.id,
    business: member.business_name ?? member.email,
    url,
  });
  if (read.cents) {
    await recordSpend(sb, { memberId: member.id, source: 'claude', kind: 'brand', cents: read.cents, note: `read ${url}` });
  }
  if (!read.ok) return NextResponse.json({ ok: false, reason: read.reason });

  const brand = await saveBrand(sb, member.id, read.brand, session.email);
  return NextResponse.json({ ok: true, brand, from: read.from });
}
