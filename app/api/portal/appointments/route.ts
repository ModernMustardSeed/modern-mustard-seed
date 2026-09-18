import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { projectForEmail } from '@/lib/client-leads';
import { describeSlot, zoneLabel, KINDS, type SlotKind } from '@/lib/client-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHAT IS IN THE DIARY.
 *
 * Everything a visitor booked on the website, newest first, with the past
 * folded away. The owner marks one done, a no-show, or cancels it; those are
 * marks a person owns, so nothing else in the app ever sets them. Cancelling
 * here frees the minute again, because the index that holds a slot only covers
 * live rows.
 *
 * Scoped by the signed-in email, and silent when the Command Center is hidden,
 * the same as every other card.
 */
type Row = {
  id: string; kind: string; starts_at: string; minutes: number; place: string | null; status: string;
  name: string | null; phone: string | null; email: string | null; town: string | null;
  project_type: string | null; address: string | null; notes: string | null; created_at: string;
};

const shape = (r: Row) => {
  const at = new Date(r.starts_at);
  const rule = KINDS[r.kind as SlotKind];
  return {
    id: r.id,
    kind: r.kind,
    kindLabel: rule?.label ?? r.kind,
    when: `${describeSlot(at)} ${zoneLabel(at)}`,
    startsAt: r.starts_at,
    minutes: r.minutes,
    place: rule?.places.find((p) => p.key === r.place)?.label ?? r.place,
    status: r.status,
    past: at.getTime() < Date.now(),
    name: r.name, phone: r.phone, email: r.email, town: r.town,
    projectType: r.project_type, address: r.address, notes: r.notes,
    bookedAt: r.created_at,
  };
};

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ appointments: null });

  let rows: Row[] = [];
  try {
    const { data } = await sb
      .from('client_appointments')
      .select('id, kind, starts_at, minutes, place, status, name, phone, email, town, project_type, address, notes, created_at')
      .eq('client_email', session.email)
      .order('starts_at', { ascending: true })
      .limit(200);
    rows = (data ?? []) as Row[];
  } catch {
    // not migrated yet: the card says so rather than looking broken
    return NextResponse.json({ appointments: { ready: false, upcoming: [], past: [] } });
  }

  const all = rows.map(shape);
  return NextResponse.json({
    appointments: {
      ready: true,
      bookUrl: `${project.publicUrl}/book`,
      upcoming: all.filter((a) => !a.past && a.status === 'booked'),
      past: all.filter((a) => a.past || a.status !== 'booked').reverse().slice(0, 40),
    },
  });
}

/** Mark one done, a no-show, or cancel it. A person's mark, nothing automatic. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });

  let body: { id?: string; status?: string };
  try {
    body = (await req.json()) as { id?: string; status?: string };
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const id = typeof body.id === 'string' ? body.id : '';
  const status = typeof body.status === 'string' ? body.status : '';
  if (!id || !['done', 'no-show', 'cancelled', 'booked'].includes(status)) {
    return NextResponse.json({ error: 'Pick done, no-show, cancelled or booked.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'cancelled') {
    patch.cancelled_at = new Date().toISOString();
    patch.cancelled_by = session.email;
  }
  const { error } = await sb.from('client_appointments').update(patch).eq('id', id).eq('client_email', session.email);
  if (error) return NextResponse.json({ error: 'That did not save.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
