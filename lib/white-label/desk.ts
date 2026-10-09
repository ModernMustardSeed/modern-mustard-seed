import { getSupabase } from '@/lib/supabase';
import { wlBaseFor } from '@/data/white-label-hosts';
import { syncAssistantCalls } from '@/lib/voice-calls';
import { wlClientKey, wlClientKeyValid } from '@/lib/white-label/key';
import { getAgencyBySlug, getClient, updateClient, type Agency, type WlClient } from '@/lib/white-label/store';

/**
 * THE CLIENT DESK. The page a white label client opens to see every call its
 * receptionist took, wearing the agency's brand and never ours:
 *
 *   /white-label/hq/<agency slug>/c/<client id>?k=<client key>
 *
 * The key is the HMAC of the client id (lib/white-label/key.ts), so the link
 * opens this one client's calls and nothing of the agency's. The agency must be
 * approved or active and the client not cancelled, so pausing either closes it.
 */

const SITE = 'https://modernmustardseed.com';

export function deskUrl(agencySlug: string, clientId: string, callId?: string): string | null {
  const k = wlClientKey(clientId);
  if (!k) return null;
  const q = new URLSearchParams({ k });
  if (callId) q.set('call', callId);
  const own = wlBaseFor(agencySlug);
  return own ? `${own}/desk/${clientId}?${q.toString()}` : `${SITE}/white-label/hq/${agencySlug}/c/${clientId}?${q.toString()}`;
}

export async function deskFromKey(
  agencySlug: string,
  clientId: string,
  key: string | null | undefined,
): Promise<{ agency: Agency; client: WlClient } | null> {
  if (!/^[a-z0-9-]{1,70}$/.test(agencySlug) || !/^[0-9a-f-]{36}$/i.test(clientId)) return null;
  if (!wlClientKeyValid(clientId, key)) return null;
  const [agency, client] = await Promise.all([getAgencyBySlug(agencySlug), getClient(clientId)]);
  if (!agency || !client || client.agency_id !== agency.id) return null;
  if (agency.status !== 'approved' && agency.status !== 'active') return null;
  if (client.status === 'cancelled') return null;
  return { agency, client };
}

export type Intake = {
  caller_name?: string;
  callback_number?: string;
  email?: string;
  best_time_to_call?: string;
  caller_type?: string;
  existing_client?: boolean;
  matter_type?: string;
  county?: string;
  opposing_party?: string;
  other_parties?: string;
  deadline?: string;
  in_custody?: boolean;
  urgent?: boolean;
  urgent_reason?: string;
  wants_consultation?: boolean;
  asked_for?: string;
  referral_source?: string;
  summary_for_attorney?: string;
};

export type DeskCall = {
  id: string;
  startedAt: string | null;
  seconds: number | null;
  callerNumber: string | null;
  web: boolean;
  summary: string | null;
  intake: Intake;
  turns: { who: 'agent' | 'caller'; text: string }[];
  endedReason: string | null;
  hasRecording: boolean;
  handledAt: string | null;
};

type Row = {
  vapi_call_id: string;
  started_at: string | null;
  duration_sec: number | null;
  caller_number: string | null;
  direction: string | null;
  summary: string | null;
  messages: { role: string; text: string }[] | null;
  ended_reason: string | null;
  recording_url: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Every call this client's receptionist took, newest first. Pulls this one
 * assistant fresh from Vapi first, so a call that ended a minute ago is on the
 * desk, then reads the log, which keeps calls after Vapi ages them out. A
 * call nobody spoke on is left off: it is a ring, not a message.
 */
export async function deskCalls(client: WlClient, limit = 200): Promise<{ calls: DeskCall[]; fresh: boolean }> {
  if (!client.vapi_assistant_id) return { calls: [], fresh: true };
  const synced = await syncAssistantCalls(client.vapi_assistant_id).catch(() => null);
  const sb = getSupabase();
  if (!sb) return { calls: [], fresh: false };
  const { data } = await sb
    .from('voice_calls')
    .select('vapi_call_id,started_at,duration_sec,caller_number,direction,summary,messages,ended_reason,recording_url,metadata')
    .eq('assistant_id', client.vapi_assistant_id)
    .order('started_at', { ascending: false })
    .limit(limit);
  const handled = client.desk_handled ?? {};
  const calls = ((data ?? []) as Row[])
    .map((r): DeskCall => {
      const turns = (r.messages ?? [])
        .filter((m) => (m.role === 'assistant' || m.role === 'user') && m.text?.trim())
        .map((m) => ({ who: m.role === 'user' ? ('caller' as const) : ('agent' as const), text: m.text.trim() }));
      const intake = (r.metadata?.intake && typeof r.metadata.intake === 'object' ? r.metadata.intake : {}) as Intake;
      return {
        id: r.vapi_call_id,
        startedAt: r.started_at,
        seconds: r.duration_sec,
        callerNumber: r.caller_number,
        web: r.direction === 'web' || !r.caller_number,
        summary: r.summary,
        intake,
        turns,
        endedReason: r.ended_reason,
        hasRecording: Boolean(r.recording_url),
        handledAt: handled[r.vapi_call_id] ?? null,
      };
    })
    .filter((c, i) => c.turns.some((t) => t.who === 'caller') && !isBench((data ?? [])[i] as Row));
  return { calls, fresh: Boolean(synced?.ok) };
}

/** Our own scripted test calls (scripts/vapi-bench.mjs) are not the office's calls. */
function isBench(r: Row | undefined): boolean {
  return /^bench:/.test(String(r?.metadata?.callName ?? ''));
}

/** True when this call belongs to this client's receptionist. */
export async function callBelongs(client: WlClient, callId: string): Promise<boolean> {
  if (!client.vapi_assistant_id || !/^[0-9a-f-]{36}$/i.test(callId)) return false;
  const sb = getSupabase();
  if (!sb) return false;
  const { data } = await sb.from('voice_calls').select('assistant_id').eq('vapi_call_id', callId).maybeSingle();
  return (data as { assistant_id?: string } | null)?.assistant_id === client.vapi_assistant_id;
}

export async function markHandled(client: WlClient, callId: string, handled: boolean): Promise<Record<string, string>> {
  const next = { ...(client.desk_handled ?? {}) };
  if (handled) next[callId] = new Date().toISOString();
  else delete next[callId];
  const saved = await updateClient(client.id, { desk_handled: next });
  return saved.desk_handled ?? next;
}
