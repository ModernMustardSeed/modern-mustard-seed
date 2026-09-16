import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { visibleProject } from '@/lib/command-center/visible';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * WHAT PEOPLE ASKED THE WEBSITE. The chat on the client's site runs on a
 * Vapi assistant; every exchange is a chat record chained to the one before
 * it. This stitches the chain back into conversations, newest first, so the
 * owner reads what a visitor actually asked in their own words, and which
 * page they were standing on when they asked it.
 *
 * Read from the provider, never stored here: it is their data and a copy is
 * one more place it can leak from. Scoped by the signed-in email through the
 * project's assistant id; the browser never names an assistant.
 */
type Turn = { role: 'user' | 'assistant'; content: string; at: string };
type Chat = { id: string; previousChatId?: string; createdAt: string; input?: Array<{ role: string; content: string }> | string; output?: Array<{ role: string; content: string }>; metadata?: { variableValues?: { page?: string } } };

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = sb ? await visibleProject(sb, session.email) : null;
  const key = process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY;
  if (!project?.assistantId || !key || /^\[SENSITIVE\]$/i.test(key)) return NextResponse.json({ conversations: [], days: 30 });

  const since = Date.now() - 30 * 86_400_000;
  let chats: Chat[] = [];
  try {
    const r = await fetch(`https://api.vapi.ai/chat?assistantId=${project.assistantId}&limit=200`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) });
    if (r.ok) {
      const j = (await r.json()) as Chat[] | { results?: Chat[] };
      chats = (Array.isArray(j) ? j : (j.results ?? [])).filter((c) => Date.parse(c.createdAt) >= since);
    }
  } catch {
    /* the provider being down is not the client's problem to debug */
  }

  // Chain: each chat names the one before it. Walk every chain to its root.
  const byId = new Map(chats.map((c) => [c.id, c]));
  const rootOf = (c: Chat): string => {
    let cur = c;
    const seen = new Set<string>();
    while (cur.previousChatId && byId.has(cur.previousChatId) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.previousChatId)!;
    }
    return cur.id;
  };
  const groups = new Map<string, Chat[]>();
  for (const c of chats) {
    const root = rootOf(c);
    groups.set(root, [...(groups.get(root) ?? []), c]);
  }
  const text = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map((m) => (typeof m?.content === 'string' ? m.content : '')).filter(Boolean).join('\n');
    return '';
  };
  const conversations = [...groups.entries()]
    .map(([id, list]) => {
      list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      const turns: Turn[] = [];
      for (const c of list) {
        const q = text(c.input);
        const a = text(c.output);
        if (q) turns.push({ role: 'user', content: q.slice(0, 2000), at: c.createdAt });
        if (a) turns.push({ role: 'assistant', content: a.slice(0, 4000), at: c.createdAt });
      }
      const page = list.find((c) => c.metadata?.variableValues?.page)?.metadata?.variableValues?.page ?? null;
      return { id, startedAt: list[0].createdAt, page, turns, exchanges: list.length };
    })
    .filter((c) => c.turns.length > 0)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    .slice(0, 60);

  return NextResponse.json({ conversations, days: 30 });
}
