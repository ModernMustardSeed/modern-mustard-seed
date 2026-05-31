import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Back-office affiliate list with each partner's clicks, sales, and earnings. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const [{ data: affiliates }, { data: commissions }, { data: clicks }] = await Promise.all([
      supabase.from('affiliates').select('*').order('created_at', { ascending: false }),
      supabase.from('commissions').select('affiliate_code, amount_cents, status, kind'),
      supabase.from('affiliate_clicks').select('code'),
    ]);

    const clickCount: Record<string, number> = {};
    for (const c of clicks ?? []) clickCount[c.code as string] = (clickCount[c.code as string] ?? 0) + 1;

    const earn: Record<string, { sales: number; pending: number; payable: number; paid: number }> = {};
    for (const c of commissions ?? []) {
      const code = c.affiliate_code as string;
      const e = (earn[code] ||= { sales: 0, pending: 0, payable: 0, paid: 0 });
      if (c.status !== 'clawed_back') e.sales += 1;
      const cents = Number(c.amount_cents) || 0;
      if (c.status === 'pending') e.pending += cents;
      else if (c.status === 'payable') e.payable += cents;
      else if (c.status === 'paid') e.paid += cents;
    }

    const rows = (affiliates ?? []).map((a) => {
      const code = (a.code as string) || '';
      const e = earn[code] || { sales: 0, pending: 0, payable: 0, paid: 0 };
      return {
        ...a,
        clicks: code ? clickCount[code] ?? 0 : 0,
        sales: e.sales,
        pendingCents: e.pending,
        payableCents: e.payable,
        paidCents: e.paid,
      };
    });

    // Totals for the header.
    const totals = rows.reduce(
      (acc, r) => ({
        partners: acc.partners + (r.status === 'approved' ? 1 : 0),
        pending: acc.pending + (r.status === 'pending' ? 1 : 0),
        payableCents: acc.payableCents + r.payableCents,
        salesCents: acc.salesCents + r.pendingCents + r.payableCents + r.paidCents,
      }),
      { partners: 0, pending: 0, payableCents: 0, salesCents: 0 }
    );

    return NextResponse.json({ affiliates: rows, totals });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg, affiliates: [], needsMigration: true }, { status: 500 });
  }
}
