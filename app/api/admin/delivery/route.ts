import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { vercelConfig } from '@/lib/vercel-platform';
import { byId } from '@/data/proposal-menu';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE DELIVERY BOARD, universal edition. Everyone we owe a build, whatever door
 * they came through.
 *
 * The first version of this screen read demo_orders only, so a signed proposal
 * client, a Chief buyer, or a project Sarah opened by hand never appeared here;
 * the delivery experience was gated to the forge funnel by a single FROM clause.
 * Now the board keys on PROJECTS (the record every funnel mints) and enriches
 * each row from wherever it came: the demo order, the proposal, the client
 * record. Paid demo orders that never got a project still show, because that is
 * the failure this board exists to catch.
 */

type ProjRow = Record<string, unknown>;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const [projRes, orderRes, propRes] = await Promise.all([
    sb
      .from('projects')
      .select(
        'id, client_email, name, status, progress, created_at, milestones, revisions_included, revisions_used, demo_site_id, demo_order_id, site_domain, site_live_url, site_published_at, site_domain_source, site_build_status, site_build_error, approved_at, approved_by, reveal_at, edit_status, edit_instruction, edit_requested_by, edit_requested_at, edit_error, moodboard, moodboard_status, moodboard_note, moodboard_sent_at, moodboard_approved_at, care_plan'
      )
      .order('created_at', { ascending: false })
      .limit(200),
    sb
      .from('demo_orders')
      .select(
        'id, business_name, products, setup_cents, monthly_cents, email, name, phone, status, intake, intake_at, created_at, client_email, project_id, outbound_lead_id'
      )
      .in('status', ['paid', 'intake_done', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(200),
    sb
      .from('proposals')
      .select(
        'id, client_email, client_name, client_company, status, one_time_total, monthly_total, deposit_status, balance_status, signed_at, sent_at, share_token, project_id, lines, updated_at, view_count, last_viewed_at'
      )
      .order('updated_at', { ascending: false })
      .limit(300),
  ]);
  if (projRes.error) return NextResponse.json({ error: projRes.error.message }, { status: 500 });

  const projects = (projRes.data ?? []) as ProjRow[];
  const orders = (orderRes.data ?? []) as ProjRow[];
  const proposals = (propRes.data ?? []) as ProjRow[];

  // Cheap site/draft presence for every project (never pull the HTML blobs here).
  const flags = new Map<string, { has_site: boolean; has_draft: boolean }>();
  if (projects.length) {
    const { data: flagRows } = await sb
      .from('project_delivery_flags')
      .select('id, has_site, has_draft')
      .in('id', projects.map((p) => p.id as string));
    for (const f of flagRows ?? []) flags.set(f.id as string, f as { has_site: boolean; has_draft: boolean });
  }

  const orderByProject = new Map<string, ProjRow>();
  for (const o of orders) if (o.project_id) orderByProject.set(o.project_id as string, o);

  const propByProject = new Map<string, ProjRow>();
  const propByEmail = new Map<string, ProjRow>();
  for (const pr of proposals) {
    if (pr.project_id && !propByProject.has(pr.project_id as string)) propByProject.set(pr.project_id as string, pr);
    const em = String(pr.client_email ?? '').toLowerCase();
    if (em && !propByEmail.has(em)) propByEmail.set(em, pr);
  }

  // Client names for project rows that have no order to say who they are.
  const emails = Array.from(
    new Set(
      [...projects.map((p) => p.client_email), ...orders.map((o) => o.client_email ?? o.email)]
        .filter(Boolean)
        .map((e) => String(e).toLowerCase())
    )
  );
  const clientByEmail = new Map<string, { name: string | null; company: string | null }>();
  if (emails.length) {
    const { data: clients } = await sb.from('clients').select('email, name, company').in('email', emails);
    for (const c of clients ?? [])
      clientByEmail.set(String(c.email).toLowerCase(), { name: c.name as string | null, company: c.company as string | null });
  }

  // Open edit requests: the thing most likely to be silently rotting.
  const openByEmail = new Map<string, number>();
  if (emails.length) {
    const { data: reqs } = await sb
      .from('client_requests')
      .select('client_email, status')
      .in('client_email', emails)
      .neq('status', 'done');
    for (const r of reqs ?? []) {
      const e = String(r.client_email).toLowerCase();
      openByEmail.set(e, (openByEmail.get(e) ?? 0) + 1);
    }
  }

  const projectBlock = (p: ProjRow) => ({
    name: p.name,
    status: p.status,
    progress: p.progress,
    milestones: Array.isArray(p.milestones) ? p.milestones : [],
    revisionsIncluded: p.revisions_included,
    revisionsUsed: p.revisions_used,
    hasSite: flags.get(p.id as string)?.has_site ?? false,
    demoSiteId: p.demo_site_id,
    domain: p.site_domain,
    domainSource: p.site_domain_source,
    liveUrl: p.site_live_url,
    publishedAt: p.site_published_at,
    buildStatus: p.site_build_status,
    buildError: p.site_build_error,
    approvedAt: p.approved_at,
    approvedBy: p.approved_by,
    revealAt: p.reveal_at,
    editStatus: p.edit_status,
    editInstruction: p.edit_instruction,
    editRequestedBy: p.edit_requested_by,
    editRequestedAt: p.edit_requested_at,
    editError: p.edit_error,
    hasDraft: flags.get(p.id as string)?.has_draft ?? false,
    moodboard: p.moodboard ?? null,
    moodboardStatus: p.moodboard_status ?? 'none',
    moodboardNote: p.moodboard_note ?? null,
    moodboardSentAt: p.moodboard_sent_at ?? null,
    moodboardApprovedAt: p.moodboard_approved_at ?? null,
    carePlan: Boolean(p.care_plan),
  });

  const proposalBlock = (pr: ProjRow | null) =>
    pr
      ? {
          id: pr.id,
          status: pr.status,
          depositStatus: pr.deposit_status ?? 'unpaid',
          balanceStatus: pr.balance_status ?? null,
          signedAt: pr.signed_at ?? null,
          sentAt: pr.sent_at ?? null,
          shareToken: pr.share_token ?? null,
          oneTime: Number(pr.one_time_total) || 0,
          monthly: Number(pr.monthly_total) || 0,
          viewCount: Number(pr.view_count) || 0,
          lastViewedAt: pr.last_viewed_at ?? null,
        }
      : null;

  const intakeAssets = (intake: unknown): number => {
    const a = (intake as Record<string, unknown> | null)?.assets;
    return Array.isArray(a) ? a.length : 0;
  };

  const rows: Array<Record<string, unknown>> = [];

  // Paid demo orders that never became a project: still shown, still the alarm.
  for (const o of orders) {
    if (o.project_id) continue;
    const email = String(o.client_email ?? o.email ?? '').toLowerCase() || null;
    rows.push({
      id: o.id,
      source: 'demo',
      business: o.business_name,
      name: o.name,
      email,
      phone: o.phone,
      products: Array.isArray(o.products) ? o.products : [],
      setupCents: o.setup_cents,
      monthlyCents: o.monthly_cents,
      status: o.status,
      createdAt: o.created_at,
      intake: (o.intake ?? null) as Record<string, unknown> | null,
      intakeAt: o.intake_at,
      assetCount: intakeAssets(o.intake),
      hasPortal: false,
      projectId: null,
      project: null,
      proposal: null,
      openRequests: email ? (openByEmail.get(email) ?? 0) : 0,
    });
  }

  // Every project, whatever minted it.
  for (const p of projects) {
    const o = orderByProject.get(p.id as string) ?? null;
    const email = String(p.client_email ?? '').toLowerCase();
    const client = clientByEmail.get(email) ?? null;
    const prop = propByProject.get(p.id as string) ?? (o ? null : (propByEmail.get(email) ?? null));
    const source = o ? 'demo' : prop ? 'proposal' : 'direct';
    const propLines = prop && Array.isArray(prop.lines) ? (prop.lines as Array<{ id: string }>) : [];
    const products = o
      ? Array.isArray(o.products)
        ? o.products
        : []
      : propLines.map((l) => byId(l.id)?.name ?? l.id);
    rows.push({
      id: o ? o.id : p.id,
      source,
      business: (o?.business_name as string) ?? client?.company ?? (p.name as string),
      name: (o?.name as string) ?? client?.name ?? (prop?.client_name as string) ?? null,
      email: email || null,
      phone: (o?.phone as string) ?? null,
      products,
      setupCents: (o?.setup_cents as number) ?? (prop ? Math.round(Number(prop.one_time_total) || 0) * 100 : 0),
      monthlyCents: (o?.monthly_cents as number) ?? (prop ? Math.round(Number(prop.monthly_total) || 0) * 100 : 0),
      status: (o?.status as string) ?? null,
      createdAt: p.created_at,
      intake: ((o?.intake ?? null) as Record<string, unknown> | null),
      intakeAt: o?.intake_at ?? null,
      assetCount: intakeAssets(o?.intake),
      hasPortal: true,
      projectId: p.id,
      project: projectBlock(p),
      proposal: proposalBlock(prop),
      openRequests: email ? (openByEmail.get(email) ?? 0) : 0,
    });
  }

  rows.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

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
