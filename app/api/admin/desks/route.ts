import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { listDesks, saveDesk, type DeskForm } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE NEW CLIENT DESK. GET lists every desk, the ones in code and the ones
 * made here. POST saves one: { form, editing? }. Saving never switches
 * anything on for the client; the Show switches stay on the posting desk.
 */
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  return NextResponse.json({ desks: await listDesks(sb) });
}

export async function POST(req: Request) {
  const admin = await getSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  let body: { form?: DeskForm; editing?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (!body.form) return NextResponse.json({ errors: ['Nothing to save.'] }, { status: 400 });
  const r = await saveDesk(sb, body.form, admin.email, body.editing ?? null);
  if (!r.ok) return NextResponse.json({ errors: r.errors }, { status: 400 });
  return NextResponse.json({ ok: true, desk: { key: r.desk.key, clientEmail: r.desk.clientEmail, business: r.desk.business }, desks: await listDesks(sb) });
}
