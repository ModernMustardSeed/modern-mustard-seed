import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { SITE } from '@/lib/seo';
import { HOSTS } from '@/data/bootcamp';
import { getHostBySlug, listHosts, recordEvent, updateHost } from '@/lib/bootcamp/store';
import { hostLinks } from '@/lib/bootcamp/key';
import { hostApproved } from '@/lib/bootcamp/emails';
import { sendViaResend } from '@/lib/send-email';

export const runtime = 'nodejs';

const FROM = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
const REPLY_TO = 'sarah@modernmustardseed.com';

type Action = 'approve' | 'decline' | 'pause';

/**
 * Approve mints the host's links, marks the first 25 approved as founding,
 * sends the approved email from Sarah's own address (one-to-one, no
 * unsubscribe header) and hands the links back to the desk. Decline and pause
 * only change status.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { slug } = await ctx.params;
  if (!/^[a-z0-9-]{1,48}$/.test(slug)) return NextResponse.json({ error: 'bad_slug' }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action as Action | undefined;
  if (action !== 'approve' && action !== 'decline' && action !== 'pause') {
    return NextResponse.json({ error: 'action must be approve, decline or pause.' }, { status: 400 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  try {
    const host = await getHostBySlug(sb, slug);
    if (!host) return NextResponse.json({ error: 'No host with that slug.' }, { status: 404 });

    if (action === 'decline') {
      const updated = await updateHost(sb, slug, { status: 'declined' });
      await recordEvent(sb, 'host-declined', { hostSlug: slug, email: host.email });
      return NextResponse.json({ ok: true, host: updated });
    }

    if (action === 'pause') {
      const updated = await updateHost(sb, slug, { status: 'paused' });
      await recordEvent(sb, 'host-paused', { hostSlug: slug, email: host.email });
      return NextResponse.json({ ok: true, host: updated });
    }

    const links = hostLinks(SITE.url, slug);
    if (!links.dashboard) {
      return NextResponse.json({ error: 'ADMIN_SESSION_SECRET is missing, so no host key can be signed.' }, { status: 500 });
    }

    // Founding is the first 25 ever approved, counted by approved_at. A host
    // approved once already keeps whatever founding flag they have.
    const all = await listHosts(sb);
    const approvedBefore = all.filter((h) => h.approved_at && h.slug !== slug).length;
    const founding = host.approved_at ? Boolean(host.founding) : approvedBefore < HOSTS.foundingHosts;

    const updated = await updateHost(sb, slug, {
      status: 'approved',
      approved_at: host.approved_at || new Date().toISOString(),
      founding,
    });

    const mail = hostApproved({ name: host.name, brand: host.brand, email: host.email }, links);
    const sent = await sendViaResend({
      from: FROM,
      to: host.email,
      replyTo: REPLY_TO,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    await recordEvent(sb, 'host-approved', {
      hostSlug: slug,
      email: host.email,
      detail: { founding, emailed: sent.ok, emailId: sent.ok ? sent.id : null, error: sent.ok ? null : sent.error },
    });

    return NextResponse.json({
      ok: true,
      host: updated,
      links,
      founding,
      emailed: sent.ok,
      emailError: sent.ok ? null : sent.error,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'That action failed.' }, { status: 500 });
  }
}
