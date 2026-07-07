import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { smsConfigured } from '@/lib/sms';
import { drainBatch } from '@/lib/sms-campaigns';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Send the next batch of a campaign on demand (the "Send next batch" button).
 * Flips a ready campaign to sending. Batch size defaults to 25 (?n= to override).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!smsConfigured()) return NextResponse.json({ error: 'Texting is not wired yet. Add the Twilio credentials to turn it on.' }, { status: 400 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;

  const { data: campaign } = await sb.from('sms_campaigns').select('*').eq('id', id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (['paused', 'cancelled', 'done'].includes(campaign.status)) {
    return NextResponse.json({ error: `Campaign is ${campaign.status}.` }, { status: 409 });
  }
  if (campaign.status !== 'sending') {
    await sb.from('sms_campaigns').update({ status: 'sending', started_at: new Date().toISOString() }).eq('id', id);
  }

  const n = Math.max(1, Math.min(Number(new URL(req.url).searchParams.get('n')) || 25, 50));
  const res = await drainBatch(sb, campaign, n);
  return NextResponse.json(res);
}
