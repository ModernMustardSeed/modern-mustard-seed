import { NextResponse } from 'next/server';
import { resendClient } from '@/lib/send-email';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { clientEmail, p } from '@/lib/email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';

/** Approve a client's proposed launch date: set the project's launch_target,
 *  mark the request done, and confirm to the client. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;

  const { data: reqRow } = await supabase
    .from('client_requests')
    .select('client_email, client_name, project_id, proposed_date')
    .eq('id', id)
    .maybeSingle();
  if (!reqRow || !reqRow.proposed_date) {
    return NextResponse.json({ error: 'No proposed date on this request.' }, { status: 400 });
  }

  const date = reqRow.proposed_date as string;
  const email = String(reqRow.client_email);

  // Update the linked project, or the client's most recent project.
  let projectId = reqRow.project_id as string | null;
  if (!projectId) {
    const { data: proj } = await supabase
      .from('projects')
      .select('id')
      .ilike('client_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    projectId = (proj?.id as string) ?? null;
  }
  if (!projectId) return NextResponse.json({ error: 'No project to update.' }, { status: 404 });

  const { error: upErr } = await supabase.from('projects').update({ launch_target: date }).eq('id', projectId);
  if (upErr) {
    console.error('launch approve update error', upErr);
    return NextResponse.json({ error: 'Could not update the project.' }, { status: 500 });
  }

  await supabase.from('client_requests').update({ status: 'done' }).eq('id', id);

  // Confirm to the client.
  if (process.env.RESEND_API_KEY) {
    try {
      const human = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const first = (reqRow.client_name as string)?.split(' ')[0] || undefined;
      const resend = resendClient();
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: 'Your launch date is confirmed',
        html: clientEmail({
          preheader: `Your launch is set for ${human}.`,
          greeting: first ? `Hi ${first},` : 'Hi,',
          body: p(`Done. Your launch is now set for <strong>${human}</strong>. You can see the countdown any time in your portal.`),
          cta: { label: 'Open your portal', url: `${SITE.url}/portal` },
        }),
      });
    } catch (err) {
      console.error('launch confirm email failed', err);
    }
  }

  return NextResponse.json({ ok: true, date });
}
