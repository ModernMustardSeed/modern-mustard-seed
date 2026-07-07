import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { smsConfigured } from '@/lib/sms';
import { buildRecipients, type Audience } from '@/lib/sms-campaigns';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** List campaigns (newest first) with their snapshot stats. */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { data } = await sb.from('sms_campaigns').select('*').order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ configured: smsConfigured(), campaigns: data ?? [] });
}

/** Create a campaign and build its personalized recipient set. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Give the campaign a name.' }, { status: 400 });
  const audience: Audience = body.audience || {};
  const useCustom = body.template_key === 'custom' && typeof body.custom_template === 'string' && body.custom_template.trim();

  const { data: campaign, error } = await sb.from('sms_campaigns').insert({
    name,
    created_by: user.email,
    template_key: useCustom ? 'custom' : 'auto',
    custom_template: useCustom ? String(body.custom_template).trim() : null,
    audience,
    status: 'draft',
    quiet_hours: body.quiet_hours !== false,
    verify_mobile: body.verify_mobile === true,
    throttle_per_min: Math.max(1, Math.min(Number(body.throttle_per_min) || 30, 60)),
  }).select('*').single();
  if (error || !campaign) return NextResponse.json({ error: error?.message || 'Create failed' }, { status: 500 });

  const built = await buildRecipients(sb, campaign);
  return NextResponse.json({ campaign: { ...campaign, status: 'ready' }, ...built });
}
