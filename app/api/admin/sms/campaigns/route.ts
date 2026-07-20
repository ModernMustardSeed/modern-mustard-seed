import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { smsConfigured } from '@/lib/sms';
import { buildRecipients, type Audience } from '@/lib/sms-campaigns';
import { ensureOptOut, toGsmAscii } from '@/lib/sms-templates';

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

  /**
   * Any preset other than "auto" resolves to a frozen body here: the builder
   * sends the (possibly hand-edited) preset text, we bake the campaign link in,
   * force GSM-safe ASCII, and guarantee the STOP line. "auto" alone falls
   * through to the per-lead Cahill generator in buildRecipients.
   */
  const templateKey = String(body.template_key || 'auto');
  const rawTemplate = typeof body.custom_template === 'string' ? body.custom_template.trim() : '';
  const link = typeof body.link === 'string' ? body.link.trim() : '';
  const useCustom = templateKey !== 'auto' && rawTemplate.length > 0;

  if (useCustom && /\{\{\s*link\s*\}\}/i.test(rawTemplate) && !link) {
    return NextResponse.json({ error: 'That template includes a link. Add the URL or remove the {{link}} token.' }, { status: 400 });
  }

  const resolvedTemplate = useCustom
    ? ensureOptOut(toGsmAscii(rawTemplate.replace(/\{\{\s*link\s*\}\}/gi, link)))
    : null;

  const { data: campaign, error } = await sb.from('sms_campaigns').insert({
    name,
    created_by: user.email,
    template_key: useCustom ? templateKey : 'auto',
    custom_template: resolvedTemplate,
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
