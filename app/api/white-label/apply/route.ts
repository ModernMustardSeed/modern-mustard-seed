/**
 * An agency applies to the White Label Program.
 *
 * Writes the agency (status applied), then emails them their own demo link
 * at once and tells Sarah. Approval is a human step on /admin/white-label;
 * approving sends the welcome email with the portal and price sheet.
 */

import { NextResponse } from 'next/server';
import { createAgency } from '@/lib/white-label/store';
import { mailApplied } from '@/lib/white-label/mail';
import { markJoinedByEmail } from '@/lib/partner-desk/store';
import { wlClean, wlColor } from '@/data/white-label';

export const runtime = 'nodejs';

const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 5;
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string | undefined>;
  if (b.company_url) return NextResponse.json({ ok: true }); // honeypot

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return NextResponse.json({ error: 'Too many applications from here. Try again later.' }, { status: 429 });

  const name = wlClean(b.agency, 80);
  const email = (b.email || '').trim().toLowerCase();
  if (name.length < 2) return NextResponse.json({ error: 'Your agency name is required.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'A working email is required.' }, { status: 400 });

  try {
    const agency = await createAgency({
      name,
      email,
      contact_name: wlClean(b.name, 80) || null,
      phone: wlClean(b.phone, 30) || null,
      website: wlClean(b.website, 200) || null,
      color: b.color ? wlColor(b.color) : null,
      client_count: wlClean(b.clients, 40) || null,
      sells: wlClean(b.sells, 600) || null,
      source: wlClean(b.source, 80) || 'apply',
    });
    await mailApplied(agency);
    // A desk prospect who applies closes their own loop on the Partner Desk.
    await markJoinedByEmail(email).catch(() => {});
    return NextResponse.json({ ok: true, slug: agency.slug });
  } catch (err) {
    console.error('white label apply failed', err);
    return NextResponse.json({ error: 'Something went wrong on our side. Email sarah@modernmustardseed.com and we will set you up by hand.' }, { status: 500 });
  }
}
