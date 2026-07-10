import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { clientEmail, p } from '@/lib/email';
import { resendClient } from '@/lib/send-email';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

/**
 * One-click warm intro email to a lead, sent from the admin lead drawer.
 * Sends a short "great to connect" note from Sarah, then marks the lead
 * replied and stamps a note so the pipeline reflects that we reached out.
 */
export async function POST(_req: Request, { params }: { params: Params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const { data: lead, error: fetchErr } = await supabase.from('leads').select('*').eq('id', id).single();
  if (fetchErr || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  const email = (lead.email as string | null)?.trim();
  if (!email) return NextResponse.json({ error: 'This lead has no email.' }, { status: 400 });
  const firstName = (lead.name as string | null)?.split(' ')[0] || 'there';

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 });

  const resend = resendClient();
  const { error: sendErr } = await resend.emails.send({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: email,
    replyTo: 'sarah@modernmustardseed.com',
    subject: `${firstName}, great to connect`,
    html: clientEmail({
      preheader: 'A quick note from Sarah at Modern Mustard Seed.',
      greeting: `Hi ${firstName},`,
      body:
        p('This is Sarah at Modern Mustard Seed. Thanks for reaching out, I wanted to connect personally.') +
        p('Tell me a little about what you are working on and where you are stuck, and I will point you to the highest-leverage next step. The fastest way is a quick call, no pitch.'),
      cta: { label: 'Book a 30-min call', url: 'https://modernmustardseed.com/book' },
      secondary: { label: 'Run the free Website Audit', url: 'https://modernmustardseed.com/website-audit' },
    }),
  });
  if (sendErr) {
    console.error('intro email failed', sendErr);
    return NextResponse.json({ error: 'Email failed to send. Try again.' }, { status: 502 });
  }

  // Reflect the touch: stamp a note and move new -> replied.
  const stamp = new Date().toISOString().slice(0, 10);
  const prevNotes = (lead.notes as string | null) ?? '';
  const update: Record<string, unknown> = {
    notes: `${prevNotes}${prevNotes ? '\n' : ''}[intro email sent ${stamp}]`,
  };
  if (lead.status === 'new') update.status = 'replied';

  const { data: updated, error: updErr } = await supabase
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single();
  if (updErr) {
    return NextResponse.json({ lead, warning: 'Email sent, but the status update failed.' });
  }
  return NextResponse.json({ lead: updated });
}
