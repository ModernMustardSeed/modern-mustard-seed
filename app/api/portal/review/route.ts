import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { resendClient } from '@/lib/send-email';
import { getSupabase } from '@/lib/supabase';
import { leadNotification } from '@/lib/email';

export const runtime = 'nodejs';

/** Client submits a review from their portal. Lands as 'pending' for approval. */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const b = (await req.json().catch(() => ({}))) as { quote?: string; rating?: number; outcome?: string; name?: string };
  const quote = String(b.quote ?? '').trim();
  if (!quote) return NextResponse.json({ error: 'Write a few words to share.' }, { status: 400 });

  // Pull the client's name/company for attribution.
  let name = (b.name || '').trim();
  let company: string | null = null;
  try {
    const { data: client } = await supabase.from('clients').select('name, company').eq('email', session.email).maybeSingle();
    if (client) {
      if (!name) name = (client.name as string) || '';
      company = (client.company as string) || null;
    }
  } catch {
    /* ignore */
  }
  if (!name) name = session.email.split('@')[0];

  const { error } = await supabase.from('testimonials').insert({
    name,
    company,
    quote,
    outcome: (b.outcome || '').trim() || null,
    rating: Math.max(1, Math.min(5, Math.round(Number(b.rating) || 5))),
    status: 'pending',
    email: session.email,
    source: 'portal',
  });
  if (error) {
    console.error('portal review insert failed', error);
    return NextResponse.json({ error: 'Could not submit. Try again.' }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = resendClient();
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `New review from ${name} (pending approval)`,
        html: leadNotification({
          type: 'Contact',
          name,
          email: session.email,
          fields: [{ label: 'Rating', value: '★'.repeat(Math.max(1, Math.min(5, Math.round(Number(b.rating) || 5)))) }],
          message: quote,
          suggestedAction: 'Approve it in admin → Reviews to publish it on the site.',
        }),
      });
    } catch (err) {
      console.error('portal review notify failed', err);
    }
  }

  return NextResponse.json({ ok: true });
}
