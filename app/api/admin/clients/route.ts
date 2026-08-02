import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { cleanDemoLinks } from '@/lib/proposal-links';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE CLIENT BOOK. One list route for every client and every prospect with a
 * proposal, each carrying everything we ever made them (live sites, demos,
 * files), what they own, where they are on the pipeline, and what is waiting.
 *
 * This index never existed: /admin/clients/[email] was only reachable from one
 * card on the overview, so a client with no messages was unreachable by URL.
 */

type Rec = Record<string, unknown>;

const lower = (v: unknown) => String(v ?? '').toLowerCase();

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const [clientsRes, projectsRes, productsRes, proposalsRes, filesRes, requestsRes] = await Promise.all([
    sb.from('clients').select('email, name, company, tier, status, created_at').order('created_at', { ascending: false }).limit(500),
    sb
      .from('projects')
      .select(
        'id, client_email, name, status, progress, site_live_url, site_domain, site_published_at, revisions_included, revisions_used, care_plan, demo_order_id, edit_status, site_build_status, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(500),
    sb.from('client_products').select('client_email, kind, label, status, home_url, amount_cents').limit(1000),
    sb
      .from('proposals')
      .select(
        'id, client_email, client_name, client_company, status, one_time_total, monthly_total, deposit_status, balance_status, signed_at, sent_at, share_token, updated_at, demo_links, view_count, last_viewed_at'
      )
      .order('updated_at', { ascending: false })
      .limit(300),
    sb.from('client_files').select('client_email, label, url, kind').limit(2000),
    sb.from('client_requests').select('client_email, status').neq('status', 'done').limit(2000),
  ]);

  const clients = (clientsRes.data ?? []) as Rec[];
  const projects = (projectsRes.data ?? []) as Rec[];
  const products = (productsRes.data ?? []) as Rec[];
  const proposals = (proposalsRes.data ?? []) as Rec[];
  const files = (filesRes.data ?? []) as Rec[];
  const requests = (requestsRes.data ?? []) as Rec[];

  const byEmail = <T extends Rec>(rows: T[], key = 'client_email') => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const e = lower(r[key]);
      if (!e) continue;
      if (!m.has(e)) m.set(e, []);
      m.get(e)!.push(r);
    }
    return m;
  };

  const projByEmail = byEmail(projects);
  const prodByEmail = byEmail(products);
  const propByEmail = byEmail(proposals);
  const fileByEmail = byEmail(files);
  const openByEmail = new Map<string, number>();
  for (const r of requests) {
    const e = lower(r.client_email);
    openByEmail.set(e, (openByEmail.get(e) ?? 0) + 1);
  }

  const clientEmails = new Set(clients.map((c) => lower(c.email)));

  const rows = clients.map((c) => {
    const email = lower(c.email);
    const projs = projByEmail.get(email) ?? [];
    const prods = prodByEmail.get(email) ?? [];
    const props = propByEmail.get(email) ?? [];
    const fls = fileByEmail.get(email) ?? [];
    const prop = props[0] ?? null;

    // Everything we made them, one deduped clickable list.
    const made = new Map<string, { label: string; url: string; tone: 'live' | 'demo' }>();
    for (const p of projs) {
      const url = (p.site_live_url as string) || (p.site_domain ? `https://${p.site_domain}` : '');
      if (url && !made.has(url)) made.set(url, { label: `${p.name}`.trim() || 'Live site', url, tone: 'live' });
    }
    for (const f of fls) {
      const url = f.url as string;
      if (url && !made.has(url) && ['site', 'link', 'design'].includes(String(f.kind))) {
        made.set(url, { label: (f.label as string) || 'Demo', url, tone: 'demo' });
      }
    }
    for (const d of cleanDemoLinks(prop?.demo_links)) {
      if (!made.has(d.url)) made.set(d.url, { label: d.label || 'Demo', url: d.url, tone: 'demo' });
    }

    const committed =
      Boolean(prop?.signed_at) ||
      prop?.deposit_status === 'paid' ||
      prods.length > 0 ||
      projs.some((p) => p.demo_order_id);
    const live = projs.some((p) => p.site_published_at || p.site_live_url);
    const building = projs.length > 0;

    const revisions = projs.reduce<{ used: number; included: number }>(
      (acc, p) => ({
        used: acc.used + (Number(p.revisions_used) || 0),
        included: acc.included + (Number(p.revisions_included) || 0),
      }),
      { used: 0, included: 0 }
    );

    // The one line that tells Sarah what this client needs from her TODAY.
    // Rank drives the book's default sort: needs-you first, waiting-on-them
    // second, quiet last.
    const openReqs = openByEmail.get(email) ?? 0;
    const editReady = projs.some((p) => p.edit_status === 'ready');
    const buildFailed = projs.some((p) => p.site_build_status === 'failed');
    const days = (iso: unknown) => Math.max(0, Math.floor((Date.now() - new Date(String(iso)).getTime()) / 86_400_000));
    let nextAction: { label: string; tone: 'red' | 'gold' | 'blue' | 'green'; rank: number };
    if (editReady) nextAction = { label: 'Client edit waiting on your approval', tone: 'red', rank: 0 };
    else if (openReqs > 0) nextAction = { label: `${openReqs} message${openReqs === 1 ? '' : 's'} waiting on you`, tone: 'red', rank: 0 };
    else if (buildFailed) nextAction = { label: 'A build failed. Rebuild it.', tone: 'red', rank: 0 };
    else if (prop && !prop.signed_at && prop.status === 'sent' && prop.sent_at) {
      const d = days(prop.sent_at);
      const opened = Number(prop.view_count) > 0;
      nextAction = {
        label: `Proposal out ${d}d · ${opened ? `opened ${prop.view_count}×` : 'never opened'}${d >= 4 ? '. Nudge them.' : ''}`,
        tone: 'gold',
        rank: 1,
      };
    } else if (prop?.signed_at && prop.deposit_status !== 'paid')
      nextAction = { label: 'Signed, deposit unpaid. Send the link.', tone: 'gold', rank: 1 };
    else if (live) nextAction = { label: 'Live. All quiet.', tone: 'green', rank: 3 };
    else if (building) nextAction = { label: 'In build. Keep it moving.', tone: 'blue', rank: 2 };
    else nextAction = { label: 'On file. Nothing owed.', tone: 'green', rank: 3 };

    return {
      email,
      name: c.name ?? null,
      company: c.company ?? null,
      tier: c.tier ?? null,
      status: c.status ?? null,
      createdAt: c.created_at,
      nextAction,
      spine: { in: true, committed, building, live },
      projects: projs.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        progress: Number(p.progress) || 0,
        liveUrl: (p.site_live_url as string) || null,
        carePlan: Boolean(p.care_plan),
      })),
      products: prods.map((p) => ({ kind: p.kind, label: p.label, status: p.status })),
      made: Array.from(made.values()).slice(0, 8),
      proposal: prop
        ? {
            id: prop.id,
            status: prop.status,
            depositStatus: prop.deposit_status ?? 'unpaid',
            balanceStatus: prop.balance_status ?? null,
            signedAt: prop.signed_at ?? null,
            sentAt: prop.sent_at ?? null,
            shareToken: prop.share_token ?? null,
            oneTime: Number(prop.one_time_total) || 0,
            monthly: Number(prop.monthly_total) || 0,
          }
        : null,
      revisions,
      openRequests: openByEmail.get(email) ?? 0,
    };
  });

  // Needs-you first, waiting-on-them second, quiet last; newest inside a tier.
  rows.sort(
    (a, b) =>
      a.nextAction.rank - b.nextAction.rank ||
      String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
  );

  // Prospects: proposals for people who are not clients yet. The front of the
  // pipeline, visible in the same book instead of buried in the builder.
  const seen = new Set<string>();
  const prospects = proposals
    .filter((p) => {
      const e = lower(p.client_email);
      if (e && clientEmails.has(e)) return false;
      const key = e || String(p.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((p) => ({
      id: p.id,
      email: lower(p.client_email) || null,
      company: (p.client_company as string) || (p.client_name as string) || 'Untitled proposal',
      name: p.client_name ?? null,
      status: p.status,
      sentAt: p.sent_at ?? null,
      signedAt: p.signed_at ?? null,
      shareToken: p.share_token ?? null,
      oneTime: Number(p.one_time_total) || 0,
      monthly: Number(p.monthly_total) || 0,
      demoLinks: cleanDemoLinks(p.demo_links),
      viewCount: Number(p.view_count) || 0,
      lastViewedAt: p.last_viewed_at ?? null,
    }));

  const stats = {
    total: rows.length,
    live: rows.filter((r) => r.spine.live).length,
    building: rows.filter((r) => r.spine.building && !r.spine.live).length,
    awaiting: prospects.filter((p) => p.status === 'sent').length,
    openRequests: rows.reduce((n, r) => n + r.openRequests, 0),
  };

  return NextResponse.json({ clients: rows, prospects, stats });
}
