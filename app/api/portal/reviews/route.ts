import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';
import { sendReviewAsk } from '@/lib/reviews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ASK FOR A REVIEW. A job closes, the owner types the homeowner's name and
 * email (a phone too, when texts work), and one short note goes out from the
 * business with the places to leave a review, Google first. Every ask is
 * kept so nobody is asked twice by accident. Scoped by the signed-in email.
 */
type Ask = { id: string; name: string; email: string | null; phone: string | null; project: string | null; sent_email: boolean; sent_sms: boolean; error: string | null; created_at: string };

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ reviews: null });
  let asks: Ask[] = [];
  try {
    const { data } = await sb.from('client_review_requests').select('id, name, email, phone, project, sent_email, sent_sms, error, created_at').eq('client_email', session.email).order('created_at', { ascending: false }).limit(50);
    asks = (data ?? []) as Ask[];
  } catch {
    /* not migrated */
  }
  return NextResponse.json({ reviews: { links: project.reviews, asks, projects: project.projects } });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  if (!sb || !project) return NextResponse.json({ error: 'Not on a project.' }, { status: 404 });
  let body: { name?: string; email?: string; phone?: string; project?: string; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const r = await sendReviewAsk(sb, project, session.email, { name: String(body.name ?? ''), email: body.email, phone: body.phone, project: body.project, note: body.note });
  if (!r.ok) return NextResponse.json({ error: r.error ?? 'Nothing went out.' }, { status: r.error && /name|email|mobile|look right/.test(r.error) ? 400 : 502 });
  return NextResponse.json({ ok: true, sent_email: r.sent_email, sent_sms: r.sent_sms });
}
