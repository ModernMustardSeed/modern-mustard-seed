/**
 * The agency called the test line and approves it. That is the agency's
 * yes; Sarah points the real number and marks it live, which bills it.
 */

import { NextResponse } from 'next/server';
import { agencyFromKey } from '@/lib/white-label/portal';
import { getClient, updateClient } from '@/lib/white-label/store';
import { mailAgencyApprovedClient } from '@/lib/white-label/mail';
import { deliveries, emptyDelivery, launchError } from '@/lib/white-label/delivery';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as { k?: string };
  const agency = await agencyFromKey(slug, b.k);
  if (!agency) return NextResponse.json({ error: 'This portal link is not active.' }, { status: 401 });
  const client = await getClient(id);
  if (!client || client.agency_id !== agency.id) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (client.status !== 'review') return NextResponse.json({ error: 'This delivery is not waiting for review.' }, { status: 409 });
  const delivery = (await deliveries([id]))[id] ?? emptyDelivery;
  const failure = launchError('review', 'live', new Date().toISOString(), client.lines, client.test_number, delivery);
  if (failure) return NextResponse.json({ error: failure }, { status: 409 });
  if (client.agency_approved_at) return NextResponse.json({ ok: true, client });
  const updated = await updateClient(id, { agency_approved_at: new Date().toISOString() });
  await mailAgencyApprovedClient(agency, updated);
  return NextResponse.json({ ok: true, client: updated });
}
