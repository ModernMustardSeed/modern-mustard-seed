import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

const COLS = 'id, business_name, email, site_demo_url, os_demo_url, hub_demo_url, demo_url';

type LeadRow = {
  id: string;
  business_name: string | null;
  email: string | null;
  site_demo_url: string | null;
  os_demo_url: string | null;
  hub_demo_url: string | null;
  demo_url: string | null;
};

/**
 * The bridge that never existed: the demos forged for an outbound lead,
 * surfaced to the proposal builder so the document can carry them. Before this,
 * the cockpit and the proposal builder had zero references to each other; the
 * demo that closes the deal was invisible in the document that asks for the
 * signature. Looks up outbound_leads by email first, then by business name.
 */
export async function GET(req: Request) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const u = new URL(req.url);
  const email = (u.searchParams.get('email') || '').trim().toLowerCase();
  const company = (u.searchParams.get('company') || '').trim();
  if (!email && !company) return NextResponse.json({ links: [] });

  let lead: LeadRow | null = null;
  if (email) {
    const { data } = await sb.from('outbound_leads').select(COLS).ilike('email', email).limit(1).maybeSingle();
    lead = (data as LeadRow | null) ?? null;
  }
  if (!lead && company) {
    const { data } = await sb
      .from('outbound_leads')
      .select(COLS)
      .ilike('business_name', `%${company}%`)
      .limit(1)
      .maybeSingle();
    lead = (data as LeadRow | null) ?? null;
  }
  if (!lead) return NextResponse.json({ links: [] });

  const links = [
    lead.site_demo_url ? { label: 'Your new website, live now', url: lead.site_demo_url } : null,
    lead.demo_url ? { label: 'Your AI receptionist, call it', url: lead.demo_url } : null,
    lead.os_demo_url ? { label: 'Your command center', url: lead.os_demo_url } : null,
    lead.hub_demo_url ? { label: 'Your demo hub', url: lead.hub_demo_url } : null,
  ].filter(Boolean);

  return NextResponse.json({ links, business: lead.business_name ?? null });
}
