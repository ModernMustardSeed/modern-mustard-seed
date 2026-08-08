import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { getMemberByEmail } from '@/lib/hundredfold-store';
import type { SystemRow } from '@/lib/hundredfold-store';
import { runBuild, runRevision, rollback, estimateCents, RESTYLE_INSTRUCTION } from '@/lib/hundredfold-factory';
import { readMeter } from '@/lib/hundredfold-credit';
import { needsApproval } from '@/lib/hundredfold-coach';

export const runtime = 'nodejs';
/** A page or a tool is a whole document. Give it the room a real build needs. */
export const maxDuration = 300;

/**
 * The member presses the button and the thing gets made.
 *
 * Scoped hard to the session email and re-checked against the row's own
 * member_id, so nobody can build (or approve, or publish) on somebody else's
 * arsenal by guessing an id. Same posture as the gate PATCH next door.
 *
 * POST { systemId, action?: 'build' | 'revise' | 'restyle' | 'rollback' | 'approve' | 'unpublish', instruction?, versionId? }
 *
 * `approve` exists because approval is the OWNER'S, and only the owner's. The
 * coach cannot grant it, the desk cannot grant it, and the factory refuses to
 * run a spending build without `approved_at` on the row.
 */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  let body: { systemId?: string; action?: string; instruction?: string; versionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }
  if (!body.systemId) return NextResponse.json({ error: 'systemId required' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 500 });

  const { data: system } = await sb
    .from('hundredfold_systems')
    .select('*')
    .eq('id', body.systemId)
    .maybeSingle();
  if (!system || system.member_id !== member.id) {
    return NextResponse.json({ error: 'Not yours' }, { status: 403 });
  }

  const row = system as SystemRow;
  const action = body.action ?? 'build';

  if (action === 'approve') {
    await sb
      .from('hundredfold_systems')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: session.email,
        status: 'queued',
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
    return NextResponse.json({ ok: true, approved: true });
  }

  if (action === 'revise' || action === 'restyle') {
    // "Match my brand" is a revision with a standing instruction, so it gets
    // the same snapshot, the same meter, and the same undo as any other edit.
    const ask = action === 'restyle' ? RESTYLE_INSTRUCTION : String(body.instruction ?? '');
    // The half Sarah asked for on 8/08: change what exists instead of
    // re-rolling it. runRevision snapshots the live version first, so this is
    // always undoable, and it never changes the published slug.
    const outcome = await runRevision(sb, member, row, ask, session.email);
    if (!outcome.ok) return NextResponse.json({ ok: false, reason: outcome.reason, meter: outcome.meter });
    return NextResponse.json({ ok: true, assets: outcome.assets, url: outcome.url, spentCents: outcome.spentCents, meter: outcome.meter });
  }

  if (action === 'rollback') {
    if (!body.versionId) return NextResponse.json({ error: 'versionId required' }, { status: 400 });
    const done = await rollback(sb, row, String(body.versionId), session.email);
    return NextResponse.json({ ok: done, reason: done ? undefined : 'That version is no longer available.' });
  }

  if (action === 'unpublish') {
    // The member's own off switch. /built/[slug] stops serving immediately.
    await sb
      .from('hundredfold_systems')
      .update({ status: 'retired', updated_at: new Date().toISOString() })
      .eq('id', row.id);
    return NextResponse.json({ ok: true, retired: true });
  }

  // Never let a double-click start a second expensive run on the same row.
  if (row.status === 'building') {
    return NextResponse.json({ ok: false, reason: 'That one is being built right now.' }, { status: 409 });
  }

  const outcome = await runBuild(sb, member, row);
  if (!outcome.ok) {
    return NextResponse.json({ ok: false, reason: outcome.reason, status: outcome.status, meter: outcome.meter });
  }
  return NextResponse.json({
    ok: true,
    assets: outcome.assets,
    url: outcome.url,
    spentCents: outcome.spentCents,
    meter: outcome.meter,
  });
}

/** The meter and what each pending build would cost, for the Command Center. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ ok: true, meter: null });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'unavailable' }, { status: 500 });

  const [meter, { data: subs }, { data: versions }] = await Promise.all([
    readMeter(sb, member),
    sb
      .from('hundredfold_tool_submissions')
      .select('id, system_id, name, email, phone, payload, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(50),
    sb
      .from('hundredfold_versions')
      .select('id, system_id, n, note, created_by, created_at')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(60),
  ]);

  return NextResponse.json({
    ok: true,
    meter,
    submissions: subs ?? [],
    versions: versions ?? [],
    estimates: {
      images: estimateCents('images'),
      page: estimateCents('page'),
      tool: estimateCents('tool'),
      pdf: estimateCents('pdf'),
      copy: estimateCents('copy'),
    },
    approvalNeeded: ['video', 'ad-campaign'].filter((k) => needsApproval(k)),
  });
}
