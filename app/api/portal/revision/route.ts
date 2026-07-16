import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { createClientRequest } from '@/lib/client-requests';
import { queueProjectEdit, PAID_EDIT_PRICE_CENTS, CARE_PLAN_PRICE_CENTS, CARE_EDITS_CAP, CARE_PERIOD_DAYS } from '@/lib/site-edit';

export const runtime = 'nodejs';

/**
 * SPEND ONE OF THE TWO FREE EDITS.
 *
 * The demo offer promises "two free edits before it goes live." Until now that
 * promise existed only in Sarah's head and in the sales copy: there was no counter,
 * no ledger, and no way for either side to know whether an edit was the first, the
 * second, or the ninth. A client asked for changes by email and Sarah did them until
 * she felt it was enough, which is exactly how an offer quietly becomes unlimited.
 *
 * The budget is spent through claim_revision() (migration 049), which does the check
 * and the increment in ONE statement and FAILS CLOSED. Two tabs, a double-click, or a
 * retry cannot conjure a third free edit.
 *
 * Running out is NOT an error, and it must never silently swallow the client's words.
 * We return 200 with exhausted:true and let them send the same text as a regular note
 * that Sarah quotes. Refusing to record what a paying customer typed would be the
 * worst possible failure mode here.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ project: null });

  // Light columns only: never ship site_html / site_html_draft on a poll (megabytes).
  const { data: proj } = await sb
    .from('projects')
    .select('id, name, revisions_included, revisions_used, status, site_published_at, edit_status, edit_instruction, edit_paid, care_plan, care_edits_used, care_period_start, paid_edits_count')
    .ilike('client_email', session.email)
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

  const included = Number(proj.revisions_included ?? 0);
  const used = Number(proj.revisions_used ?? 0);
  const editStatus = (proj.edit_status as string | null) ?? null;

  // Care Plan: show this rolling window's usage. A lapsed window reads as 0 used
  // (the atomic claim resets it on the next edit anyway).
  const carePlan = Boolean(proj.care_plan);
  const carePeriodStart = proj.care_period_start ? new Date(proj.care_period_start as string).getTime() : 0;
  const careLapsed = !carePeriodStart || Date.now() - carePeriodStart >= CARE_PERIOD_DAYS * 86400000;
  const careUsed = carePlan && !careLapsed ? Number(proj.care_edits_used ?? 0) : 0;

  return NextResponse.json({
    project: {
      id: proj.id,
      name: proj.name,
      included,
      used,
      remaining: Math.max(0, included - used),
      // Once it is launched the free-edit window is over by definition; the offer
      // says "before it goes live".
      closed: proj.status === 'launched',
      hasSite,
      published: Boolean(proj.site_published_at),
      carePlan,
      careUsed,
      careCap: CARE_EDITS_CAP,
      paidCount: Number(proj.paid_edits_count ?? 0),
    },
    // The in-flight edit, so the card can show "building" then the preview + ship.
    // 'ready' means the worker wrote a draft (edit_status is only ready with a draft).
    edit: editStatus
      ? { status: editStatus, instruction: (proj.edit_instruction as string | null) ?? null, paid: Boolean(proj.edit_paid) }
      : null,
    editPriceCents: PAID_EDIT_PRICE_CENTS,
    carePlanPriceCents: CARE_PLAN_PRICE_CENTS,
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
    .select('id, name, revisions_included, revisions_used, status, site_html, site_published_at, edit_status, care_plan')
    .ilike('client_email', session.email)
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // No project with a budget: fall back to a plain note rather than dropping it.
  if (!proj) {
    const note = await createClientRequest({ email: session.email, body: text, source: 'note' });
    if (!note.ok) return NextResponse.json({ error: note.error ?? 'Could not send.' }, { status: 500 });
    return NextResponse.json({ ok: true, exhausted: true, sentAsNote: true });
  }

  // A shared helper: record the change and auto-apply it to a DRAFT (never the live
  // site) when a real site exists. Used by both the Care Plan and free-edit paths.
  const applyEdit = async (revisionNumber: number, care: boolean) => {
    const result = await createClientRequest({ email: session.email, body: text, source: 'revision', projectId: proj.id as string, revisionNumber });
    if (!result.ok) return { ok: false as const, error: result.error ?? 'Could not send.' };
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
        care,
      });
      applying = queued.ok;
    }
    return { ok: true as const, id: result.id, applying };
  };

  // ── CARE PLAN: every edit included. Spend a fair-use care edit (atomic, capped). ──
  if (proj.care_plan) {
    const { data: careClaim, error: careErr } = await sb.rpc('claim_care_edit', {
      p_project_id: proj.id,
      p_cap: CARE_EDITS_CAP,
      p_period_days: CARE_PERIOD_DAYS,
    });
    const cn = typeof careClaim === 'number' ? careClaim : -1;
    if (careErr || cn < 1) {
      if (careErr) console.error('claim_care_edit failed:', careErr.message);
      // Over the fair-use cap for the window: keep the words, tell the truth.
      const note = await createClientRequest({ email: session.email, body: text, source: 'note', projectId: proj.id as string });
      if (!note.ok) return NextResponse.json({ error: note.error ?? 'Could not send.' }, { status: 500 });
      return NextResponse.json({
        ok: true,
        exhausted: true,
        sentAsNote: true,
        message: `You have reached this month's fair-use limit of ${CARE_EDITS_CAP} edits. I sent this one to Sarah, and your included edits reset next month.`,
      });
    }
    const applied = await applyEdit(cn, true);
    if (!applied.ok) return NextResponse.json({ error: applied.error }, { status: 500 });
    return NextResponse.json({ ok: true, care: true, applying: applied.applying, id: applied.id });
  }

  const { data: claimed, error: capErr } = await sb.rpc('claim_revision', { p_project_id: proj.id });
  const n = typeof claimed === 'number' ? claimed : -1;

  if (capErr || n < 1) {
    if (capErr) console.error('claim_revision failed:', capErr.message);
    // Out of free edits (or the claim failed). Record it as a note so the words are
    // never lost, and tell them the truth: this one gets quoted.
    const note = await createClientRequest({
      email: session.email,
      body: text,
      source: 'note',
      projectId: proj.id,
    });
    if (!note.ok) return NextResponse.json({ error: note.error ?? 'Could not send.' }, { status: 500 });
    return NextResponse.json({
      ok: true,
      exhausted: true,
      sentAsNote: true,
      message: 'Both free edits are used, so I sent this to Sarah as a change request. She will come back with a price before anyone touches anything.',
    });
  }

  const result = await createClientRequest({
    email: session.email,
    body: text,
    source: 'revision',
    projectId: proj.id,
    revisionNumber: n,
  });

  // The revision is already spent. If the request row failed to write, hand the
  // edit back rather than charging them for a message that does not exist.
  if (!result.ok) {
    await sb
      .from('projects')
      .update({ revisions_used: Math.max(0, n - 1) })
      .eq('id', proj.id)
      .eq('revisions_used', n);
    return NextResponse.json({ error: result.error ?? 'Could not send.' }, { status: 500 });
  }

  // AUTO-APPLY IT, but never to the live site. When their real site already exists,
  // queue the edit against a copy: the forge builds it into a draft, and it reaches
  // their domain only after Sarah approves it on the delivery board. If the site is
  // not built yet, there is nothing to edit against, so it stays a request for Sarah.
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

  const included = Number(proj.revisions_included ?? 0);
  return NextResponse.json({
    ok: true,
    revisionNumber: n,
    remaining: Math.max(0, included - n),
    id: result.id,
    applying,
  });
}
