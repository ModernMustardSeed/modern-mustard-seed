import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { sendOutboundEmail } from '@/lib/outbound-email';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Email the lead: the branded audit report when one exists, a warm intro
 * otherwise, or the forged-demo invite when includeDemo is set. Logging,
 * pixel, and last_email_at all live in lib/outbound-email.ts (shared with the
 * cadence cron).
 */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;
  const { id } = await params;

  const { data: lead, error } = await guard.supabase.from('outbound_leads').select('*').eq('id', id).single();
  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  let note: string | undefined;
  let includeDemo = false;
  let includeSite = false;
  let includeOs = false;
  try {
    const body = (await req.json()) as { note?: string; includeDemo?: boolean; includeSite?: boolean; includeOs?: boolean };
    if (typeof body.note === 'string' && body.note.trim()) note = body.note.trim().slice(0, 2000);
    includeDemo = body.includeDemo === true;
    includeSite = body.includeSite === true;
    includeOs = body.includeOs === true;
  } catch {
    /* empty body is fine */
  }

  const result = await sendOutboundEmail(guard.supabase, lead, { note, includeDemo, includeSite, includeOs });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, lead: result.lead });
}
