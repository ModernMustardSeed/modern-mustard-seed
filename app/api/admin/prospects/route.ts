import { NextResponse } from 'next/server';
import { getSession, getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { VALID_CHANNELS, VALID_STATUSES, isMissingTableError } from '@/lib/prospects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List all shared prospects (newest first). Flags needsSetup if the table is missing. */
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from('rep_prospects')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(2000);
    if (error) throw error;
    return NextResponse.json({ prospects: data ?? [] });
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ prospects: [], needsSetup: true });
    const msg = err instanceof Error ? err.message : 'error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Add a prospect, owned by the signed-in rep. */
export async function POST(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { business?: string; city?: string; phone?: string; channel?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const business = (body.business ?? '').trim().slice(0, 200);
  if (!business) return NextResponse.json({ error: 'Enter the business name.' }, { status: 400 });
  const channel = VALID_CHANNELS.has(body.channel as never) ? body.channel : 'cold-call';

  try {
    const { data, error } = await supabase
      .from('rep_prospects')
      .insert({
        rep_email: user.email,
        rep_name: user.name,
        business,
        city: (body.city ?? '').trim().slice(0, 80) || null,
        phone: (body.phone ?? '').trim().slice(0, 40) || null,
        channel,
        status: 'to-contact',
        notes: (body.notes ?? '').trim().slice(0, 2000) || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, prospect: data });
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ error: 'The tracker table is not set up yet.', needsSetup: true }, { status: 400 });
    const msg = err instanceof Error ? err.message : 'Could not add.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
