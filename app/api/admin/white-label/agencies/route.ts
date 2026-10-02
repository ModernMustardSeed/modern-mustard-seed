/**
 * Admin: list the white label book, or add an agency by hand (one met in
 * person). `approve: true` approves it on the spot and sends the welcome.
 */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { createAgency, listAgencies, listClients } from '@/lib/white-label/store';
import { approveAgency } from '@/lib/white-label/actions';
import { agencyLinks, portalUrl } from '@/lib/white-label/mail';
import { wlClean, wlColor } from '@/data/white-label';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const [agencies, clients] = await Promise.all([listAgencies(), listClients()]);
  // Portal links are signed server-side; the desk never holds the secret.
  return NextResponse.json({ agencies: agencies.map((a) => ({ ...a, portal: portalUrl(a), sheet: agencyLinks(a).sheet })), clients });
}

export async function POST(req: Request) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string | boolean | undefined>;
  const str = (k: string, max = 200) => wlClean(typeof b[k] === 'string' ? (b[k] as string) : '', max);
  const name = str('name', 80);
  const email = str('email', 120).toLowerCase();
  if (name.length < 2 || !email.includes('@')) return NextResponse.json({ error: 'Agency name and email are required.' }, { status: 400 });
  try {
    let a = await createAgency({
      name,
      email,
      contact_name: str('contact_name', 80) || null,
      phone: str('phone', 30) || null,
      website: str('website') || null,
      color: str('color') ? wlColor(str('color')) : null,
      notes: str('notes', 600) || null,
      source: 'admin',
    });
    if (b.approve) a = await approveAgency(a.id);
    return NextResponse.json({ ok: true, agency: a });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save.' }, { status: 500 });
  }
}
