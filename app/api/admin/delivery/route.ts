import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { vercelConfig } from '@/lib/vercel-platform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE DELIVERY BOARD. Everyone who has paid, and what they are waiting on.
 *
 * Nothing in the admin read demo_orders. Not one screen. A buyer paid, an email
 * landed in Sarah's inbox, and from that moment the only record of what they were
 * owed was that email. `delivered` was a status nothing in the codebase ever set.
 * This is the screen that was missing.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { data: orders, error } = await sb
    .from('demo_orders')
    .select('id, business_name, products, setup_cents, monthly_cents, email, name, phone, status, intake, intake_at, created_at, client_email, project_id, outbound_lead_id')
    .in('status', ['paid', 'intake_done', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const projectIds = (orders ?? []).map((o) => o.project_id).filter(Boolean) as string[];
  const projects = new Map<string, Record<string, unknown>>();
  if (projectIds.length) {
    const { data: projs } = await sb
      .from('projects')
      .select('id, name, status, progress, revisions_included, revisions_used, demo_site_id, site_html, site_domain, site_live_url, site_published_at, site_domain_source, site_build_status, site_build_error, approved_at, approved_by, reveal_at, site_html_draft, edit_status, edit_instruction, edit_requested_by, edit_requested_at, edit_error, moodboard, moodboard_status, moodboard_note, moodboard_sent_at, moodboard_approved_at')
      .in('id', projectIds);
    for (const p of projs ?? []) projects.set(p.id as string, p as Record<string, unknown>);
  }

  // Open edit requests: the thing most likely to be silently rotting.
  const emails = (orders ?? []).map((o) => o.client_email).filter(Boolean) as string[];
  const openByEmail = new Map<string, number>();
  if (emails.length) {
    const { data: reqs } = await sb
      .from('client_requests')
      .select('client_email, status')
      .in('client_email', emails)
      .neq('status', 'done');
    for (const r of reqs ?? []) {
      const e = r.client_email as string;
      openByEmail.set(e, (openByEmail.get(e) ?? 0) + 1);
    }
  }

  const rows = (orders ?? []).map((o) => {
    const p = o.project_id ? projects.get(o.project_id) : undefined;
    const assets = Array.isArray((o.intake as Record<string, unknown>)?.assets)
      ? ((o.intake as Record<string, unknown>).assets as unknown[])
      : [];
    return {
      id: o.id,
      business: o.business_name,
      name: o.name,
      email: o.email,
      phone: o.phone,
      products: Array.isArray(o.products) ? o.products : [],
      setupCents: o.setup_cents,
      monthlyCents: o.monthly_cents,
      status: o.status,
      createdAt: o.created_at,
      intake: (o.intake ?? null) as Record<string, unknown> | null,
      intakeAt: o.intake_at,
      assetCount: assets.length,
      // The failure this board exists to catch: they paid, but no portal was ever
      // opened for them, so they have nowhere to go and nothing to send us.
      hasPortal: Boolean(o.project_id),
      projectId: o.project_id,
      project: p
        ? {
            name: p.name,
            status: p.status,
            progress: p.progress,
            revisionsIncluded: p.revisions_included,
            revisionsUsed: p.revisions_used,
            hasSite: Boolean(p.site_html),
            demoSiteId: p.demo_site_id,
            domain: p.site_domain,
            domainSource: p.site_domain_source,
            liveUrl: p.site_live_url,
            publishedAt: p.site_published_at,
            // The rebuild: their real site, forged from what they told us after they
            // paid. And the reveal: who signed it, and the day it goes out.
            buildStatus: p.site_build_status,
            buildError: p.site_build_error,
            approvedAt: p.approved_at,
            approvedBy: p.approved_by,
            revealAt: p.reveal_at,
            // A client's edit, applied agentically into a draft and waiting on Sarah's
            // approval before it can touch their live site.
            editStatus: p.edit_status,
            editInstruction: p.edit_instruction,
            editRequestedBy: p.edit_requested_by,
            editRequestedAt: p.edit_requested_at,
            editError: p.edit_error,
            hasDraft: Boolean(p.site_html_draft),
            // The direction board: forged after intake, approved by the client
            // in their portal before the site goes live.
            moodboard: p.moodboard ?? null,
            moodboardStatus: p.moodboard_status ?? 'none',
            moodboardNote: p.moodboard_note ?? null,
            moodboardSentAt: p.moodboard_sent_at ?? null,
            moodboardApprovedAt: p.moodboard_approved_at ?? null,
          }
        : null,
      openRequests: o.client_email ? (openByEmail.get(o.client_email) ?? 0) : 0,
    };
  });

  // Is the MMS registrant address on file? Buying a domain needs it, and it can
  // be set once from the delivery UI (app_state) instead of an env redeploy.
  let registrantSet = Boolean(process.env.MMS_ADDRESS1 && process.env.MMS_ZIP);
  if (!registrantSet) {
    try {
      const { data } = await sb.from('app_state').select('value').eq('key', 'platform:registrant').maybeSingle();
      const v = data?.value as { address1?: string; zip?: string } | null;
      registrantSet = Boolean(v?.address1 && v?.zip);
    } catch {
      /* leave false */
    }
  }

  return NextResponse.json({
    rows,
    // Say plainly whether the buy/publish buttons can work at all, rather than
    // letting Sarah discover it by clicking one during a client call.
    platformReady: Boolean(vercelConfig()),
    registrantSet,
  });
}
