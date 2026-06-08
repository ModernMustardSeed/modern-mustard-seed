import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { selectSections } from '@/lib/intake';

export const runtime = 'nodejs';

/** A client's intake answers, laid out by section, for the admin to read. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ status: 'none', sections: [], answers: {} });

  let answers: Record<string, string> = {};
  let status = 'none';
  try {
    const { data } = await supabase.from('client_intake').select('answers, status, submitted_at').ilike('client_email', email).maybeSingle();
    if (data) {
      answers = (data.answers as Record<string, string>) ?? {};
      status = (data.status as string) ?? 'in_progress';
    }
  } catch {
    /* not migrated */
  }

  let serviceIds: string[] = [];
  try {
    const { data } = await supabase
      .from('proposals')
      .select('lines, updated_at')
      .ilike('client_email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const lines = Array.isArray(data?.lines) ? (data!.lines as Array<{ id?: string }>) : [];
    serviceIds = lines.map((l) => l.id).filter((x): x is string => !!x);
  } catch {
    /* ignore */
  }

  const sections = selectSections(serviceIds);
  return NextResponse.json({ status, sections, answers });
}
