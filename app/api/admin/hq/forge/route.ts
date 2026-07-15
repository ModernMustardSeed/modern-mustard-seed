/**
 * Team-facing mint ("Forge for a business you know" in the admin Partner Hub).
 * Same shared mint as the partner route, origin 'rep': attribution rides the
 * minter's own affiliate identity when they have one (Sarah, Polly, Easton all
 * do via team_members.affiliate_code), caps are identical, QA never holds.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { getAdminUser } from '@/lib/admin-auth';
import { resolveAdminPartner } from '@/lib/admin-partner';
import { mintForgedSuite, isoWeekKey } from '@/lib/partner-forge';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEFAULT_DAILY_CAP = 3;
const DEFAULT_WEEKLY_CAP = 10;

type MinterCaps = { affiliateId: string | null; code: string | null; email: string; name: string; dailyCap: number; weeklyCap: number };

async function resolveMinter(supabase: NonNullable<ReturnType<typeof getSupabase>>, user: { email: string; name: string }): Promise<MinterCaps> {
  const partner = await resolveAdminPartner(user as Parameters<typeof resolveAdminPartner>[0]);
  let affiliateId: string | null = null;
  let dailyCap = DEFAULT_DAILY_CAP;
  let weeklyCap = DEFAULT_WEEKLY_CAP;
  if (partner) {
    const { data: aff } = await supabase
      .from('affiliates')
      .select('id, forge_daily_cap, forge_weekly_cap')
      .eq('code', partner.code)
      .maybeSingle();
    if (aff) {
      affiliateId = aff.id as string;
      dailyCap = (aff.forge_daily_cap as number) ?? DEFAULT_DAILY_CAP;
      weeklyCap = (aff.forge_weekly_cap as number) ?? DEFAULT_WEEKLY_CAP;
    }
  }
  return { affiliateId, code: partner?.code || null, email: partner?.partnerEmail || user.email, name: partner?.name || user.name || user.email, dailyCap, weeklyCap };
}

async function usedCount(supabase: NonNullable<ReturnType<typeof getSupabase>>, key: string): Promise<number> {
  const { data } = await supabase.from('app_state').select('value').eq('key', key).maybeSingle();
  return ((data?.value as { n?: number } | null)?.n) ?? 0;
}

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const minter = await resolveMinter(supabase, user);
  const minterKey = minter.affiliateId || `rep:${minter.email}`;
  const day = new Date().toISOString().slice(0, 10);
  const [usedToday, usedWeek, mintsRes] = await Promise.all([
    usedCount(supabase, `partnerforge:${minterKey}:day:${day}`),
    usedCount(supabase, `partnerforge:${minterKey}:week:${isoWeekKey(new Date())}`),
    supabase
      .from('outbound_leads')
      .select('id, business_name, city, state, created_at, site_demo_status, hub_demo_url, notes')
      .eq('origin', 'rep')
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
    hubUrl: m.hub_demo_url,
    mintedBy: /^REP FORGE: pre-forged by ([^\n]+?) from the Partner Hub\./.exec(m.notes || '')?.[1] || null,
  }));

  return NextResponse.json({
    mints,
    remainingToday: Math.max(0, minter.dailyCap - usedToday),
    remainingWeek: Math.max(0, minter.weeklyCap - usedWeek),
    dailyCap: minter.dailyCap,
    weeklyCap: minter.weeklyCap,
  });
}

export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Attribution + caps from the minter's partner identity when one exists;
  // plain admins mint uncredited under the same default caps.
  const minter = await resolveMinter(supabase, user);

  const result = await mintForgedSuite(supabase, 'rep', {
    ...minter,
    qaApproved: Number.MAX_SAFE_INTEGER, // rep mints are never QA-held
  }, body);

  if (!result.ok) return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  if (result.duplicate) {
    return NextResponse.json({ ok: true, duplicate: true, message: result.message, existing: result.existing || null });
  }
  return NextResponse.json({
    ok: true,
    duplicate: false,
    leadId: result.lead.id,
    business: result.lead.business_name,
    hubUrl: result.lead.hub_demo_url,
  });
}
