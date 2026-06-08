import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { selectSections } from '@/lib/intake';
import { createClientRequest } from '@/lib/client-requests';

export const runtime = 'nodejs';

async function serviceIdsFor(supabase: ReturnType<typeof getSupabase>, email: string): Promise<string[]> {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('proposals')
      .select('lines, updated_at')
      .ilike('client_email', email)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const lines = Array.isArray(data?.lines) ? (data!.lines as Array<{ id?: string }>) : [];
    return lines.map((l) => l.id).filter((x): x is string => !!x);
  } catch {
    return [];
  }
}

/** Scope-aware intake: the sections to ask + any saved answers + status. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const sections = selectSections(await serviceIdsFor(supabase, session.email));
  let answers: Record<string, string> = {};
  let status = 'in_progress';
  try {
    const { data } = await supabase.from('client_intake').select('answers, status').eq('client_email', session.email).maybeSingle();
    if (data) {
      answers = (data.answers as Record<string, string>) ?? {};
      status = (data.status as string) ?? 'in_progress';
    }
  } catch {
    /* not migrated */
  }
  return NextResponse.json({ sections, answers, status });
}

/** Save progress, or submit. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { answers?: Record<string, string>; submit?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const submit = !!body.submit;

  const row: Record<string, unknown> = {
    client_email: session.email.toLowerCase(),
    answers,
    status: submit ? 'submitted' : 'in_progress',
    updated_at: new Date().toISOString(),
  };
  if (submit) row.submitted_at = new Date().toISOString();

  const { error } = await supabase.from('client_intake').upsert(row, { onConflict: 'client_email' });
  if (error) {
    console.error('intake upsert error', error);
    return NextResponse.json({ error: 'Could not save.' }, { status: 500 });
  }

  if (submit) {
    // Surface it in admin (Client messages + timeline) and notify Sarah.
    await createClientRequest({ email: session.email, body: 'Completed the onboarding intake. Answers are on file in their project.', source: 'note' });
  }
  return NextResponse.json({ ok: true });
}
