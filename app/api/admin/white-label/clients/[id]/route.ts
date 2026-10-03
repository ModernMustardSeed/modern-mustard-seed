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
import { wlClean } from '@/data/white-label';
import { deliveries, emptyDelivery, saveDelivery, safeReviewUrl, serviceConflict, launchError } from '@/lib/white-label/delivery';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getAdminUser())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const c = await getClient(id);
  if (!c) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const agency = await getAgency(c.agency_id);
  if (!agency) return NextResponse.json({ error: 'Agency missing.' }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { status?: ClientStatus; test_number?: string; notes?: string; lines?: string[]; review_url?: string; delivery_summary?: string; resolve_feedback?: boolean };
  const patch: Record<string, unknown> = {};
  if (typeof b.test_number === 'string') patch.test_number = wlClean(b.test_number, 40) || null;
  if (typeof b.notes === 'string') patch.notes = b.notes.slice(0, 2000);
  if (Array.isArray(b.lines)) {
    return NextResponse.json({ error: 'Service changes need a fresh project and approval so the agreed billing stays intact.' }, { status: 409 });
  }
  const next = b.status && CLIENT_STATUSES.includes(b.status) && b.status !== c.status ? b.status : null;
  if (next) patch.status = next;
  if (next === 'live') patch.live_at = new Date().toISOString();
  try {
    const priorDelivery = { ...emptyDelivery, ...(await deliveries([id]))[id] };
    const delivery = { ...priorDelivery };
    if (b.review_url !== undefined) {
      delivery.url = safeReviewUrl(b.review_url);
      if (b.review_url && !delivery.url) return NextResponse.json({ error: 'Use a complete HTTPS preview URL.' }, { status: 400 });
    }
    if (typeof b.delivery_summary === 'string') delivery.summary = b.delivery_summary.trim().slice(0, 3000);
    if (delivery.url !== priorDelivery.url || delivery.summary !== priorDelivery.summary || (patch.test_number !== undefined && patch.test_number !== c.test_number)) patch.agency_approved_at = null;
    if (b.resolve_feedback && c.status === 'live') { delivery.feedback = ''; delivery.feedbackAt = null; }
    if (next === 'review') { delivery.feedback = ''; delivery.feedbackAt = null; patch.agency_approved_at = null; }
    const failure = serviceConflict(c.lines) || launchError(c.status, next, patch.agency_approved_at === null ? null : c.agency_approved_at, c.lines, (patch.test_number !== undefined ? patch.test_number : c.test_number) as string | null, delivery);
    if (failure) return NextResponse.json({ error: failure }, { status: 409 });
    if (next === 'live' && !['approved', 'active'].includes(agency.status)) return NextResponse.json({ error: 'Activate this agency before launching a client.' }, { status: 409 });
    if (c.status === 'live' && next && !['paused', 'cancelled'].includes(next)) return NextResponse.json({ error: 'Live services stay live during included revisions. Pause explicitly to stop the service and recurring billing.' }, { status: 409 });
    if (next === 'building') patch.agency_approved_at = null;
    await saveDelivery(id, delivery);
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
