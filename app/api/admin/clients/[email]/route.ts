import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * ONE aggregate read for a single client, so Sarah never again reconstructs a
 * customer from six tables and two boards. Everything a client is, in one payload:
 * their record, what they own (the unified layer), their build, billing, orders,
 * and the two-way message thread. Every block is best-effort: a not-yet-migrated
 * table yields an empty section, never a 500.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ email: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = decodeURIComponent((await params).email || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'No email' }, { status: 400 });

  let client: Record<string, unknown> | null = null;
  try {
    const { data } = await sb.from('clients').select('email, name, company, tier, status, welcome_note, created_at').eq('email', email).maybeSingle();
    client = data ?? null;
  } catch { /* clients not migrated */ }

  let products: unknown[] = [];
  try {
    const { data } = await sb
      .from('client_products')
      .select('id, kind, label, tier, status, home_url, detail, amount_cents, created_at')
      .eq('client_email', email)
      .order('created_at', { ascending: false });
    products = data ?? [];
  } catch { /* client_products not migrated */ }

  let projects: unknown[] = [];
  const BASE = 'id, name, status, summary, progress, launch_target, care_plan, site_live_url, moodboard_status, revisions_included, revisions_used, created_at';
  // The site columns (edit state, template, whether html exists) came later; a
  // database missing one of them must still return the projects.
  const projectQuery = (cols: string) => sb.from('projects').select(cols).eq('client_email', email).order('created_at', { ascending: false });
  try {
    const wide = await projectQuery(`${BASE}, site_template, edit_status, edit_error, edit_instruction, edit_requested_at, site_html, demo_site_id`);
    let data = wide.data;
    if (wide.error) ({ data } = await projectQuery(BASE));
    // The html itself never leaves the route; the card only needs to know it exists.
    projects = ((data ?? []) as unknown as Record<string, unknown>[]).map((p) => {
      const { site_html, ...rest } = p as { site_html?: string | null } & Record<string, unknown>;
      return { ...rest, has_site: Boolean(site_html) };
    });
  } catch { /* projects columns differ */ }

  let orders: unknown[] = [];
  try {
    const { data } = await sb
      .from('orders')
      .select('stripe_session_id, product_name, item_type, price_paid_cents, status, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false });
    orders = data ?? [];
  } catch { /* orders missing */ }

  let billing: Record<string, unknown> | null = null;
  try {
    const { data } = await sb
      .from('proposals')
      .select('one_time_total, monthly_total, deposit_amount, deposit_status, balance_status, signed_at, status, subscription_status, updated_at')
      .eq('client_email', email)
      .in('status', ['accepted', 'sent'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    billing = data ?? null;
  } catch { /* proposals not migrated */ }

  let messages: unknown[] = [];
  try {
    const { data } = await sb
      .from('client_requests')
      .select('id, body, source, status, reply_body, replied_at, proposed_date, created_at')
      .eq('client_email', email)
      .order('created_at', { ascending: false })
      .limit(50);
    messages = data ?? [];
  } catch { /* client_requests not migrated */ }

  // Everything we ever made or filed for them: demos, live links, docs.
  let files: unknown[] = [];
  try {
    const { data } = await sb
      .from('client_files')
      .select('id, label, url, kind, created_at')
      .eq('client_email', email)
      .order('created_at', { ascending: false })
      .limit(50);
    files = data ?? [];
  } catch { /* client_files not migrated */ }

  // Every proposal, with its share token so the doc is one click away.
  let proposals: unknown[] = [];
  try {
    const { data } = await sb
      .from('proposals')
      .select('id, status, one_time_total, monthly_total, deposit_status, balance_status, signed_at, sent_at, share_token, updated_at')
      .eq('client_email', email)
      .order('updated_at', { ascending: false })
      .limit(10);
    proposals = data ?? [];
  } catch { /* proposals not migrated */ }

  /* The intake answers. The table has existed and been written to since the
   * first brand intake, and this card never read it, so everything a client
   * told us about his own business was invisible on the one screen built to
   * show us that client. */
  let intake: Record<string, unknown> | null = null;
  try {
    const { data } = await sb
      .from('client_intake')
      .select('answers, status, submitted_at')
      .eq('client_email', email)
      .maybeSingle();
    intake = (data as Record<string, unknown> | null) ?? null;
  } catch { /* client_intake not migrated */ }

  return NextResponse.json({ email, client, products, projects, orders, billing, messages, files, proposals, intake });
}
