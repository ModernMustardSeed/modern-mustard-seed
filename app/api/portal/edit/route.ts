import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { queueProjectEdit } from '@/lib/site-edit';
import { publishProject } from '@/lib/site-publish';
import { resendClient } from '@/lib/send-email';
import { clientMessageEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * THE CLIENT DRIVES THEIR OWN EDIT.
 *
 * They already saw the draft (the delight moment). Now they act on it, without
 * waiting on Sarah:
 *   - ship: it becomes their site. If the site is already live, it publishes now.
 *   - adjust: refine the SAME draft with another sentence (no new charge, no new
 *     free edit spent) until it is right.
 *   - discard: throw it away. A free edit is refunded; a bought one is not.
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
    .select('id, name, client_email, site_html, site_html_draft, site_published_at, edit_status, edit_paid, edit_care, care_edits_used, revisions_used, revisions_included')
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
      .update({ site_html: proj.site_html_draft, site_html_draft: null, edit_status: null, edit_error: null, edit_paid: false, edit_care: false })
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
          to: 'sarah@modernmustardseed.com',
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
      paid: Boolean(proj.edit_paid), // an adjust keeps the edit's paid/free nature; it never re-charges
      care: Boolean(proj.edit_care), // and keeps its Care nature, so a later discard refunds correctly
    });
    if (!queued.ok) return NextResponse.json({ error: queued.error }, { status: 400 });
    return NextResponse.json({ ok: true, adjusting: true });
  }

  /* ── DISCARD: drop the draft. Refund what it cost: a Care edit, a free edit, or
        nothing for a bought one. ── */
  if (action === 'discard') {
    const isCare = Boolean(proj.edit_care);
    const wasFree = !proj.edit_paid && !isCare; // a plain two-free-edits revision
    await sb
      .from('projects')
      .update({
        site_html_draft: null,
        edit_status: null,
        edit_error: null,
        edit_care: false,
        // Give back exactly the budget it drew from, never the wrong one.
        ...(isCare ? { care_edits_used: Math.max(0, Number(proj.care_edits_used ?? 0) - 1) } : {}),
        ...(wasFree ? { revisions_used: Math.max(0, Number(proj.revisions_used ?? 0) - 1) } : {}),
      })
      .eq('id', proj.id);
    return NextResponse.json({ ok: true, refunded: wasFree || isCare });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
