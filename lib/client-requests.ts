import { Resend } from 'resend';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { clientMessageEmail } from '@/lib/email';

/**
 * Record a change request / note from a client and notify Sarah. Used by both
 * the portal note form and the Mr. Mustard Seed assistant (when a client asks
 * it to pass something along). Best effort on email; the row is the source of
 * truth and always gets written first.
 */
export async function createClientRequest(args: {
  email: string;
  name?: string | null;
  body: string;
  source?: 'note' | 'chatbot' | 'launch_date';
  projectId?: string | null;
  proposedDate?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const body = (args.body || '').trim();
  if (!body) return { ok: false, error: 'Empty message' };
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Database not configured' };

  const email = args.email.toLowerCase().trim();
  const source = args.source === 'chatbot' ? 'chatbot' : args.source === 'launch_date' ? 'launch_date' : 'note';

  let id: string | undefined;
  let projectName: string | undefined;
  try {
    // Resolve a name + a default project if we were not handed one.
    let name = args.name?.trim() || undefined;
    let projectId = args.projectId || null;
    try {
      if (!name) {
        const { data: c } = await supabase.from('clients').select('name').eq('email', email).maybeSingle();
        name = (c?.name as string) || undefined;
      }
      const { data: proj } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('client_email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (proj) {
        projectName = proj.name as string;
        if (!projectId) projectId = proj.id as string;
      }
    } catch {
      /* best effort enrichment */
    }

    const { data, error } = await supabase
      .from('client_requests')
      .insert({
        client_email: email,
        client_name: name ?? null,
        project_id: projectId,
        body: body.slice(0, 4000),
        source,
        proposed_date: args.proposedDate ?? null,
      })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: 'Could not save your message' };
    id = data.id as string;

    // Notify Sarah. Never block the save on email.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: 'sarah@modernmustardseed.com',
          replyTo: email,
          subject: `New message from ${name || email}`,
          html: clientMessageEmail({
            fromName: name,
            fromEmail: email,
            body,
            source,
            projectName,
            adminUrl: `${SITE.url}/admin`,
          }),
        });
      } catch (err) {
        console.error('client message email failed', err);
      }
    }
    return { ok: true, id };
  } catch (err) {
    console.error('createClientRequest failed', err);
    return { ok: false, error: 'Could not save your message' };
  }
}
