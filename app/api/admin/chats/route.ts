import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { syncChats } from '@/lib/command-center/chat-store';
import { hydrateDesks } from '@/lib/client-desks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * THE BACK OFFICE VIEW OF EVERY CLIENT'S CHAT AGENT.
 *
 * The client sees their own conversations in their Command Center. This is the
 * other seat: is the agent answering at all, is it turning conversations into
 * leads, and how many people are walking away without leaving a name. None of
 * that was answerable from anywhere before this, because nothing was stored.
 *
 * Admin session required, and unlike the client route this one may legitimately
 * read across clients: that is the entire job. It is mounted under /api/admin,
 * which is the boundary that makes the difference explicit rather than implied.
 */
type Row = {
  client_email: string;
  chat_id: string;
  started_at: string;
  last_at: string;
  page: string | null;
  exchanges: number;
  lead_id: string | null;
  summary: string | null;
  turns: unknown;
};

export async function GET(req: Request) {
  await hydrateDesks();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 503 });

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 30), 1), 365);
  const client = (url.searchParams.get('client') ?? '').trim().toLowerCase();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  let q = sb
    .from('client_chats')
    .select('client_email, chat_id, started_at, last_at, page, exchanges, lead_id, summary, turns')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(500);
  if (client) q = q.eq('client_email', client);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Row[];

  // Per client, the three numbers that say whether the agent is earning its
  // keep. `anonymous` counts only conversations with real back-and-forth: a
  // single bounce is not a missed opportunity and should not be mourned as one.
  const byClient = new Map<string, { client: string; business: string; conversations: number; leads: number; anonymous: number; lastAt: string | null }>();
  for (const p of Object.values(CLIENT_PROJECTS)) {
    if (!p.assistantId) continue;
    byClient.set(p.clientEmail.toLowerCase(), { client: p.clientEmail, business: p.business, conversations: 0, leads: 0, anonymous: 0, lastAt: null });
  }
  for (const r of rows) {
    const k = r.client_email.toLowerCase();
    const agg = byClient.get(k) ?? { client: r.client_email, business: r.client_email, conversations: 0, leads: 0, anonymous: 0, lastAt: null };
    agg.conversations += 1;
    if (r.lead_id) agg.leads += 1;
    else if (r.exchanges >= 2) agg.anonymous += 1;
    if (!agg.lastAt || r.started_at > agg.lastAt) agg.lastAt = r.started_at;
    byClient.set(k, agg);
  }

  return NextResponse.json({
    days,
    summary: [...byClient.values()].sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? '')),
    conversations: rows.map((r) => ({
      client: r.client_email,
      id: r.chat_id,
      startedAt: r.started_at,
      lastAt: r.last_at,
      page: r.page,
      exchanges: r.exchanges,
      becameLead: Boolean(r.lead_id),
      leadId: r.lead_id,
      summary: r.summary,
      turns: Array.isArray(r.turns) ? r.turns : [],
    })),
  });
}

/**
 * Pull now rather than waiting for the top of the hour.
 *
 * For the moment somebody is watching a demo chat go through and wants to see
 * it land, and for backfilling a client whose table is empty because the agent
 * predates this record.
 */
export async function POST(req: Request) {
  await hydrateDesks();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'no database' }, { status: 503 });

  let days = 30;
  let only = '';
  try {
    const body = (await req.json()) as { days?: number; client?: string };
    if (Number.isFinite(body.days)) days = Math.min(Math.max(Number(body.days), 1), 365);
    only = (body.client ?? '').trim().toLowerCase();
  } catch {
    /* no body is fine: sync everything for thirty days */
  }

  const results: Array<{ project: string; client: string; read: boolean; seen: number; written: number }> = [];
  for (const p of Object.values(CLIENT_PROJECTS)) {
    if (!p.assistantId) continue;
    if (only && p.clientEmail.toLowerCase() !== only) continue;
    const got = await syncChats(sb, { clientEmail: p.clientEmail, assistantId: p.assistantId, days });
    results.push({ project: p.key, client: p.clientEmail, ...got });
  }

  return NextResponse.json({ ok: true, results });
}
