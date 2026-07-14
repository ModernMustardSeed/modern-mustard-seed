import { NextResponse } from 'next/server';
import { requireOutboundAdmin } from '@/lib/outbound-server';
import { buildOutboundEmail } from '@/lib/outbound-email';
import { stripTrackingPixels } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 30;

type Params = Promise<{ id: string }>;

/**
 * Render the exact email this lead is about to receive, WITHOUT sending it.
 *
 * Same builder the send uses (lib/outbound-email.ts), so the preview cannot
 * drift from what ships. Two deliberate differences:
 *   - the open-tracking pixel is stripped, because rendering it in the admin
 *     would count as the prospect opening their own email;
 *   - nothing is logged and last_email_at is untouched.
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

  const built = await buildOutboundEmail(guard.supabase, lead, { note, includeDemo, includeSite, includeOs });
  if (!built.ok) return NextResponse.json({ error: built.error }, { status: built.status });

  const { to, from, replyTo, subject, html, summary } = built.email;
  return NextResponse.json({
    to,
    from,
    replyTo,
    subject,
    summary,
    html: stripTrackingPixels(html),
    lead: built.email.lead,
  });
}
