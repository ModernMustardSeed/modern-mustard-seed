/**
 * Partner-facing mint. Gated three deep: client session -> approved affiliate
 * with a code -> can_forge granted by an owner on Partner Admin. First mint
 * requires accepting the partner demo agreement (stamped, not re-asked).
 * GET powers the forge station page: remaining slots + the partner's own
 * minted history (hub links only once QA has cleared).
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getClientSession } from '@/lib/client-auth';
import { mintForgedSuite, PARTNER_FORGE_QA_LIFT } from '@/lib/partner-forge';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Per-instance IP throttle (house pattern from /api/demo-station). The dedupe
// probes in the mint run BEFORE any cap slot is claimed, so without this the
// endpoint is a free membership oracle for an authed partner. Soft by nature
// (serverless instances do not share the map); the atomic caps stay the real
// spend ceiling.
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 3600_000;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (list.length >= 20) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

type ForgeAffiliate = {
  id: string;
  email: string;
  name: string | null;
  code: string | null;
  status: string;
  can_forge: boolean;
  forge_daily_cap: number;
  forge_weekly_cap: number;
  forge_agreement_at: string | null;
  forge_qa_approved: number;
};

async function loadForgePartner(supabase: NonNullable<ReturnType<typeof getSupabase>>, email: string): Promise<ForgeAffiliate | null> {
  const { data } = await supabase
    .from('affiliates')
    .select('id, email, name, code, status, can_forge, forge_daily_cap, forge_weekly_cap, forge_agreement_at, forge_qa_approved')
    .eq('email', email.toLowerCase())
    .maybeSingle();
  const aff = data as ForgeAffiliate | null;
  if (!aff || aff.status !== 'approved' || !aff.code) return null;
  return aff;
}

async function usedCount(supabase: NonNullable<ReturnType<typeof getSupabase>>, key: string): Promise<number> {
  const { data } = await supabase.from('app_state').select('value').eq('key', key).maybeSingle();
  return ((data?.value as { n?: number } | null)?.n) ?? 0;
}

function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const aff = await loadForgePartner(supabase, session.email);
  if (!aff) return NextResponse.json({ error: 'not_a_partner' }, { status: 403 });

  const day = new Date().toISOString().slice(0, 10);
  const [usedToday, usedWeek, mintsRes] = await Promise.all([
    usedCount(supabase, `partnerforge:${aff.id}:day:${day}`),
    usedCount(supabase, `partnerforge:${aff.id}:week:${isoWeekKey(new Date())}`),
    supabase
      .from('outbound_leads')
      .select('id, business_name, city, state, created_at, site_demo_status, forge_qa, hub_demo_url')
      .eq('affiliate_id', aff.id)
      .eq('origin', 'partner')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const mints = (mintsRes.data || []).map((m) => ({
    id: m.id,
    business: m.business_name,
    city: m.city,
    state: m.state,
    createdAt: m.created_at,
    siteStatus: m.site_demo_status,
    qaPending: m.forge_qa === 'pending',
    // The hub link is the hand-off; it stays hidden while QA holds the mint.
    hubUrl: m.forge_qa === 'pending' ? null : m.hub_demo_url,
  }));

  return NextResponse.json({
    canForge: aff.can_forge,
    agreementAccepted: Boolean(aff.forge_agreement_at),
    qaApproved: aff.forge_qa_approved,
    qaLift: PARTNER_FORGE_QA_LIFT,
    remainingToday: Math.max(0, aff.forge_daily_cap - usedToday),
    remainingWeek: Math.max(0, aff.forge_weekly_cap - usedWeek),
    dailyCap: aff.forge_daily_cap,
    weeklyCap: aff.forge_weekly_cap,
    mints,
  });
}

export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (throttled(ip)) {
    return NextResponse.json({ error: 'slow_down', message: 'Easy there. The forge takes a breath; try again in a bit.' }, { status: 429 });
  }
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const aff = await loadForgePartner(supabase, session.email);
  if (!aff) return NextResponse.json({ error: 'not_a_partner' }, { status: 403 });
  if (!aff.can_forge) {
    return NextResponse.json(
      { error: 'forge_not_granted', message: 'The forge is invite-only right now. Reply to any email from Sarah and ask for access.' },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // The agreement gate: one-time, stamped forever, required before spend.
  if (!aff.forge_agreement_at) {
    if (body.agree !== true) {
      return NextResponse.json(
        { error: 'agreement_required', message: 'Accept the partner demo agreement to light the forge.' },
        { status: 428 }
      );
    }
    const { error: agreeErr } = await supabase
      .from('affiliates')
      .update({ forge_agreement_at: new Date().toISOString() })
      .eq('id', aff.id)
      .is('forge_agreement_at', null);
    if (agreeErr) {
      console.error('partner-forge agreement stamp failed:', agreeErr.message);
      return NextResponse.json({ error: 'forge_failed' }, { status: 500 });
    }
  }

  const result = await mintForgedSuite(supabase, 'partner', {
    affiliateId: aff.id,
    code: aff.code,
    email: aff.email,
    name: aff.name || aff.email,
    dailyCap: aff.forge_daily_cap,
    weeklyCap: aff.forge_weekly_cap,
    qaApproved: aff.forge_qa_approved,
  }, body);

  if (!result.ok) return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  if (result.duplicate) return NextResponse.json({ ok: true, duplicate: true, message: result.message });
  return NextResponse.json({
    ok: true,
    duplicate: false,
    qaHeld: result.qaHeld,
    business: result.lead.business_name,
    // Same rule as GET: a QA-held mint's hub stays with the house until review.
    hubUrl: result.qaHeld ? null : result.lead.hub_demo_url,
  });
}
