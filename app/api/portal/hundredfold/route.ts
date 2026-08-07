import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import {
  getMemberByEmail,
  listGates,
  listSessions,
  listSystems,
  setGateDone,
} from '@/lib/hundredfold-store';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** The member's own Command Center data, scoped hard to their session email. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ ok: true, member: null });

  const [gates, systems, sessions] = await Promise.all([
    listGates(member.id),
    listSystems(member.id),
    listSessions(member.id),
  ]);

  return NextResponse.json({ ok: true, member, gates, systems, sessions });
}

/**
 * A member checking off their own work.
 *
 * The gate must belong to them. Without that check a member could tick another
 * member's gates by guessing an id, which is exactly the kind of quiet
 * cross-tenant hole that never shows up in testing.
 */
export async function PATCH(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { gateId?: string; done?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad payload' }, { status: 400 });
  }
  if (!body.gateId) return NextResponse.json({ error: 'gateId required' }, { status: 400 });

  const member = await getMemberByEmail(session.email);
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

  const client = getSupabase();
  if (!client) return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  const { data: gate } = await client
    .from('hundredfold_gates')
    .select('id, member_id')
    .eq('id', body.gateId)
    .maybeSingle();
  if (!gate || gate.member_id !== member.id) {
    return NextResponse.json({ error: 'Not yours' }, { status: 403 });
  }

  const ok = await setGateDone(body.gateId, body.done === true, session.email);
  return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
}
