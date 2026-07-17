import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { displayForIso } from '@/lib/booking';
import { googleReviewUrl as GOOGLE_REVIEW_FALLBACK } from '@/data/socials';

export const runtime = 'nodejs';

/**
 * Everything the signed-in client should see, scoped strictly to their email:
 * their engagement record, project + milestones, files, store downloads, and
 * upcoming calls. Each block is best-effort so a not-yet-migrated table just
 * yields an empty section instead of failing the whole portal.
 */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = session.email;
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let client: { name: string | null; company: string | null; tier: string; welcomeNote: string | null } | null = null;
  try {
    const { data } = await supabase.from('clients').select('name, company, tier, welcome_note').eq('email', email).maybeSingle();
    if (data) client = { name: (data.name as string | null) ?? null, company: (data.company as string | null) ?? null, tier: (data.tier as string) ?? 'engagement', welcomeNote: (data.welcome_note as string | null) ?? null };
  } catch {
    /* clients table not migrated */
  }

  let projects: Array<{ id: string; name: string; status: string; summary: string | null; progress: number; milestones: Array<{ title: string; detail?: string; done?: boolean; due?: string }>; launchTarget: string | null }> = [];
  // A demo-funnel client (project provisioned from a demo_order) is onboarded by
  // the DEMO intake, not the old proposal->deposit->intake flow. We use this to
  // suppress the proposal-based onboarding, which otherwise bleeds a stale or
  // unrelated proposal into a self-serve buyer's portal.
  let isDemoClient = false;
  try {
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, summary, progress, milestones, launch_target, demo_order_id')
      .eq('client_email', email)
      .order('created_at', { ascending: false });
    if (data) {
      isDemoClient = data.some((p) => p.demo_order_id != null);
      projects = data.map((p) => ({
        id: p.id as string,
        name: p.name as string,
        status: p.status as string,
        summary: (p.summary as string | null) ?? null,
        progress: Number(p.progress) || 0,
        milestones: Array.isArray(p.milestones) ? (p.milestones as Array<{ title: string; detail?: string; done?: boolean; due?: string }>) : [],
        launchTarget: (p.launch_target as string | null) ?? null,
      }));
    }
  } catch {
    /* projects table not migrated */
  }

  // Billing: the client's accepted proposal (deposit/balance state).
  let billing: {
    oneTime: number;
    deposit: number;
    depositPaid: boolean;
    balanceDue: number;
    balancePaid: boolean;
    signed: boolean;
    monthly: number;
    subscriptionStatus: string;
  } | null = null;
  try {
    const { data } = await supabase
      .from('proposals')
      .select('one_time_total, monthly_total, deposit_amount, deposit_status, balance_status, signed_at, status, subscription_status')
      .eq('client_email', email)
      .in('status', ['accepted', 'sent'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const oneTime = Number(data.one_time_total) || 0;
      const deposit = Math.round(Number(data.deposit_amount) || Math.round(oneTime * 0.5));
      billing = {
        oneTime,
        deposit,
        depositPaid: data.deposit_status === 'paid',
        balanceDue: Math.max(0, oneTime - deposit),
        balancePaid: data.balance_status === 'paid',
        signed: !!data.signed_at,
        monthly: Number(data.monthly_total) || 0,
        subscriptionStatus: (data.subscription_status as string) || 'none',
      };
    }
  } catch {
    /* proposals not migrated */
  }

  let files: Array<{ label: string; url: string; kind: string }> = [];
  try {
    const { data } = await supabase.from('client_files').select('label, url, kind').eq('client_email', email).order('created_at', { ascending: false });
    if (data) files = data.map((f) => ({ label: f.label as string, url: f.url as string, kind: (f.kind as string) ?? 'link' }));
  } catch {
    /* client_files table not migrated */
  }

  let orders: Array<{ sessionId: string; productName: string; createdAt: string }> = [];
  try {
    const { data } = await supabase
      .from('orders')
      .select('stripe_session_id, product_name, created_at, status')
      .eq('email', email)
      .eq('status', 'paid')
      .order('created_at', { ascending: false });
    if (data) orders = data.map((o) => ({ sessionId: o.stripe_session_id as string, productName: o.product_name as string, createdAt: o.created_at as string }));
  } catch {
    /* orders table missing */
  }

  let bookings: Array<{ whenIso: string; display: string }> = [];
  try {
    const { data } = await supabase
      .from('leads')
      .select('timeline')
      .eq('email', email)
      .eq('source', 'mustard-seed-booking')
      .eq('status', 'booked')
      .gte('timeline', new Date().toISOString())
      .order('timeline', { ascending: true });
    if (data) bookings = data.filter((b) => b.timeline).map((b) => ({ whenIso: b.timeline as string, display: displayForIso(b.timeline as string).display }));
  } catch {
    /* ignore */
  }

  // Latest saved website audit for this client (so they see the value on file).
  let audit: { url: string | null; score: number | null; letter: string | null; headline: string | null; fixes: Array<{ title: string; how: string }> } | null = null;
  try {
    const { data } = await supabase
      .from('saved_audits')
      .select('url, score, letter, headline, report, created_at')
      .eq('client_email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const rep = (data.report ?? {}) as { top_three_fixes?: Array<{ title?: string; how?: string; why?: string }> };
      const fixes = Array.isArray(rep.top_three_fixes)
        ? rep.top_three_fixes.slice(0, 3).map((f) => ({ title: String(f.title ?? ''), how: String(f.how ?? f.why ?? '') }))
        : [];
      audit = {
        url: (data.url as string | null) ?? null,
        score: (data.score as number | null) ?? null,
        letter: (data.letter as string | null) ?? null,
        headline: (data.headline as string | null) ?? null,
        fixes,
      };
    }
  } catch {
    /* saved_audits not migrated */
  }

  const isClient = !!client || projects.length > 0;
  const isBuyer = orders.length > 0;
  const audience = isClient && isBuyer ? 'both' : isClient ? 'client' : isBuyer ? 'buyer' : 'guest';

  const googleReviewUrl = process.env.GOOGLE_REVIEW_URL || GOOGLE_REVIEW_FALLBACK;

  return NextResponse.json({ email, client, projects, files, orders, bookings, audience, isDemoClient, billing, audit, googleReviewUrl });
}
