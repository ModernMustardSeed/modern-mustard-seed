import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildEmailThread } from '@/lib/acq/thread';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Every email one contact has ever been sent, with the bytes, plus what is
 * scheduled to go next.
 *
 * One route for three screens on purpose. Outbound, Acquisition and the Client
 * Book all mean the same thing by "this contact", they just arrive holding
 * different handles: a lead id from the two prospect screens, an address from
 * the Client Book. Either is enough.
 *
 *   /api/admin/email-thread?leadId=<uuid>
 *   /api/admin/email-thread?email=<address>
 */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getSupabase();
  if (!db) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const url = new URL(req.url);
  const leadId = (url.searchParams.get('leadId') ?? '').trim();
  const email = (url.searchParams.get('email') ?? '').trim();

  if (leadId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
    return NextResponse.json({ error: 'That is not a lead id.' }, { status: 400 });
  }
  if (!leadId && !email) {
    return NextResponse.json({ error: 'Pass a leadId or an email.' }, { status: 400 });
  }

  try {
    const thread = await buildEmailThread(db, { leadId: leadId || null, email: email || null });
    return NextResponse.json(thread);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read the thread.' }, { status: 500 });
  }
}
