import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { auditPreferringWorker } from '@/lib/audit-queue';

export const runtime = 'nodejs';
// See the outbound audit route: the model call is 36-43s on real prospect
// sites, so 60 left no headroom for a slow site to load.
export const maxDuration = 120;

/**
 * Run a website audit on a prospect's site, right from the call card, and cache
 * the result on the row so the per-lead script and the follow-up email can both
 * reference what we actually found. Pass `url` in the body to audit a specific
 * URL (and save it as the prospect's website); otherwise we use the saved one.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { url?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine, fall back to the saved website */
  }

  const { data: prospect, error: fetchErr } = await supabase
    .from('rep_prospects')
    .select('id, website')
    .eq('id', id)
    .single();
  if (fetchErr || !prospect) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });

  const targetUrl = (body.url ?? '').trim() || (prospect.website as string | null) || '';
  if (!targetUrl) {
    return NextResponse.json({ error: 'Add their website first, then run the audit.' }, { status: 400 });
  }

  // Prefers the local worker (free) and falls back to the metered API whenever
  // that worker is not answering, so the rep's experience is unchanged either
  // way. See lib/audit-queue.ts for the ordering and why.
  const outcome = await auditPreferringWorker(supabase, {
    url: targetUrl,
    sourceTable: 'rep_prospects',
    sourceId: id,
  });

  if (outcome.kind === 'error') {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  if (outcome.kind === 'queued') {
    // 202, and deliberately NOT an error: the audit is genuinely running and
    // will appear on the row shortly. The card reads `report` to decide
    // success, so this falls through to its message branch without pretending
    // the work failed.
    return NextResponse.json(
      { ok: true, queued: true, jobId: outcome.jobId, error: 'Audit is still running. It will appear on this lead in a minute.' },
      { status: 202 },
    );
  }

  // Persist the audit so it survives a reload and feeds the script + email.
  // The worker already files its own reports; this covers the API path and
  // keeps `website` in sync with whatever URL was actually graded.
  const { error: saveErr } = await supabase
    .from('rep_prospects')
    .update({
      website: targetUrl,
      audit_url: outcome.url,
      audit_score: Math.round(outcome.report.overall_score),
      audit_json: outcome.report,
      audit_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (saveErr) {
    // The audit still ran, so return it even if the cache write failed.
    return NextResponse.json({ ok: true, url: outcome.url, report: outcome.report, warning: 'Audit ran but could not be saved.' });
  }

  return NextResponse.json({ ok: true, url: outcome.url, report: outcome.report, via: outcome.via });
}
