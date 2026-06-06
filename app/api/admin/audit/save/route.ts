import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * Save an audit against a client so the audit (and the proposal) are on file for
 * the engagement. Also upserts the client record so it exists for the portal.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { email?: string; name?: string; url?: string; report?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const report = body.report;
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'A client email is required.' }, { status: 400 });
  if (!report || typeof report !== 'object') return NextResponse.json({ error: 'No audit to save.' }, { status: 400 });

  // Upsert the client so the saved audit attaches to a real contact.
  const name = String(body.name ?? '').trim();
  try {
    const patch: Record<string, unknown> = { email };
    if (name) patch.name = name;
    await supabase.from('clients').upsert(patch, { onConflict: 'email' });
  } catch (err) {
    console.error('client upsert on audit save (non-fatal)', err);
  }

  const { data, error } = await supabase
    .from('saved_audits')
    .insert({
      client_email: email,
      url: (body.url as string) || null,
      score: typeof report.overall_score === 'number' ? report.overall_score : null,
      letter: (report.letter_grade as string) || null,
      headline: (report.headline as string) || null,
      report,
    })
    .select('id')
    .single();

  if (error) {
    console.error('saved_audit insert error', error);
    return NextResponse.json({ error: 'Could not save the audit.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
