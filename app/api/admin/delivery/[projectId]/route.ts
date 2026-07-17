import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { quoteDomain, buyDomain, attachDomain, normalizeDomain, type Contact } from '@/lib/vercel-platform';
import { publishProject } from '@/lib/site-publish';
import { queueRebuild, rebuildInputFor } from '@/lib/site-rebuild';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Deliver a client's website: quote a domain, buy it, seed the real site from the
 * demo they bought, edit it, and put it live.
 *
 * One route, several actions, because they are all steps of one job and they all
 * operate on the same project row.
 *
 * The domain registrant is US, not the client. Sarah is buying it on their behalf as
 * part of the service, which is what "we handle the pointing" means on the order
 * page. It renews automatically, because a client's website dying over a lapsed
 * domain is the worst thing this system could do to them.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Where the saved registrant address lives (no migration: app_state is a KV). */
const REGISTRANT_KEY = 'platform:registrant';

/**
 * The domain registrant is Modern Mustard Seed (Sarah buys on the client's
 * behalf). A registrar legally requires a real postal address; we read it from
 * app_state so it can be set once in the delivery UI without an env var and a
 * redeploy, falling back to the MMS_* env vars if those were set the old way.
 */
async function getRegistrant(sb: SupabaseClient): Promise<Contact> {
  let saved: Partial<Contact> = {};
  try {
    const { data } = await sb.from('app_state').select('value').eq('key', REGISTRANT_KEY).maybeSingle();
    if (data?.value && typeof data.value === 'object') saved = data.value as Partial<Contact>;
  } catch {
    /* app_state unreadable: fall back to env */
  }
  return {
    firstName: 'Sarah',
    lastName: 'Scarano',
    email: 'sarah@modernmustardseed.com',
    phone: saved.phone || process.env.MMS_PHONE || '+1.4063121223',
    address1: saved.address1 || process.env.MMS_ADDRESS1 || '',
    city: saved.city || process.env.MMS_CITY || 'Kalispell',
    state: saved.state || process.env.MMS_STATE || 'MT',
    zip: saved.zip || process.env.MMS_ZIP || '',
    country: 'US',
    companyName: 'Modern Mustard Seed',
  };
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { projectId } = await params;
  let body: { action?: string; domain?: string; html?: string; external?: boolean; revealAt?: string; address1?: string; city?: string; state?: string; zip?: string; phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: project } = await sb
    .from('projects')
    .select('id, name, client_email, demo_site_id, site_html, site_domain, site_vercel_project_id, site_live_url, site_published_at, site_build_status, approved_at, reveal_at, site_html_draft, edit_status, revisions_used')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: 'No such project' }, { status: 404 });

  switch (body.action) {
    /* ── What would this domain cost? Never buys. ── */
    case 'quote': {
      const q = await quoteDomain(String(body.domain ?? ''));
      if ('error' in q) return NextResponse.json({ error: q.error }, { status: 400 });
      return NextResponse.json({ quote: q });
    }

    /* ── Save the MMS registrant address once, so buying works with no redeploy. ── */
    case 'save-registrant': {
      const address1 = String(body.address1 ?? '').trim().slice(0, 120);
      const city = String(body.city ?? '').trim().slice(0, 60);
      const state = String(body.state ?? '').trim().toUpperCase().slice(0, 2);
      const zip = String(body.zip ?? '').trim().slice(0, 10);
      const phone = String(body.phone ?? '').trim().slice(0, 20);
      if (!address1 || !city || !state || !zip) {
        return NextResponse.json({ error: 'Street, city, state, and ZIP are all required to register domains.' }, { status: 400 });
      }
      const value: Record<string, string> = { address1, city, state, zip };
      if (phone) value.phone = phone;
      const { error } = await sb.from('app_state').upsert({ key: REGISTRANT_KEY, value });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    /* ── Buy it, and point it at their site in the same breath. ── */
    case 'buy': {
      const REGISTRANT = await getRegistrant(sb);
      if (!REGISTRANT.address1 || !REGISTRANT.zip) {
        return NextResponse.json(
          { error: 'needs-registrant', message: 'One-time setup: add your business mailing address so we can register domains for clients.' },
          { status: 400 },
        );
      }
      const bought = await buyDomain(String(body.domain ?? ''), REGISTRANT);
      if (!bought.ok) return NextResponse.json({ error: bought.error }, { status: 400 });

      await sb.from('domain_purchases').insert({
        project_id: projectId,
        client_email: project.client_email,
        domain: bought.domain,
        price_usd: bought.paidUsd,
        order_id: bought.orderId ?? null,
        bought_by: session.email ?? null,
      });
      await sb
        .from('projects')
        .update({ site_domain: bought.domain, site_domain_source: 'bought' })
        .eq('id', projectId);

      // If the site is already published, point the new domain at it right now.
      let attached: { verified: boolean } | null = null;
      if (project.site_vercel_project_id) {
        const a = await attachDomain(project.site_vercel_project_id, bought.domain);
        if (a.ok) attached = { verified: a.verified };
      }

      return NextResponse.json({ ok: true, domain: bought.domain, paidUsd: bought.paidUsd, attached });
    }

    /* ── They already own one. We just point it. ── */
    case 'use-existing': {
      const name = normalizeDomain(String(body.domain ?? ''));
      if (!name) return NextResponse.json({ error: 'That does not look like a domain.' }, { status: 400 });
      await sb.from('projects').update({ site_domain: name, site_domain_source: 'external' }).eq('id', projectId);

      if (!project.site_vercel_project_id) {
        return NextResponse.json({ ok: true, domain: name, note: 'Saved. Publish the site, then attach it.' });
      }
      const a = await attachDomain(project.site_vercel_project_id, name);
      if (!a.ok) return NextResponse.json({ error: a.error }, { status: 400 });
      return NextResponse.json({ ok: true, domain: name, verified: a.verified, instructions: a.instructions });
    }

    /* ── Start the real site from the demo they actually bought. ── */
    case 'seed': {
      if (project.site_html) return NextResponse.json({ ok: true, seeded: false, note: 'It already has a site.' });
      if (!project.demo_site_id) return NextResponse.json({ error: 'This project has no forged demo to start from.' }, { status: 400 });
      const { data: demo } = await sb
        .from('outbound_demo_sites')
        .select('html')
        .eq('id', project.demo_site_id)
        .maybeSingle();
      if (!demo?.html) return NextResponse.json({ error: 'That demo has no HTML yet.' }, { status: 400 });
      await sb.from('projects').update({ site_html: demo.html }).eq('id', projectId);
      return NextResponse.json({ ok: true, seeded: true, bytes: demo.html.length });
    }

    /* ── The editor's save. This is the real site, not the demo. ── */
    case 'save-html': {
      const html = String(body.html ?? '');
      if (html.length < 500) return NextResponse.json({ error: 'That is not a page.' }, { status: 400 });
      if (html.length > 4_000_000) return NextResponse.json({ error: 'That page is too big.' }, { status: 413 });
      await sb.from('projects').update({ site_html: html }).eq('id', projectId);
      return NextResponse.json({ ok: true, bytes: html.length });
    }

    /* ── Rebuild their REAL site from the intake they filled in. ── */
    case 'rebuild': {
      const input = await rebuildInputFor(sb, projectId);
      if ('error' in input) return NextResponse.json({ error: input.error }, { status: 400 });
      const queued = await queueRebuild(sb, input);
      if (!queued.ok) return NextResponse.json({ error: queued.error }, { status: 500 });
      return NextResponse.json({ ok: true, jobId: queued.jobId });
    }

    /**
     * ── Approve it, and say when it reveals. ──
     *
     * This is the human signature. The cron will not publish anything without it, no
     * matter what date is on the row, so an approval is the only thing that can ever
     * put a site in front of a client. Approving with a date in the past means "now",
     * and the cron picks it up on its next pass.
     */
    case 'approve': {
      if (!project.site_html) return NextResponse.json({ error: 'There is no site to approve yet.' }, { status: 400 });
      const when = body.revealAt ? new Date(body.revealAt) : new Date();
      if (Number.isNaN(when.getTime())) return NextResponse.json({ error: 'That is not a date.' }, { status: 400 });

      await sb
        .from('projects')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: session.email ?? 'admin',
          reveal_at: when.toISOString(),
        })
        .eq('id', projectId);
      return NextResponse.json({ ok: true, revealAt: when.toISOString() });
    }

    /* ── Take the approval back. Only possible before it is live. ── */
    case 'unapprove': {
      await sb.from('projects').update({ approved_at: null, approved_by: null }).eq('id', projectId);
      return NextResponse.json({ ok: true });
    }

    /**
     * ── Approve a client's auto-applied edit. ──
     *
     * The client typed a change in their portal, the forge built it into a draft, and
     * nothing has touched their live site. This is the signature: the draft becomes the
     * real site, and if the site was already live it is republished so the change is out.
     * Approving an AI edit is the ONLY thing that can put it in front of the client.
     */
    case 'edit-approve': {
      if (!project.site_html_draft) return NextResponse.json({ error: 'There is no edited draft to approve.' }, { status: 400 });
      await sb
        .from('projects')
        .update({ site_html: project.site_html_draft, site_html_draft: null, edit_status: null, edit_error: null })
        .eq('id', projectId);

      // If they were already live, push the change out now. If not, it just becomes the
      // site that the normal reveal flow will publish.
      if (project.site_published_at) {
        const pub = await publishProject(sb, projectId);
        if (!pub.ok) return NextResponse.json({ error: pub.error }, { status: 400 });
        return NextResponse.json({ ok: true, published: true, liveUrl: pub.liveUrl });
      }
      return NextResponse.json({ ok: true, published: false });
    }

    /**
     * ── Throw the edit away. ──
     *
     * The AI edit was wrong or unwanted. Drop the draft, and give the free edit back:
     * a client should not lose one of their two edits to a draft nobody kept.
     */
    case 'edit-discard': {
      await sb
        .from('projects')
        .update({
          site_html_draft: null,
          edit_status: null,
          edit_error: null,
          revisions_used: Math.max(0, Number(project.revisions_used ?? 0) - 1),
        })
        .eq('id', projectId);
      return NextResponse.json({ ok: true, refunded: true });
    }

    /* ── Put it live. Right now, by hand. ── */
    case 'publish': {
      const pub = await publishProject(sb, projectId);
      if (!pub.ok) return NextResponse.json({ error: pub.error }, { status: 400 });
      // A hand publish IS an approval, recorded as one, so the board never shows a
      // live site that nobody signed.
      if (!project.approved_at) {
        const now = new Date().toISOString();
        await sb
          .from('projects')
          .update({ approved_at: now, approved_by: session.email ?? 'admin', reveal_at: (project.reveal_at as string | null) ?? now })
          .eq('id', projectId);
      }
      return NextResponse.json(pub);
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
