import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { armOutreach, outreachSummary } from '@/lib/bootcamp/outreach';
import { handMessage } from '@/lib/bootcamp/outreach-copy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CAP_MIN = 1;
const CAP_MAX = 12;

/**
 * GET: the outreach list with the switch state. Hand rows (a form, a booking
 * page or a DM instead of an email) carry the rendered message so the desk can
 * copy it with one tap.
 *
 * POST { action: 'arm' | 'disarm' | 'cap', dailyCap? }: the switch. Arming
 * with a cap sets both. 'cap' changes the ceiling without touching armed.
 */
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const url = new URL(req.url);
  const status = (url.searchParams.get('status') || '').trim();
  const vertical = (url.searchParams.get('vertical') || '').trim();

  try {
    let q = sb
      .from('bootcamp_outreach')
      .select('id, name, brand, email, contact_path, contact_type, platforms, audience, sells, hook, vertical, fit, tier, status, step, next_at, last_sent_at, replied_at, host_slug, notes, created_at')
      .order('fit', { ascending: false })
      .order('tier', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(1000);
    if (status) q = q.eq('status', status);
    if (vertical) q = q.eq('vertical', vertical);

    const [{ data, error }, summary] = await Promise.all([q, outreachSummary(sb)]);
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((r) => ({
      ...r,
      message: r.status === 'hand' || r.contact_type !== 'email' ? handMessage(r) : null,
    }));

    const verticals = Array.from(new Set(rows.map((r) => r.vertical).filter(Boolean))).sort();
    return NextResponse.json({ ok: true, rows, summary, verticals });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load outreach.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { action?: string; dailyCap?: number };
  const action = body.action;
  if (action !== 'arm' && action !== 'disarm' && action !== 'cap') {
    return NextResponse.json({ error: 'action must be arm, disarm or cap.' }, { status: 400 });
  }

  try {
    const current = await outreachSummary(sb);
    const requested = Number(body.dailyCap);
    const cap = Number.isFinite(requested) && requested > 0 ? Math.min(CAP_MAX, Math.max(CAP_MIN, Math.round(requested))) : current.state.dailyCap || CAP_MAX;

    if (action === 'arm') await armOutreach(sb, { armed: true, dailyCap: cap });
    else if (action === 'disarm') await armOutreach(sb, { armed: false, dailyCap: cap });
    else await armOutreach(sb, { dailyCap: cap });

    const summary = await outreachSummary(sb);
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not change the switch.' }, { status: 500 });
  }
}
