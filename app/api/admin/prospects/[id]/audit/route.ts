import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { runWebsiteAudit } from '@/lib/website-audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

  const result = await runWebsiteAudit(targetUrl);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Persist the audit so it survives a reload and feeds the script + email.
  const { error: saveErr } = await supabase
    .from('rep_prospects')
    .update({
      website: targetUrl,
      audit_url: result.url,
      audit_score: Math.round(result.report.overall_score),
      audit_json: result.report,
      audit_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (saveErr) {
    // The audit still ran, so return it even if the cache write failed.
    return NextResponse.json({ ok: true, url: result.url, report: result.report, warning: 'Audit ran but could not be saved.' });
  }

  return NextResponse.json({ ok: true, url: result.url, report: result.report });
}
