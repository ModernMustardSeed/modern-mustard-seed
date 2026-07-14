import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { createClientRequest } from '@/lib/client-requests';

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

  const { data: proj } = await sb
    .from('projects')
    .select('id, name, revisions_included, revisions_used, status')
    .ilike('client_email', session.email)
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!proj) return NextResponse.json({ project: null });

  const included = Number(proj.revisions_included ?? 0);
  const used = Number(proj.revisions_used ?? 0);
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
    },
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
    .select('id, revisions_included, revisions_used, status')
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

  const included = Number(proj.revisions_included ?? 0);
  return NextResponse.json({
    ok: true,
    revisionNumber: n,
    remaining: Math.max(0, included - n),
    id: result.id,
  });
}
