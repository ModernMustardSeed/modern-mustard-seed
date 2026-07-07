import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { computeStats } from '@/lib/sms-campaigns';

export const runtime = 'nodejs';

/** Campaign detail: the row, live stats, and a preview slice of recipients. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;

  const { data: campaign } = await sb.from('sms_campaigns').select('*').eq('id', id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const stats = await computeStats(sb, id);
  const { data: recipients } = await sb
    .from('sms_campaign_recipients')
    .select('id,business,phone,body,status,error,sent_at')
    .eq('campaign_id', id)
    .order('updated_at', { ascending: false })
    .limit(100);
  return NextResponse.json({ campaign, stats, recipients: recipients ?? [] });
}

/** Control a campaign: start / pause / resume / cancel. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const { action } = await req.json().catch(() => ({ action: '' }));

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (action === 'start' || action === 'resume') { patch.status = 'sending'; patch.started_at = now; }
  else if (action === 'pause') patch.status = 'paused';
  else if (action === 'cancel') patch.status = 'cancelled';
  else return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  const { error } = await sb.from('sms_campaigns').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: patch.status });
}
