import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

type Event = { when: string; label: string; detail?: string; kind: string };

/** Merged activity timeline for one contact (by email): proposals, payments, projects. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ events: [] });

  const events: Event[] = [];

  try {
    const { data: props } = await supabase
      .from('proposals')
      .select('created_at, signed_at, signed_name, deposit_paid_at, balance_paid_at, client_company, status')
      .ilike('client_email', email);
    for (const p of props ?? []) {
      const who = (p.client_company as string) || 'proposal';
      if (p.created_at) events.push({ when: p.created_at as string, kind: 'proposal', label: 'Proposal created', detail: who });
      if (p.signed_at) events.push({ when: p.signed_at as string, kind: 'signed', label: 'Proposal signed', detail: (p.signed_name as string) || undefined });
      if (p.deposit_paid_at) events.push({ when: p.deposit_paid_at as string, kind: 'paid', label: 'Deposit paid', detail: undefined });
      if (p.balance_paid_at) events.push({ when: p.balance_paid_at as string, kind: 'paid', label: 'Balance paid in full', detail: undefined });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('product_name, price_paid_cents, created_at, item_type')
      .ilike('email', email)
      .eq('status', 'paid');
    for (const o of orders ?? []) {
      const amt = `$${(((o.price_paid_cents as number) || 0) / 100).toLocaleString('en-US')}`;
      events.push({ when: o.created_at as string, kind: 'paid', label: `Paid: ${o.product_name as string}`, detail: amt });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: projects } = await supabase.from('projects').select('name, created_at').ilike('client_email', email);
    for (const pr of projects ?? []) {
      events.push({ when: pr.created_at as string, kind: 'project', label: `Project created: ${pr.name as string}` });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: audits } = await supabase
      .from('saved_audits')
      .select('url, score, letter, created_at')
      .ilike('client_email', email);
    for (const a of audits ?? []) {
      const score = a.score != null ? `${a.score}/100${a.letter ? ` (${a.letter})` : ''}` : undefined;
      events.push({
        when: a.created_at as string,
        kind: 'audit',
        label: `Website audit saved${a.url ? `: ${a.url as string}` : ''}`,
        detail: score,
      });
    }
  } catch {
    /* ignore */
  }

  try {
    const { data: reqs } = await supabase
      .from('client_requests')
      .select('body, source, created_at')
      .ilike('client_email', email);
    for (const r of reqs ?? []) {
      events.push({
        when: r.created_at as string,
        kind: 'message',
        label: r.source === 'chatbot' ? 'Message via Mr. Mustard Seed' : 'Client message',
        detail: (r.body as string)?.slice(0, 140),
      });
    }
  } catch {
    /* ignore */
  }

  events.sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime());
  return NextResponse.json({ events });
}
