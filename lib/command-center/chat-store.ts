/**
 * THE CONVERSATION RECORD.
 *
 * `chats.ts` knows how to ask Vapi what happened and stitch a chain of chats
 * back into one visitor's conversation. It is still the only thing that talks
 * to the provider, and this module does not duplicate a line of it. What this
 * adds is memory: the stitched conversation is written down, so it survives the
 * provider's 200-chat window, can be counted over time, can be read by the back
 * office, and can be joined to the lead it produced.
 *
 * WHY THE DATABASE IS THE READER AND VAPI IS THE REFRESHER. The room used to
 * call Vapi on every page view. That made the page as slow and as available as
 * a third party's API, and it meant an outage rendered as a quiet month. Now
 * the room reads rows, and a cron (and an opportunistic refresh) keeps the rows
 * current. A provider outage costs freshness, which is recoverable, instead of
 * history, which is not.
 *
 * WHAT IS DELIBERATELY NOT STORED. Nothing beyond what the client's own
 * assistant already returned for the client's own site: the turns, when, and
 * which page. No provider keys, no cost, no cross-client anything. Every read
 * in here is scoped by `client_email` and there is no function that takes an
 * assistant id from a browser.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { listConversations, type ChatConversation } from '@/lib/command-center/chats';

export type StoredConversation = ChatConversation & {
  lastAt: string;
  /** The lead this conversation produced, if it produced one. */
  leadId: string | null;
  summary: string | null;
};

type Row = {
  chat_id: string;
  started_at: string;
  last_at: string;
  page: string | null;
  turns: unknown;
  exchanges: number;
  lead_id: string | null;
  summary: string | null;
};

function toStored(r: Row): StoredConversation {
  const turns = Array.isArray(r.turns) ? (r.turns as ChatConversation['turns']) : [];
  return {
    id: r.chat_id,
    startedAt: r.started_at,
    lastAt: r.last_at,
    page: r.page,
    turns,
    exchanges: r.exchanges,
    leadId: r.lead_id,
    summary: r.summary,
  };
}

/**
 * This client's conversations, newest first, from our own table.
 *
 * Never reaches the provider, so it answers at database speed and keeps
 * answering when Vapi is down.
 */
export async function storedConversations(
  sb: SupabaseClient,
  clientEmail: string,
  limit = 60,
): Promise<StoredConversation[]> {
  const { data, error } = await sb
    .from('client_chats')
    .select('chat_id, started_at, last_at, page, turns, exchanges, lead_id, summary')
    .eq('client_email', clientEmail.toLowerCase())
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return ((data ?? []) as Row[]).map(toStored);
}

/**
 * Pull this assistant's recent conversations from Vapi and write them down.
 *
 * Returns what happened rather than throwing, because every caller of this is
 * either a cron that must carry on to the next client or a page refresh that
 * must render regardless. `read: false` means the provider could not be reached
 * and NOTHING was written: that distinction matters, because writing a partial
 * sync as if it were complete is how a conversation silently disappears from
 * the record.
 */
export async function syncChats(
  sb: SupabaseClient,
  opts: { clientEmail: string; assistantId: string; days?: number },
): Promise<{ read: boolean; seen: number; written: number }> {
  const conversations = await listConversations(opts.assistantId, opts.days ?? 30);
  if (conversations === null) return { read: false, seen: 0, written: 0 };

  const email = opts.clientEmail.toLowerCase();
  const rows = conversations.map((c) => {
    // The conversation's last moment is the last turn's, not the first chat's.
    // Sorting a room by started_at alone buries a conversation that is still
    // going under one that opened an hour earlier and ended immediately.
    const lastAt = c.turns.length ? c.turns[c.turns.length - 1].at : c.startedAt;
    return {
      client_email: email,
      assistant_id: opts.assistantId,
      chat_id: c.id,
      started_at: c.startedAt,
      last_at: lastAt,
      page: c.page,
      turns: c.turns,
      exchanges: c.exchanges,
      synced_at: new Date().toISOString(),
    };
  });

  if (!rows.length) return { read: true, seen: 0, written: 0 };

  // Upsert on the conversation, not the row id. A visitor who comes back and
  // keeps typing must grow their existing conversation, and a re-run of this
  // sync must be a no-op rather than a duplicate. `lead_id` and `summary` are
  // deliberately absent from the payload so an upsert never clears a link or a
  // reading that something else established.
  const { error, count } = await sb
    .from('client_chats')
    .upsert(rows, { onConflict: 'assistant_id,chat_id', count: 'exact' });

  if (error) return { read: true, seen: rows.length, written: 0 };
  return { read: true, seen: rows.length, written: count ?? rows.length };
}

/**
 * Tie a conversation to the lead it produced.
 *
 * Called from the lead intake when the agent's tool call carried a chat id.
 * Best effort in both directions and silent on failure: a lead that is written
 * but not linked is a small loss, and a lead that fails to write because the
 * linking failed is a large one. The lead row is the thing that must survive.
 */
export async function linkChatToLead(
  sb: SupabaseClient,
  opts: { assistantId: string; chatId: string; leadId: string },
): Promise<void> {
  try {
    await sb
      .from('client_chats')
      .update({ lead_id: opts.leadId })
      .eq('assistant_id', opts.assistantId)
      .eq('chat_id', opts.chatId);
  } catch {
    /* The lead is written. The link is a convenience. */
  }
}

/**
 * Conversations that never left a name, in a window.
 *
 * This is the question the old live-read could not answer at all, and it is the
 * most valuable one the chat produces: somebody spent real minutes asking about
 * a build and walked away anonymous. `minExchanges` exists so a one-line bounce
 * does not read as a missed opportunity; two exchanges means they asked
 * something and got an answer and asked again.
 */
export async function anonymousConversations(
  sb: SupabaseClient,
  clientEmail: string,
  opts: { days?: number; minExchanges?: number } = {},
): Promise<StoredConversation[]> {
  const since = new Date(Date.now() - (opts.days ?? 7) * 86_400_000).toISOString();
  const { data, error } = await sb
    .from('client_chats')
    .select('chat_id, started_at, last_at, page, turns, exchanges, lead_id, summary')
    .eq('client_email', clientEmail.toLowerCase())
    .is('lead_id', null)
    .gte('started_at', since)
    .gte('exchanges', opts.minExchanges ?? 2)
    .order('started_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return ((data ?? []) as Row[]).map(toStored);
}

/**
 * The chat id Vapi sent with a tool call, if it sent one.
 *
 * Vapi's tool-call envelope has carried the originating conversation under more
 * than one key across its chat and call surfaces, and this runs against a live
 * assistant whose payload shape we do not control. So this reads the candidates
 * rather than betting on one, and returns null when none is present. Null is a
 * normal answer: a lead from a site form has no chat behind it at all.
 */
export function chatIdFromToolCall(message: unknown): string | null {
  const m = message as Record<string, unknown> | undefined;
  if (!m || typeof m !== 'object') return null;
  const candidates = [
    (m.chat as Record<string, unknown> | undefined)?.id,
    m.chatId,
    (m.call as Record<string, unknown> | undefined)?.id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }
  return null;
}
