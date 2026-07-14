import type { SupabaseClient } from '@supabase/supabase-js';
import { publishSite, attachDomain, projectSlug } from './vercel-platform';
import { seoFiles, type SiteFacts } from './site-seo';
import { resendClient } from './send-email';
import { clientEmail } from './email';
import { SITE } from './seo';

/**
 * PUT A CLIENT'S SITE LIVE.
 *
 * Lifted out of the admin route because two callers need it and one of them runs
 * with nobody watching: the scheduled reveal cron. A cron that re-implemented this
 * would drift from the button, and the drift would only show up on a client's
 * launch day.
 *
 * This function does not decide WHETHER to publish. It publishes. Every gate
 * (human approval, the reveal date, money) is the caller's job, and the cron is
 * deliberately strict about them.
 */

export type PublishResult =
  | { ok: true; liveUrl: string; previewUrl: string; verified: boolean; instructions: Array<{ type: string; domain: string; value: string }> }
  | { ok: false; error: string };

export async function publishProject(sb: SupabaseClient, projectId: string): Promise<PublishResult> {
  const { data: project } = await sb
    .from('projects')
    .select('id, name, client_email, site_html, site_domain, site_vercel_project_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!project) return { ok: false, error: 'No such project' };
  if (!project.site_html) return { ok: false, error: 'There is no site to publish yet.' };

  const business = String(project.name ?? 'client').replace(/:.*$/, '').trim();

  // Everything we know about them, gathered once. The SEO record is built from
  // FACTS: their intake, their order, their lead. Never a guess (see lib/site-seo).
  const { data: order } = await sb
    .from('demo_orders')
    .select('intake, phone, outbound_lead_id')
    .eq('project_id', projectId)
    .maybeSingle();
  const intake = (order?.intake ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof intake[k] === 'string' ? (intake[k] as string) : undefined);

  let lead: { city?: string | null; state?: string | null; phone?: string | null; niche?: string | null } | null = null;
  if (order?.outbound_lead_id) {
    const { data } = await sb
      .from('outbound_leads')
      .select('city, state, phone, niche')
      .eq('id', order.outbound_lead_id)
      .maybeSingle();
    lead = data;
  }
  const assets = Array.isArray(intake.assets) ? (intake.assets as Array<{ url: string; kind: string }>) : [];
  const logo = assets.find((a) => a.kind === 'logo')?.url;

  // With no custom domain yet, the site still needs to know its own address or the
  // canonical tag would point at nothing. Vercel serves it at <project>.vercel.app.
  const slug = projectSlug(business, projectId);
  const domain = (project.site_domain as string | null) ?? `${slug}.vercel.app`;

  const facts: SiteFacts = {
    business,
    domain,
    phone: str('contact')?.match(/[\d().+-]{7,}/)?.[0] ?? order?.phone ?? lead?.phone ?? null,
    city: lead?.city ?? null,
    state: lead?.state ?? null,
    street: null,
    zip: null,
    services: str('services') ?? null,
    hours: str('hours') ?? null,
    trade: lead?.niche ?? null,
    gbp: str('gbp') ?? null,
    facebook: str('facebook') ?? null,
    instagram: str('instagram') ?? null,
    logoUrl: logo ?? null,
  };

  const pub = await publishSite({
    files: seoFiles(facts, project.site_html as string),
    business,
    key: projectId,
    projectId: (project.site_vercel_project_id as string | null) ?? null,
  });
  if (!pub.ok) return { ok: false, error: pub.error };

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

  // Only NOW is an order actually delivered. Nothing in this codebase ever set this
  // status before, which is why it always looked like nothing shipped.
  await sb
    .from('demo_orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .in('status', ['paid', 'intake_done']);

  return { ok: true, liveUrl, previewUrl: pub.url, verified, instructions };
}
