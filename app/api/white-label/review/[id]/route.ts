import { NextResponse } from 'next/server';
import { getAgency, getClient, updateClient } from '@/lib/white-label/store';
import { accessKeyValid } from '@/lib/white-label/key';
import { deliveries, emptyDelivery, saveDelivery } from '@/lib/white-label/delivery';
import { agencyFromKey } from '@/lib/white-label/portal';

export const runtime = 'nodejs';

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const key = typeof b.k === 'string' ? b.k : '';
  if (!accessKeyValid('review', id, key) && !(typeof b.slug === 'string' && await agencyFromKey(b.slug, key))) return NextResponse.json({ error: 'Open the current review link from your agency.' }, { status: 401 });
  try {
    const client = await getClient(id);
    if (!client) return NextResponse.json({ error: 'Review not found.' }, { status: 404 });
    const agency = await getAgency(client.agency_id);
    if (!agency || !['approved', 'active'].includes(agency.status) || (b.slug && agency.slug !== b.slug)) return NextResponse.json({ error: 'This review is not active.' }, { status: 403 });
    if (!['review', 'live', 'building'].includes(client.status)) return NextResponse.json({ error: 'This delivery is not open for changes yet.' }, { status: 409 });
    const feedback = typeof b.feedback === 'string' ? b.feedback.trim().slice(0, 3000) : '';
    if (feedback.length < 10) return NextResponse.json({ error: 'Describe the change in at least 10 characters so we can act on it.' }, { status: 400 });
    const delivery = (await deliveries([id]))[id] ?? emptyDelivery;
    const at = new Date().toISOString();
    await saveDelivery(id, { ...delivery, feedback: [delivery.feedback, feedback].filter(Boolean).join('\n\n').slice(-12000), feedbackAt: at, requests: [...(delivery.requests ?? []), { text: feedback, at }].slice(-100) });
    await updateClient(id, { agency_approved_at: null });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('white label feedback save failed', err);
    return NextResponse.json({ error: 'Your change was not saved. Retry, or ask your agency to add it in their portal.' }, { status: 500 });
  }
}
