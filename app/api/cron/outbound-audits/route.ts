import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { runWebsiteAudit } from '@/lib/website-audit';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Hourly: audit ONE never-attempted outbound lead so fresh imports arrive on
 * the dial floor pre-armed. Spend guards fail closed: one metered audit per
 * run, a hard cap of 24 audit attempts per UTC day, and any counting error
 * skips the run entirely. Failed sites get audit_at stamped (score stays
 * null) so a dead domain is never retried on the meter; the cockpit's manual
 * re-run stays available.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
  const { count, error: countErr } = await sb
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .gte('audit_at', dayStart);
  if (countErr) return NextResponse.json({ skipped: 'count-failed (failing closed)', error: countErr.message });
  if ((count ?? 0) >= 24) return NextResponse.json({ skipped: 'daily-cap', today: count });

  const { data: lead } = await sb
    .from('outbound_leads')
    .select('id, business_name, website')
    .not('website', 'is', null)
    .is('audit_at', null)
    .in('status', ['new', 'contacted', 'callback'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lead) return NextResponse.json({ ok: true, audited: 0, note: 'nothing to audit' });

  const result = await runWebsiteAudit(lead.website as string);
  if (!result.ok) {
    await sb.from('outbound_leads').update({ audit_at: new Date().toISOString() }).eq('id', lead.id);
    return NextResponse.json({ ok: true, audited: 0, failed: lead.business_name, error: result.error });
  }

  await sb
    .from('outbound_leads')
    .update({
      audit_url: result.url,
      audit_score: Math.round(result.report.overall_score),
      audit_json: result.report,
      audit_at: new Date().toISOString(),
    })
    .eq('id', lead.id);

  return NextResponse.json({ ok: true, audited: 1, business: lead.business_name, score: Math.round(result.report.overall_score) });
}
