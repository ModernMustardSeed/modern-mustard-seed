/**
 * Owner-only governance for the partner forge: grant/revoke can_forge and set
 * the per-partner caps. Granting forge access grants spend, so this is the one
 * affiliate action gated on role 'owner' rather than any admin session.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAdminUser } from '@/lib/admin-auth';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

const MAX_DAILY = 10;
const MAX_WEEKLY = 30;

export async function POST(req: Request, { params }: { params: Params }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'owner') return NextResponse.json({ error: 'Owner only' }, { status: 403 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const { id } = await params;
  let body: { action?: string; dailyCap?: number; weeklyCap?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (body.action === 'grant' || body.action === 'revoke') {
    const { error } = await supabase
      .from('affiliates')
      .update({ can_forge: body.action === 'grant' })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, canForge: body.action === 'grant' });
  }

  if (body.action === 'set-caps') {
    const daily = Math.max(0, Math.min(MAX_DAILY, Math.floor(Number(body.dailyCap))));
    const weekly = Math.max(0, Math.min(MAX_WEEKLY, Math.floor(Number(body.weeklyCap))));
    if (!Number.isFinite(daily) || !Number.isFinite(weekly)) {
      return NextResponse.json({ error: 'bad_caps' }, { status: 400 });
    }
    const { error } = await supabase
      .from('affiliates')
      .update({ forge_daily_cap: daily, forge_weekly_cap: weekly })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, dailyCap: daily, weeklyCap: weekly });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}
