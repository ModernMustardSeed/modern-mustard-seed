import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { makeCodeSeed } from '@/lib/affiliate';
import { grantAllProducts } from '@/lib/entitlements';
import { normalizeEmail } from '@/lib/client-auth';
import { sendAffiliateWelcome } from '@/lib/affiliate-notify';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Add a partner directly from the back office, already approved. Generates a
 * unique code, grants free access to every product, and (unless told not to)
 * sends the welcome email with their passwordless login link. Idempotent by
 * email: re-adding an existing partner reuses their code.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { name?: string; email?: string; promoteWhere?: string; audience?: string; why?: string; sendWelcome?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? '');
  const name = (body.name ?? '').trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: 'Enter the partner name.' }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });

  try {
    const { data: existing } = await supabase.from('affiliates').select('id, code, status').eq('email', email).maybeSingle();

    // Already an active partner: reuse their code, do not regenerate.
    if (existing?.status === 'approved' && existing.code) {
      return NextResponse.json({ ok: true, code: existing.code, alreadyPartner: true, emailSent: false });
    }

    // Pick a unique referral code (reuse one already on the row if present).
    let code = existing?.code || makeCodeSeed(name || email);
    for (let i = 0; i < 6; i++) {
      const { data: clash } = await supabase.from('affiliates').select('id').eq('code', code).neq('email', email).maybeSingle();
      if (!clash) break;
      code = `${makeCodeSeed(name || email)}${i + 1}`;
    }

    const { error } = await supabase.from('affiliates').upsert(
      {
        email,
        name,
        promote_where: (body.promoteWhere ?? '').slice(0, 500),
        audience: (body.audience ?? '').slice(0, 500),
        why: (body.why ?? '').slice(0, 1000),
        status: 'approved',
        code,
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );
    if (error) return NextResponse.json({ error: error.message || 'Could not add the partner.' }, { status: 500 });

    // Free access to every product so they can speak to it honestly.
    await grantAllProducts(email, 'affiliate');

    // Welcome email with a passwordless link to the partner dashboard.
    let emailSent = false;
    if (body.sendWelcome !== false) {
      const origin = new URL(req.url).origin || 'https://modernmustardseed.com';
      const result = await sendAffiliateWelcome({ email, name, code }, origin);
      emailSent = result.sent;
      if (!result.sent) console.error('affiliate welcome email failed', result.error);
    }

    return NextResponse.json({ ok: true, code, emailSent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not add the partner.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

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
