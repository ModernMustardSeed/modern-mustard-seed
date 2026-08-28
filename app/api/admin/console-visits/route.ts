import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Has he opened it yet?
 *
 * Sarah, 2026-08-28, minutes after sending Heath his console link. The answer
 * was a shrug, and a shrug is the wrong answer to the only question that
 * matters after a delivery email goes out.
 *
 * Cornerstone records who opened a console, from the browser, so nothing that
 * is not a person is ever counted. This is the seam that brings it back here,
 * onto the card where she is already looking. Two separate Supabase projects on
 * purpose, so it is a fetch and a bearer token rather than a shared database.
 *
 * A client with no Cornerstone tenant gets an empty answer and no error: most
 * clients do not have one, and the panel simply does not render for them.
 */

const CORNERSTONE =
  process.env.CORNERSTONE_URL ?? 'https://cornerstone-psi.vercel.app';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = process.env.VISITS_READ_TOKEN;
  if (!token) return NextResponse.json({ visits: [], reason: 'not configured' });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ visits: [] });

  /* Which Cornerstone tenant is theirs. Stored on the client_products row for
   * the software, because that is the record that already knows they have one. */
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ visits: [] });
  const { data: product } = await sb
    .from('client_products')
    .select('detail, home_url, tier')
    .ilike('client_email', email)
    .eq('kind', 'software')
    .maybeSingle();
  if (!product) return NextResponse.json({ visits: [] });

  const companyId =
    process.env.CORNERSTONE_COMPANY_ID_OVERRIDE ??
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(
      `${product.detail ?? ''} ${product.home_url ?? ''} ${product.tier ?? ''}`,
    )?.[1];
  if (!companyId) return NextResponse.json({ visits: [], reason: 'no tenant on file' });

  try {
    const r = await fetch(
      `${CORNERSTONE}/api/visits?company=${encodeURIComponent(companyId)}&days=30`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
    if (!r.ok) return NextResponse.json({ visits: [], reason: `console said ${r.status}` });
    const d = (await r.json()) as { visits?: unknown[] };
    return NextResponse.json({ visits: d.visits ?? [] });
  } catch {
    return NextResponse.json({ visits: [], reason: 'could not reach the console' });
  }
}
