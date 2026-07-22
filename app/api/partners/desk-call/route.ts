import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { getSupabase } from '@/lib/supabase';
import { partnerDeskPrompt, forgeDeskCall } from '@/lib/mustard-desk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Forge Mr. Mustard's PARTNER desk call for the signed-in, APPROVED partner.
 * Same numbers the /partners/hq page renders: clicks, sales, and earnings by
 * status, all scoped to this partner's code.
 */
export async function POST() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const affiliate = await getAffiliateByEmail(session.email);
  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) {
    return NextResponse.json({ error: 'not_a_partner' }, { status: 403 });
  }
  const code = affiliate.code;

  let clicks = 0;
  let sales = 0;
  let pending = 0;
  let payable = 0;
  let paid = 0;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const [{ count }, { data: commissions }] = await Promise.all([
        supabase.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('code', code),
        supabase.from('commissions').select('amount_cents, status').eq('affiliate_code', code),
      ]);
      clicks = count ?? 0;
      for (const c of commissions ?? []) {
        if (c.status !== 'clawed_back') sales += 1;
        const cents = Number(c.amount_cents) || 0;
        if (c.status === 'pending') pending += cents;
        else if (c.status === 'payable') payable += cents;
        else if (c.status === 'paid') paid += cents;
      }
    } catch { /* stats optional; the desk degrades to rules-only */ }
  }

  const forged = await forgeDeskCall('partner', {
    greetName: affiliate.name || session.email.split('@')[0],
    email: session.email,
    systemPrompt: partnerDeskPrompt({
      email: session.email,
      code,
      clicks,
      sales,
      pendingUsd: pending / 100,
      payableUsd: payable / 100,
      paidUsd: paid / 100,
    }),
    keyterms: [code, 'Sidekick'],
  });
  if (!forged.ok) return NextResponse.json({ error: forged.error }, { status: 503 });
  return NextResponse.json({ call: forged.call });
}
