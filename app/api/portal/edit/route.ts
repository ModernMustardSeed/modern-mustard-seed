import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { queueProjectEdit } from '@/lib/site-edit';
import { publishProject } from '@/lib/site-publish';
import { resendClient } from '@/lib/send-email';
import { clientMessageEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { OWNER_NOTIFY_TO } from '@/lib/owner';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE CLIENT DRIVES THEIR OWN EDIT.
 *
 * They already saw the draft (the delight moment). Now they act on it, without
 * waiting on Sarah:
 *   - ship: it becomes their site. If the site is already live, it publishes now.
 *   - adjust: refine the SAME draft with another sentence until it is right.
 *   - discard: throw it away, and the edit goes back on the shelf.
 *
 * Sarah keeps full oversight on /admin/delivery either way (she can rebuild,
 * re-edit, or roll back), but the happy path never blocks on her.
 */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { action?: string; instruction?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const action = body.action;

  const { data: proj } = await sb
    .from('projects')
    .select('id, name, client_email, site_html, site_html_draft, site_published_at, edit_status')
    .ilike('client_email', session.email)
    .gt('revisions_included', 0)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!proj) return NextResponse.json({ error: 'No project found.' }, { status: 404 });

  const business = String(proj.name ?? 'the business').replace(/:.*$/, '').trim();

  /* ── SHIP: the draft becomes the real site, live now if they were already live. ── */
  if (action === 'ship') {
    if (proj.edit_status !== 'ready' || !proj.site_html_draft) {
      return NextResponse.json({ error: 'There is no ready change to ship.' }, { status: 400 });
    }
    await sb
      .from('projects')
      .update({ site_html: proj.site_html_draft, site_html_draft: null, edit_status: null, edit_error: null })
      .eq('id', proj.id);

    let published = false;
    let liveUrl: string | null = null;
    if (proj.site_published_at) {
      const pub = await publishProject(sb, proj.id as string);
      if (!pub.ok) return NextResponse.json({ error: pub.error }, { status: 400 });
      published = true;
      liveUrl = pub.liveUrl;
    }

    // Let Sarah know a client shipped a change to their own live site. Best effort.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
          to: OWNER_NOTIFY_TO,
          replyTo: proj.client_email as string,
          subject: `${business} shipped their own edit`,
          html: clientMessageEmail({
            fromName: business,
            fromEmail: proj.client_email as string,
            body: `They previewed and shipped an edit themselves.${published && liveUrl ? ` It is live now at ${liveUrl}.` : ' It is set into their site, ready for reveal.'}`,
            source: 'note',
            projectName: business,
            adminUrl: `${SITE.url}/admin/delivery`,
          }),
        });
      } catch { /* never block a ship on email */ }
    }
    return NextResponse.json({ ok: true, published, liveUrl });
  }

  /* ── ADJUST: refine the same draft again, free of charge. ── */
  if (action === 'adjust') {
    const instruction = (body.instruction || '').trim();
    if (!instruction) return NextResponse.json({ error: 'Tell us what to adjust.' }, { status: 400 });
    if (instruction.length > 4000) return NextResponse.json({ error: 'That is a lot. Trim it down.' }, { status: 400 });
    if (proj.edit_status !== 'ready' || !proj.site_html_draft) {
      return NextResponse.json({ error: 'Wait for the current change to finish, then adjust it.' }, { status: 400 });
    }
    const queued = await queueProjectEdit(sb, {
      projectId: proj.id as string,
      leadId: null,
      business,
      currentHtml: proj.site_html_draft as string, // refine the DRAFT, not the live site
      instruction,
      requestedBy: session.email,
    });
    if (!queued.ok) return NextResponse.json({ error: queued.error }, { status: 400 });
    return NextResponse.json({ ok: true, adjusting: true });
  }

  /* ── DISCARD: drop the draft and put the edit back on the shelf. ── */
  if (action === 'discard') {
    // Nothing here costs money, but the fair-use window is still real, and an edit
    // nobody kept should not spend from it. A FAILED edit was already handed back
    // the moment it failed (the worker does it, so a client who closes the tab is
    // still made whole); refunding again because they also pressed "Start over"
    // would give the window back twice for one request.
    if (proj.edit_status !== 'failed') {
      await sb.rpc('refund_revision', { p_project_id: proj.id });
    }
    await sb
      .from('projects')
      .update({ site_html_draft: null, edit_status: null, edit_error: null })
      .eq('id', proj.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
