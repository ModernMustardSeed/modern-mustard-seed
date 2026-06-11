import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Per-client Launch Checklist state. Stores which industry vertical the client
 * picked and which items they have checked off. Best-effort: if the table is
 * missing or Supabase is unconfigured, every path still returns 200 so the
 * client component degrades gracefully to localStorage.
 */

type ChecklistState = Record<string, boolean>;

/** Load the client's saved checklist. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ industry: null, state: {} });

  try {
    const { data } = await supabase
      .from('portal_checklist')
      .select('industry, state')
      .eq('email', session.email)
      .maybeSingle();
    return NextResponse.json({
      industry: data?.industry ?? null,
      state: (data?.state as ChecklistState) ?? {},
    });
  } catch {
    return NextResponse.json({ industry: null, state: {} });
  }
}

/** Save the client's checklist (industry + checked items). */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { industry?: unknown; state?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const industry =
    typeof body.industry === 'string' ? body.industry : body.industry == null ? null : null;
  const state =
    body.state && typeof body.state === 'object' && !Array.isArray(body.state)
      ? (body.state as ChecklistState)
      : null;
  if (state === null) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: true });

  try {
    await supabase
      .from('portal_checklist')
      .upsert(
        { email: session.email, industry, state, updated_at: new Date().toISOString() },
        { onConflict: 'email' },
      );
  } catch {
    /* table missing or write failed: still report ok so the client keeps working */
  }
  return NextResponse.json({ ok: true });
}
