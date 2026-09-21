/**
 * WHAT PEOPLE ASKED THE WEBSITE, stitched back into conversations.
 *
 * The chat on a client's site runs on a Vapi assistant; every exchange is a
 * chat record chained to the one before it. This walks each chain to its root
 * so one visitor reads as one conversation, newest first.
 *
 * Read from the provider, never stored here: it is their data and a copy is
 * one more place it can leak from. Returns null when the provider could not
 * be read, so a caller can say "could not be read" instead of printing a zero
 * that nobody counted.
 */
export type ChatTurn = { role: 'user' | 'assistant'; content: string; at: string };
export type ChatConversation = { id: string; startedAt: string; page: string | null; turns: ChatTurn[]; exchanges: number };

type Chat = { id: string; previousChatId?: string; createdAt: string; input?: Array<{ role: string; content: string }> | string; output?: Array<{ role: string; content: string }>; metadata?: { variableValues?: { page?: string } } };

export function chatKeyConfigured(): boolean {
  const key = process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY;
  return Boolean(key) && !/^\[SENSITIVE\]$/i.test(String(key));
}

export async function listConversations(assistantId: string, days = 30): Promise<ChatConversation[] | null> {
  const key = process.env.VAPI_API_KEY || process.env.VAPI_PRIVATE_KEY;
  if (!key || /^\[SENSITIVE\]$/i.test(key)) return null;

  const since = Date.now() - days * 86_400_000;
  let chats: Chat[];
  try {
    const r = await fetch(`https://api.vapi.ai/chat?assistantId=${assistantId}&limit=200`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as Chat[] | { results?: Chat[] };
    chats = (Array.isArray(j) ? j : (j.results ?? [])).filter((c) => Date.parse(c.createdAt) >= since);
  } catch {
    return null;
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
  return [...groups.entries()]
    .map(([id, list]) => {
      list.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      const turns: ChatTurn[] = [];
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
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}
