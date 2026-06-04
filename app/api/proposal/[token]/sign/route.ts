import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { provisionFromProposal } from '@/lib/proposal-provision';
import { createMagicToken } from '@/lib/client-auth';
import { leadNotification, magicLinkEmail } from '@/lib/email';

export const runtime = 'nodejs';

/** Public: the client types their name to sign and accept the proposal. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as { name?: string };
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Type your full name to sign.' }, { status: 400 });

  const { data: p } = await supabase.from('proposals').select('*').eq('share_token', token).maybeSingle();
  if (!p) return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });

  const already = !!p.signed_at;
  if (!already) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;
    await supabase
      .from('proposals')
      .update({ signed_at: new Date().toISOString(), signed_name: name, signed_ip: ip, status: 'accepted' })
      .eq('id', p.id);

    // Set up the client + project on both sides.
    await provisionFromProposal(p.id as string);

    // Notify Sarah and send the client a portal link.
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      try {
        await resend.emails.send({
          from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: 'sarah@modernmustardseed.com',
          subject: `Proposal signed by ${name}`,
          html: leadNotification({
            type: 'Contact',
            name,
            email: (p.client_email as string) || 'unknown',
            fields: [
              { label: 'Company', value: (p.client_company as string) || '—' },
              { label: 'Signed', value: name },
            ],
            message: 'Proposal accepted. Client + project provisioned. Awaiting the 50% deposit.',
            suggestedAction: 'Kick off discovery.',
          }),
        });
      } catch (err) {
        console.error('sign: notify failed', err);
      }
      if (p.client_email) {
        try {
          const magic = await createMagicToken(String(p.client_email));
          const portalUrl = `${SITE.url}/api/portal/verify?token=${encodeURIComponent(magic)}&next=/portal`;
          await resend.emails.send({
            from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
            to: p.client_email as string,
            replyTo: 'sarah@modernmustardseed.com',
            subject: 'Your project space is live',
            html: magicLinkEmail({ firstName: name.split(' ')[0], url: portalUrl }),
          });
        } catch (err) {
          console.error('sign: portal link failed', err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
