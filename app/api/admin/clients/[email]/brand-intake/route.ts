import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** The client's submitted brand intake (answers.brand_intake), for the
 *  auto-populated panel on their profile. */
export async function GET(_req: Request, { params }: { params: Promise<{ email: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = decodeURIComponent((await params).email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ brandIntake: null });

  let brandIntake: Record<string, unknown> | null = null;
  try {
    const { data } = await sb
      .from('client_intake')
      .select('answers')
      .ilike('client_email', email)
      .maybeSingle();
    const answers = (data?.answers as Record<string, unknown>) ?? null;
    brandIntake = (answers?.brand_intake as Record<string, unknown>) ?? null;
  } catch {
    /* not migrated / no row */
  }

  return NextResponse.json({ brandIntake });
}
