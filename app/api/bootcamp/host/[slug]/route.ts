import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { hostKeyValid } from '@/lib/bootcamp/key';
import { getHostBySlug, hostStats, listEvents } from '@/lib/bootcamp/store';

/**
 * The host dashboard's data. Signed with the host key minted on approval, so
 * the page at /bootcamp/host/[slug]?k= reads only its own room. Registrant
 * emails in the event feed are masked: the host sees that a seat was taken
 * and when, not who, because those people gave their address to us.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mask(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return null;
  const head = local.slice(0, 1);
  return `${head}${'*'.repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
}

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const k = new URL(req.url).searchParams.get('k');
  if (!slug || !hostKeyValid(slug, k)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const host = await getHostBySlug(sb, slug);
    if (!host) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const [stats, events] = await Promise.all([hostStats(sb, slug), listEvents(sb, { hostSlug: slug, limit: 20 })]);

    return NextResponse.json({
      host: {
        slug: host.slug,
        name: host.name,
        brand: host.brand,
        email: host.email,
        website: host.website,
        room: host.room,
        status: host.status,
        founding: host.founding,
        ticket_pct: host.ticket_pct,
        program_pct: host.program_pct,
        clicks: host.clicks,
        payout_email: host.payout_email,
        approved_at: host.approved_at,
        created_at: host.created_at,
      },
      stats,
      recent: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        email: mask(e.email),
        tier: typeof e.detail?.tier === 'string' ? e.detail.tier : null,
        cents: typeof e.detail?.cents === 'number' ? e.detail.cents : null,
        owedCents: typeof e.detail?.owedCents === 'number' ? e.detail.owedCents : null,
        at: e.created_at,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('bootcamp host dashboard failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
