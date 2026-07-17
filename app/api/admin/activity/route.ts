import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * The live activity feed for the command center: the same moments that fire an
 * owner email (a new partner, a new lead, a new sale) merged into one time-sorted
 * stream, so Sarah sees what is happening at a glance without opening her inbox.
 * Every source is best-effort so a missing table degrades to fewer events, not a
 * 500. Real rows only, nothing fabricated.
 */

export type ActivityEvent = {
  id: string;
  kind: 'partner' | 'lead' | 'sale' | 'client';
  emoji: string;
  title: string;
  detail: string;
  email: string;
  whenIso: string;
  amountCents?: number;
};

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const events: ActivityEvent[] = [];

  const [partnersRes, leadsRes, ordersRes, clientsRes] = await Promise.all([
    supabase.from('affiliates').select('id,email,name,status,promote_where,created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('leads').select('id,email,name,type,status,created_at').order('created_at', { ascending: false }).limit(14),
    supabase.from('orders').select('id,email,name,product_name,price_paid_cents,created_at,status').eq('status', 'paid').order('created_at', { ascending: false }).limit(14),
    supabase.from('clients').select('email,name,company,created_at').order('created_at', { ascending: false }).limit(12),
  ]);

  for (const a of partnersRes.data ?? []) {
    const approved = a.status === 'approved';
    events.push({
      id: `partner-${a.id}`,
      kind: 'partner',
      emoji: approved ? '🤝' : '🌱',
      title: approved ? 'New partner joined' : 'New partner application',
      detail: `${a.name || a.email}${a.promote_where ? ` · ${a.promote_where}` : ''}`,
      email: a.email as string,
      whenIso: a.created_at as string,
    });
  }

  for (const l of leadsRes.data ?? []) {
    const type = String(l.type || 'lead').replace(/-/g, ' ');
    events.push({
      id: `lead-${l.id}`,
      kind: 'lead',
      emoji: '📥',
      title: 'New lead',
      detail: `${l.name || l.email} · ${type}`,
      email: l.email as string,
      whenIso: l.created_at as string,
    });
  }

  for (const o of ordersRes.data ?? []) {
    events.push({
      id: `sale-${o.id}`,
      kind: 'sale',
      emoji: '💰',
      title: 'New sale',
      detail: `${o.name || o.email} · ${o.product_name || 'purchase'}`,
      email: o.email as string,
      whenIso: o.created_at as string,
      amountCents: Number(o.price_paid_cents) || 0,
    });
  }

  for (const c of clientsRes.data ?? []) {
    events.push({
      id: `client-${c.email}`,
      kind: 'client',
      emoji: '🎉',
      title: 'New client aboard',
      detail: `${(c.company as string) || (c.name as string) || c.email} joined`,
      email: c.email as string,
      whenIso: c.created_at as string,
    });
  }

  events.sort((a, b) => new Date(b.whenIso).getTime() - new Date(a.whenIso).getTime());

  return NextResponse.json({ events: events.slice(0, 22), generatedAt: new Date().toISOString() });
}
