/**
 * The QA strip: a partner's first three mints wait here. GET lists pending
 * holds with the minting partner joined in; POST approve releases one (stamps
 * the lead, bumps the partner's approval count, and finally sends the held
 * hand-off email). Three approvals and the partner's future mints flow free.
 */

import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { sendForgeHandoffEmail, PARTNER_FORGE_QA_LIFT } from '@/lib/partner-forge';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';

type PendingRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  created_at: string;
  hub_demo_url: string | null;
  site_demo_status: string | null;
  affiliate_id: string | null;
  affiliates: { name: string | null; email: string; code: string | null; forge_qa_approved: number } | null;
};

export async function GET() {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const { data, error } = await guard.supabase
    .from('outbound_leads')
    .select(
      'id, business_name, contact_name, city, state, website, created_at, hub_demo_url, site_demo_status, affiliate_id, affiliates (name, email, code, forge_qa_approved)'
    )
    .eq('forge_qa', 'pending')
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const pending = ((data || []) as unknown as PendingRow[]).map((r) => ({
    leadId: r.id,
    business: r.business_name,
    contact: r.contact_name,
    city: r.city,
    state: r.state,
    website: r.website,
    createdAt: r.created_at,
    hubUrl: r.hub_demo_url,
    siteStatus: r.site_demo_status,
    partner: r.affiliates
      ? { name: r.affiliates.name, email: r.affiliates.email, code: r.affiliates.code, approved: r.affiliates.forge_qa_approved, lift: PARTNER_FORGE_QA_LIFT }
      : null,
  }));

  return NextResponse.json({ pending });
}

export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  let body: { leadId?: string; action?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  if (body.action !== 'approve' || !body.leadId || !/^[0-9a-f-]{36}$/i.test(body.leadId)) {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  // Atomic release: only a still-pending row flips, so a double-click cannot
  // double-bump the partner's approval count or double-send the hand-off.
  const { data: lead, error: flipErr } = await guard.supabase
    .from('outbound_leads')
    .update({ forge_qa: 'approved' })
    .eq('id', body.leadId)
    .eq('forge_qa', 'pending')
    .select('id, business_name, contact_name, hub_demo_url, affiliate_id')
    .maybeSingle();
  if (flipErr) return NextResponse.json({ error: flipErr.message }, { status: 500 });
  if (!lead) return NextResponse.json({ error: 'not_pending' }, { status: 409 });

  let partnerNotified = false;
  if (lead.affiliate_id) {
    const { data: aff } = await guard.supabase
      .from('affiliates')
      .select('id, name, email')
      .eq('id', lead.affiliate_id)
      .maybeSingle();
    if (aff) {
      // Atomic server-side increment (055): two concurrent releases of two
      // different holds must both count.
      const { error: bumpErr } = await guard.supabase.rpc('bump_forge_qa', { p_affiliate: aff.id });
      if (bumpErr) console.error('bump_forge_qa failed:', bumpErr.message);
      if (process.env.RESEND_API_KEY && lead.hub_demo_url) {
        try {
          await sendForgeHandoffEmail(resendClient(), {
            minterEmail: aff.email as string,
            minterName: (aff.name as string) || (aff.email as string),
            business: lead.business_name,
            contact: lead.contact_name || 'there',
            hubUrl: lead.hub_demo_url,
          });
          partnerNotified = true;
        } catch (err) {
          console.error('forge-qa hand-off email failed', err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, partnerNotified });
}
