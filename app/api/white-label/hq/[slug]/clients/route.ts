/**
 * An agency adds a client from its portal. The client lands on Sarah's board
 * as submitted, and both sides get an email. Nothing is billed until the
 * client goes live.
 */

import { NextResponse } from 'next/server';
import { agencyFromKey } from '@/lib/white-label/portal';
import { createClient } from '@/lib/white-label/store';
import { mailClientSubmitted } from '@/lib/white-label/mail';
import { WL_LINES, wlClean } from '@/data/white-label';
import { serviceConflict } from '@/lib/white-label/delivery';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const agency = await agencyFromKey(slug, typeof b.k === 'string' ? b.k : null);
  if (!agency) return NextResponse.json({ error: 'This portal link is not active.' }, { status: 401 });

  const s = (k: string, max = 200) => wlClean(typeof b[k] === 'string' ? (b[k] as string) : '', max) || null;
  const business = s('business', 120);
  const lines = [...new Set((Array.isArray(b.lines) ? b.lines : []).filter((x): x is string => typeof x === 'string' && WL_LINES.some((l) => l.slug === x)))];
  if (!business) return NextResponse.json({ error: 'The client’s business name is required.' }, { status: 400 });
  if (!lines.length) return NextResponse.json({ error: 'Pick at least one service.' }, { status: 400 });
  const conflict = serviceConflict(lines);
  if (conflict) return NextResponse.json({ error: conflict }, { status: 400 });

  const services = typeof b.services_text === 'string' ? b.services_text.replace(/[<>]/g, '').trim().slice(0, 3000) : null;
  try {
    const client = await createClient({
      agency_id: agency.id,
      business,
      website: s('website'),
      city: s('city', 80),
      contact_name: s('contact_name', 80),
      owner_phone: s('owner_phone', 30),
      owner_email: s('owner_email', 120),
      transfer_number: s('transfer_number', 30),
      hours: s('hours', 300),
      services_text: services,
      lines,
    });
    await mailClientSubmitted(agency, client);
    return NextResponse.json({ ok: true, client });
  } catch (err) {
    console.error('white label client submit failed', err);
    return NextResponse.json({ error: 'Could not save that client. Try again, or email sarah@modernmustardseed.com.' }, { status: 500 });
  }
}
