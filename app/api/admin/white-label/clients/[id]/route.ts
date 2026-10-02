/**
 * Admin: move a client through the build. The side effects live here:
 *   review     -> the agency gets the test-call email (needs test_number)
 *   live       -> live_at, the agency becomes active, Stripe syncs and bills
 *                 the setups, the agency gets the live email
 *   paused / cancelled from live -> Stripe drops the client's quantities
 */

import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getAgency, getClient, updateAgency, updateClient, CLIENT_STATUSES, type ClientStatus } from '@/lib/white-label/store';
import { syncAgencyBilling } from '@/lib/white-label/billing';
import { mailClientLive, mailClientReview } from '@/lib/white-label/mail';
import { WL_LINES, wlClean } from '@/data/white-label';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const c = await getClient(id);
  if (!c) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const agency = await getAgency(c.agency_id);
  if (!agency) return NextResponse.json({ error: 'Agency missing.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { status?: ClientStatus; test_number?: string; notes?: string; lines?: string[] };
  const patch: Record<string, unknown> = {};
  if (typeof b.test_number === 'string') patch.test_number = wlClean(b.test_number, 40) || null;
  if (typeof b.notes === 'string') patch.notes = b.notes.slice(0, 2000);
  if (Array.isArray(b.lines)) patch.lines = b.lines.filter((x) => WL_LINES.some((l) => l.slug === x));
  const next = b.status && CLIENT_STATUSES.includes(b.status) && b.status !== c.status ? b.status : null;
  if (next) patch.status = next;
  if (next === 'live') patch.live_at = new Date().toISOString();
  if (next === 'review' && !(patch.test_number ?? c.test_number)) {
    return NextResponse.json({ error: 'Add the test number first: the agency email tells them what to call.' }, { status: 400 });
  }

  try {
    const updated = await updateClient(id, patch);
    let billing: Awaited<ReturnType<typeof syncAgencyBilling>> | null = null;
    if (next === 'review') await mailClientReview(agency, updated);
    if (next === 'live') {
      const active = agency.status === 'approved' ? await updateAgency(agency.id, { status: 'active' }) : agency;
      billing = await syncAgencyBilling(active, updated);
      await mailClientLive(active, updated, billing.ok ? { ok: true, monthly: billing.monthly } : { ok: false, error: billing.error });
    }
    if ((next === 'paused' || next === 'cancelled') && c.status === 'live') billing = await syncAgencyBilling(agency);
    return NextResponse.json({ ok: true, client: updated, billing });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save.' }, { status: 500 });
  }
}
