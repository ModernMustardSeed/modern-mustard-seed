import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { auditWorkerAlive } from '@/lib/audit-queue';
import { runWebsiteAudit } from '@/lib/website-audit';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * How many leads to hand the worker per hourly run. Free, so the old spend cap
 * does not apply, but still bounded: the worker is serial at roughly a minute
 * a site, so ten an hour is already more than it can drain and anything larger
 * just builds a backlog that hides how far behind it is.
 */
const ENQUEUE_PER_RUN = 10;

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

  /**
   * THE FREE ROAD, taken whenever the local worker is answering.
   *
   * The daily cap below exists purely because each audit used to cost money.
   * Work handed to the worker costs nothing, so the cap does not apply and the
   * hourly one-lead trickle (24 a day at best, and only when nothing failed)
   * can become a real batch. The worker drains them one at a time on Sarah's
   * machine and files each report onto the lead itself.
   */
  if (await auditWorkerAlive(sb)) {
    const { data: candidates } = await sb
      .from('outbound_leads')
      .select('id, business_name, website')
      .not('website', 'is', null)
      .is('audit_at', null)
      .in('status', ['new', 'contacted', 'callback'])
      .order('created_at', { ascending: false })
      .limit(ENQUEUE_PER_RUN * 3);

    if (!candidates?.length) return NextResponse.json({ ok: true, queued: 0, note: 'nothing to audit' });

    // Never enqueue a lead that is already waiting. Nothing marks the row as
    // claimed (audit_at would read as "already audited"), so without this the
    // hourly run stacks a fresh duplicate job every hour and the worker grades
    // the same site over and over.
    const { data: pending } = await sb
      .from('audit_jobs')
      .select('source_id')
      .eq('source_table', 'outbound_leads')
      .in('status', ['queued', 'running']);
    const waiting = new Set((pending ?? []).map((p) => p.source_id as string));

    const fresh = candidates.filter((c) => !waiting.has(c.id as string)).slice(0, ENQUEUE_PER_RUN);
    if (!fresh.length) return NextResponse.json({ ok: true, queued: 0, note: 'all candidates already queued', waiting: waiting.size });

    const { error: insErr } = await sb.from('audit_jobs').insert(
      fresh.map((lead) => ({ target_url: lead.website as string, source_table: 'outbound_leads', source_id: lead.id as string })),
    );
    if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, queued: fresh.length, engine: 'claude-code (local worker)', businesses: fresh.map((f) => f.business_name) });
  }

  // THE METERED ROAD. Unchanged, and still fails closed on every count error.
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
