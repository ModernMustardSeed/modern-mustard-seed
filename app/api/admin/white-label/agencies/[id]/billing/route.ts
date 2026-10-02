/** Admin: re-sync an agency's Stripe subscription with its live clients. Safe to press twice. */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getAgency } from '@/lib/white-label/store';
import { syncAgencyBilling } from '@/lib/white-label/billing';

export const runtime = 'nodejs';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const a = await getAgency(id);
  if (!a) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const r = await syncAgencyBilling(a);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
