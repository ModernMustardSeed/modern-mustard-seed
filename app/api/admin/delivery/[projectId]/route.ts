import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { quoteDomain, buyDomain, publishSite, attachDomain, normalizeDomain, type Contact } from '@/lib/vercel-platform';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';

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
const REGISTRANT: Contact = {
  firstName: 'Sarah',
  lastName: 'Scarano',
  email: 'sarah@modernmustardseed.com',
  phone: '+1.4063121223',
  address1: process.env.MMS_ADDRESS1 || '',
  city: process.env.MMS_CITY || 'Kalispell',
  state: process.env.MMS_STATE || 'MT',
  zip: process.env.MMS_ZIP || '',
  country: 'US',
  companyName: 'Modern Mustard Seed',
};

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { projectId } = await params;
  let body: { action?: string; domain?: string; html?: string; external?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { data: project } = await sb
    .from('projects')
    .select('id, name, client_email, demo_site_id, site_html, site_domain, site_vercel_project_id, site_live_url')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: 'No such project' }, { status: 404 });

  const business = String(project.name ?? 'client').replace(/:.*$/, '').trim();

  switch (body.action) {
    /* ── What would this domain cost? Never buys. ── */
    case 'quote': {
      const q = await quoteDomain(String(body.domain ?? ''));
      if ('error' in q) return NextResponse.json({ error: q.error }, { status: 400 });
      return NextResponse.json({ quote: q });
    }

    /* ── Buy it, and point it at their site in the same breath. ── */
    case 'buy': {
      if (!REGISTRANT.address1 || !REGISTRANT.zip) {
        return NextResponse.json(
          { error: 'A registrar needs a real postal address. Set MMS_ADDRESS1 / MMS_CITY / MMS_STATE / MMS_ZIP before buying.' },
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

    /* ── Put it live. ── */
    case 'publish': {
      if (!project.site_html) return NextResponse.json({ error: 'Seed the site from their demo first.' }, { status: 400 });

      const pub = await publishSite({
        html: project.site_html as string,
        business,
        key: projectId,
        projectId: (project.site_vercel_project_id as string | null) ?? null,
      });
      if (!pub.ok) return NextResponse.json({ error: pub.error }, { status: 400 });

      let liveUrl = pub.url;
      let verified = true;
      let instructions: Array<{ type: string; domain: string; value: string }> = [];

      if (project.site_domain) {
        const a = await attachDomain(pub.projectId, project.site_domain as string);
        if (a.ok) {
          verified = a.verified;
          instructions = a.instructions;
          if (a.verified) liveUrl = `https://${project.site_domain}`;
        }
      }

      await sb
        .from('projects')
        .update({
          site_vercel_project_id: pub.projectId,
          site_live_url: liveUrl,
          site_published_at: new Date().toISOString(),
          status: 'launched',
          progress: 100,
        })
        .eq('id', projectId);

      // Tell them, in the portal and in their inbox. This is the moment they bought.
      if (project.client_email && process.env.RESEND_API_KEY) {
        try {
          await sb.from('client_files').insert({
            client_email: project.client_email,
            label: 'Your live website',
            url: liveUrl,
            kind: 'site',
          });
        } catch { /* a duplicate file row is not worth failing a launch over */ }
        try {
          const resend = resendClient();
          await resend.emails.send({
            from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
            to: project.client_email as string,
            replyTo: 'sarah@modernmustardseed.com',
            subject: 'You are live.',
            html: clientEmail({
              preheader: 'Your website is live on the internet.',
              eyebrow: 'LIVE',
              greeting: 'You are live.',
              body: `<p>${business} is on the internet, at <a href="${liveUrl}">${liveUrl}</a>.</p><p>It answers its own phone, it works on every screen, and it is yours. Anything you want changed, send it from your portal and I will see it.</p>`,
              cta: { label: 'See it live', url: liveUrl },
              secondary: { label: 'My portal', url: `${SITE.url}/portal` },
              signature: 'Sarah',
            }),
          });
        } catch (err) {
          console.error('launch email failed', err);
        }
      }

      // Only NOW is an order actually delivered. Nothing in this codebase ever set
      // this status before, which is why it always looked like nothing shipped.
      await sb
        .from('demo_orders')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('project_id', projectId)
        .in('status', ['paid', 'intake_done']);

      return NextResponse.json({ ok: true, liveUrl, previewUrl: pub.url, verified, instructions });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
