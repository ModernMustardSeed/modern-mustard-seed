import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { createClientRequest } from '@/lib/client-requests';
import { queueProjectEdit, EDIT_FAIR_USE_CAP, EDIT_FAIR_USE_DAYS } from '@/lib/site-edit';
import { likeLiteral } from '@/lib/sql-like';

export const runtime = 'nodejs';

/**
 * MAKE AN EDIT. THERE IS NO BUDGET.
 *
 * Edits are unlimited and included, forever, before launch and after (decided
 * 2026-08-03). There is no counter in front of the client, no third-edit price, and
 * no plan to upgrade to. They type the change, the forge builds it into a draft
 * within minutes, they preview it and ship it themselves.
 *
 * Behind the glass it is still hard-capped, because every edit is real forge spend
 * and the never-leak-revenue rule has no exceptions. claim_revision() (migration 078)
 * does the fair-use check and the increment in ONE locked statement and FAILS CLOSED,
 * so two tabs, a double-click, or a retry cannot run the forge twice.
 *
 * Hitting the ceiling is NOT an error, and it must never silently swallow the
 * client's words. We return 200 with sentAsNote:true and record the same text as a
 * note Sarah answers by hand. Losing what a paying customer typed would be the worst
 * possible failure mode here.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ project: null });

  // Light columns only: never ship site_html / site_html_draft on a poll (megabytes).
  const { data: proj } = await sb
    .from('projects')
    .select('id, name, revisions_used, status, site_published_at, edit_status, edit_instruction')
    .ilike('client_email', likeLiteral(session.email))
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!proj) return NextResponse.json({ project: null });

  // Does a real site exist to edit? A cheap count, not the html itself.
  const { count: siteCount } = await sb
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('id', proj.id)
    .not('site_html', 'is', null);
  const hasSite = (siteCount ?? 0) > 0;

  const editStatus = (proj.edit_status as string | null) ?? null;

  return NextResponse.json({
    project: {
      id: proj.id,
      name: proj.name,
      // The lifetime ledger, shown as reassurance ("4 edits so far"), never as a
      // limit. The fair-use ceiling is deliberately not exposed to the client.
      used: Number(proj.revisions_used ?? 0),
      hasSite,
      published: Boolean(proj.site_published_at),
    },
    // The in-flight edit, so the card can show "building" then the preview + ship.
    // 'ready' means the worker wrote a draft (edit_status is only ready with a draft).
    edit: editStatus
      ? { status: editStatus, instruction: (proj.edit_instruction as string | null) ?? null }
      : null,
  });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let payload: { body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const text = (payload.body || '').trim();
  if (!text) return NextResponse.json({ error: 'Tell us what to change first.' }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: 'That is a bit long. Trim it down.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: proj } = await sb
    .from('projects')
    .select('id, name, revisions_used, status, site_html, site_published_at, edit_status')
    .ilike('client_email', likeLiteral(session.email))
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // No project with editing turned on: fall back to a plain note rather than
  // dropping what they wrote.
  if (!proj) {
    const note = await createClientRequest({ email: session.email, body: text, source: 'note' });
    if (!note.ok) return NextResponse.json({ error: note.error ?? 'Could not send.' }, { status: 500 });
    return NextResponse.json({ ok: true, sentAsNote: true });
  }

  const { data: claimed, error: capErr } = await sb.rpc('claim_revision', {
    p_project_id: proj.id,
    p_cap: EDIT_FAIR_USE_CAP,
    p_period_days: EDIT_FAIR_USE_DAYS,
  });
  const n = typeof claimed === 'number' ? claimed : -1;

  if (capErr || n < 1) {
    if (capErr) console.error('claim_revision failed:', capErr.message);
    // Past the fair-use ceiling for this window (or the claim failed). Record it as
    // a note so the words are never lost, and tell them the truth: a human has it.
    const note = await createClientRequest({
      email: session.email,
      body: text,
      source: 'note',
      projectId: proj.id,
    });
    if (!note.ok) return NextResponse.json({ error: note.error ?? 'Could not send.' }, { status: 500 });
    return NextResponse.json({
      ok: true,
      sentAsNote: true,
      message: 'That is a lot of changes in one month, so this one goes straight to Sarah instead of the robot. She will take care of it personally.',
    });
  }

  const result = await createClientRequest({
    email: session.email,
    body: text,
    source: 'revision',
    projectId: proj.id,
    revisionNumber: n,
  });

  // The edit is already claimed. If the request row failed to write, hand it back
  // rather than spending their fair-use window on a message that does not exist.
  if (!result.ok) {
    await sb.rpc('refund_revision', { p_project_id: proj.id });
    return NextResponse.json({ error: result.error ?? 'Could not send.' }, { status: 500 });
  }

  // AUTO-APPLY IT, but never straight to the live site. When their real site already
  // exists, queue the edit against a copy: the forge builds it into a draft they
  // preview and ship themselves. If the site is not built yet, there is nothing to
  // edit against, so it stays a request for Sarah.
  let applying = false;
  if (typeof proj.site_html === 'string' && proj.site_html.length > 500) {
    const { data: order } = await sb
      .from('demo_orders')
      .select('outbound_lead_id, business_name')
      .eq('project_id', proj.id)
      .maybeSingle();
    const queued = await queueProjectEdit(sb, {
      projectId: proj.id as string,
      leadId: (order?.outbound_lead_id as string | null) ?? null,
      business: String(order?.business_name ?? proj.name ?? 'the business'),
      currentHtml: proj.site_html as string,
      instruction: text,
      requestedBy: session.email,
    });
    applying = queued.ok;
  }

  return NextResponse.json({ ok: true, revisionNumber: n, id: result.id, applying });
}
