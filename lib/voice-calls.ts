import { getSupabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { partnerForLine } from '@/lib/vapi-lines';

/**
 * THE CALL LOG.
 *
 * One record per call any voice agent on the Vapi org takes: Mr. Mustard on
 * the studio lines, every built demo, and every client's own agent. The source
 * is the Vapi API, because that is the only place that sees all of them. A
 * client agent's webhook points at the client's own deploy (August posts to
 * ddlandscapingfl.com, the Wild Horse desk to Cornerstone), so a webhook-only
 * log would never hear about their calls. The studio webhook still writes
 * through at end-of-call (recordEndOfCall) so Mr. Mustard's calls land the
 * second they end, and syncVoiceCalls pulls everything else, plus anything a
 * missed webhook dropped.
 *
 * Attribution to a client is by assistant, through voice_agents. A Front
 * Office row (fo_offices.vapi_assistant_id) is picked up automatically; every
 * other agent is assigned once in /admin/calls and stays assigned.
 */

const VAPI = 'https://api.vapi.ai';
const PAGE = 100;
/** Re-pull calls started inside this window on every sync, because a call's
 *  summary and recording arrive a minute or two after the call itself. */
const RESYNC_WINDOW_MS = 2 * 60 * 60 * 1000;

export type CallKind = 'studio' | 'demo' | 'client' | 'partner' | 'probe' | 'other';

export type VoiceAgentRow = {
  assistant_id: string;
  name: string | null;
  client_email: string | null;
  business: string | null;
  kind: CallKind;
  hidden: boolean;
  last_seen_at: string | null;
};

export type TranscriptTurn = { role: 'assistant' | 'user' | 'tool' | 'system'; text: string; at: number | null };

export type VoiceCallRow = {
  id: string;
  vapi_call_id: string;
  assistant_id: string | null;
  agent_name: string | null;
  client_email: string | null;
  kind: CallKind;
  direction: 'inbound' | 'outbound' | 'web';
  call_type: string | null;
  phone_number_id: string | null;
  line_number: string | null;
  line_label: string | null;
  caller_number: string | null;
  caller_name: string | null;
  status: string | null;
  ended_reason: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  summary: string | null;
  transcript: string | null;
  messages: TranscriptTurn[];
  recording_url: string | null;
  cost_cents: number | null;
  transferred: boolean;
  transferred_to: string | null;
  booked: boolean;
  metadata: Record<string, unknown>;
  synced_at: string;
};

type Json = Record<string, unknown>;

function apiKey(): string | null {
  return env('VAPI_API_KEY') ?? env('VAPI_PRIVATE_KEY');
}

async function vapiGet<T>(path: string): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  const res = await fetch(`${VAPI}${path}`, { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
  if (!res.ok) {
    console.error('vapi GET failed', path, res.status, (await res.text()).slice(0, 300));
    return null;
  }
  return (await res.json()) as T;
}

/* ───────────────────────── shaping a Vapi call ───────────────────────── */

const PROBE = /^__/;

/** A Vapi role becomes one of four. Anything else is dropped from the turns. */
function turnsFrom(messages: unknown): TranscriptTurn[] {
  if (!Array.isArray(messages)) return [];
  const out: TranscriptTurn[] = [];
  for (const m of messages as Json[]) {
    const role = String(m.role ?? '');
    const text = typeof m.message === 'string' ? m.message : typeof m.content === 'string' ? m.content : '';
    const at = typeof m.secondsFromStart === 'number' ? m.secondsFromStart : typeof m.time === 'number' ? m.time : null;
    if (role === 'bot' || role === 'assistant') out.push({ role: 'assistant', text, at });
    else if (role === 'user') out.push({ role: 'user', text, at });
    else if (role === 'tool_calls') {
      const calls = Array.isArray(m.toolCalls) ? (m.toolCalls as Json[]) : [];
      const names = calls.map((c) => String((c.function as Json | undefined)?.name ?? c.name ?? '')).filter(Boolean);
      if (names.length) out.push({ role: 'tool', text: names.join(', '), at });
    }
  }
  return out.filter((t) => t.text.trim().length > 0);
}

function bookedFrom(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  for (const m of messages as Json[]) {
    if (m.role !== 'tool_call_result') continue;
    const name = String(m.name ?? '');
    const result = String(m.result ?? '');
    if (/book/i.test(name) && !/not available|failed|error|could not|unavailable/i.test(result)) return true;
  }
  return false;
}

function directionOf(type: string | null): 'inbound' | 'outbound' | 'web' {
  if (type === 'inboundPhoneCall') return 'inbound';
  if (type === 'outboundPhoneCall') return 'outbound';
  return 'web';
}

type Shaped = Omit<VoiceCallRow, 'id' | 'synced_at' | 'client_email' | 'kind' | 'agent_name'> & {
  agent_name: string | null;
};

/** Everything a call row needs that comes straight off the Vapi object. */
export function shapeCall(c: Json): Shaped {
  const artifact = (c.artifact ?? {}) as Json;
  const analysis = (c.analysis ?? {}) as Json;
  const customer = (c.customer ?? {}) as Json;
  const phone = (c.phoneNumber ?? {}) as Json;
  const assistant = (c.assistant ?? {}) as Json;
  const overrides = (c.assistantOverrides ?? {}) as Json;
  const metadata = {
    ...((c.metadata as Json | undefined) ?? {}),
    ...((overrides.metadata as Json | undefined) ?? {}),
  } as Json;
  const messages = artifact.messages ?? c.messages;
  const started = typeof c.startedAt === 'string' ? c.startedAt : typeof c.createdAt === 'string' ? c.createdAt : null;
  const ended = typeof c.endedAt === 'string' ? c.endedAt : null;
  const duration =
    started && ended ? Math.max(0, Math.round((Date.parse(ended) - Date.parse(started)) / 1000)) : null;
  const endedReason = typeof c.endedReason === 'string' ? c.endedReason : null;
  const transferred = !!endedReason && /forwarded|transfer/i.test(endedReason);
  const phoneNumberId = typeof c.phoneNumberId === 'string' ? c.phoneNumberId : null;
  const line = partnerForLine(phoneNumberId);
  const transcript = typeof artifact.transcript === 'string' ? artifact.transcript : typeof c.transcript === 'string' ? c.transcript : null;
  const summary = typeof analysis.summary === 'string' ? analysis.summary : typeof c.summary === 'string' ? c.summary : null;
  const cost = Number(c.cost);
  return {
    vapi_call_id: String(c.id),
    assistant_id: typeof c.assistantId === 'string' ? c.assistantId : null,
    agent_name: typeof assistant.name === 'string' ? assistant.name : null,
    direction: directionOf(typeof c.type === 'string' ? c.type : null),
    call_type: typeof c.type === 'string' ? c.type : null,
    phone_number_id: phoneNumberId,
    line_number: typeof phone.number === 'string' ? phone.number : null,
    line_label: line ? line.label : typeof phone.name === 'string' ? phone.name : null,
    caller_number: typeof customer.number === 'string' ? customer.number : null,
    caller_name: typeof customer.name === 'string' ? customer.name : null,
    status: typeof c.status === 'string' ? c.status : null,
    ended_reason: endedReason,
    started_at: started,
    ended_at: ended,
    duration_sec: duration,
    summary: summary ? summary.slice(0, 8000) : null,
    transcript: transcript ? transcript.slice(0, 60_000) : null,
    messages: turnsFrom(messages),
    recording_url: typeof artifact.recordingUrl === 'string' ? artifact.recordingUrl : typeof c.recordingUrl === 'string' ? c.recordingUrl : null,
    cost_cents: Number.isFinite(cost) ? Math.round(cost * 100) : null,
    transferred,
    transferred_to: typeof c.forwardedPhoneNumber === 'string' ? c.forwardedPhoneNumber : null,
    booked: bookedFrom(messages),
    metadata,
  };
}

/* ───────────────────────── attribution ───────────────────────── */

type AgentMap = Map<string, VoiceAgentRow>;

/** What kind of call this is, and whose. A demo run on Mr. Mustard's assistant
 *  is a demo, not a studio call, so the override metadata is read first. */
function attribute(shaped: Shaped, agents: AgentMap): { kind: CallKind; client_email: string | null; agent_name: string | null } {
  const agent = shaped.assistant_id ? agents.get(shaped.assistant_id) : undefined;
  const meta = shaped.metadata;
  const name = agent?.name ?? shaped.agent_name ?? null;
  if (agent?.kind === 'probe' || (name && PROBE.test(name))) return { kind: 'probe', client_email: null, agent_name: name };
  if (meta.kind === 'demo-agent' || meta.mode === 'demo' || typeof meta.runId === 'string') {
    const business = typeof meta.business === 'string' ? meta.business : null;
    return { kind: 'demo', client_email: agent?.client_email ?? null, agent_name: business ? `${business} demo` : name };
  }
  if (agent?.client_email) return { kind: 'client', client_email: agent.client_email, agent_name: name };
  if (agent) return { kind: agent.kind, client_email: null, agent_name: name };
  // An assistant that is not on the roster is a transient one Vapi made for a
  // single call (a bench test, a per-call override). Never the studio.
  if (shaped.assistant_id && shaped.assistant_id !== env('VAPI_MUSTARD_ASSISTANT_ID')) {
    return { kind: 'other', client_email: null, agent_name: name ?? 'Temporary agent' };
  }
  if (shaped.phone_number_id && partnerForLine(shaped.phone_number_id)) return { kind: 'partner', client_email: null, agent_name: name };
  return { kind: 'studio', client_email: null, agent_name: name };
}

/** The assistant roster, with a Front Office's owner filled in automatically
 *  and Mr. Mustard marked as the studio. Never overwrites an assignment Sarah
 *  made by hand. */
async function refreshAgents(): Promise<AgentMap> {
  const sb = getSupabase();
  const map: AgentMap = new Map();
  if (!sb) return map;
  const { data: existing } = await sb.from('voice_agents').select('assistant_id,name,client_email,business,kind,hidden,last_seen_at');
  for (const a of (existing ?? []) as VoiceAgentRow[]) map.set(a.assistant_id, a);

  const roster = await vapiGet<Json[]>('/assistant?limit=1000');
  const { data: offices } = await sb.from('fo_offices').select('client_email,business_name,vapi_assistant_id').not('vapi_assistant_id', 'is', null);
  const officeByAssistant = new Map<string, { client_email: string; business_name: string }>();
  for (const o of (offices ?? []) as { client_email: string; business_name: string; vapi_assistant_id: string }[]) {
    officeByAssistant.set(o.vapi_assistant_id, o);
  }
  const mustardId = env('VAPI_MUSTARD_ASSISTANT_ID');
  const now = new Date().toISOString();
  const upserts: Partial<VoiceAgentRow>[] = [];
  for (const a of roster ?? []) {
    const id = String(a.id);
    const name = typeof a.name === 'string' ? a.name : null;
    const prev = map.get(id);
    const office = officeByAssistant.get(id);
    const next: Partial<VoiceAgentRow> & { assistant_id: string; updated_at: string } = {
      assistant_id: id,
      name,
      last_seen_at: now,
      updated_at: now,
    };
    if (!prev) {
      next.kind = name && PROBE.test(name) ? 'probe' : id === mustardId ? 'studio' : office ? 'client' : 'other';
      next.hidden = next.kind === 'probe';
      next.client_email = office?.client_email ?? null;
      next.business = office?.business_name ?? null;
    } else if (!prev.client_email && office) {
      next.client_email = office.client_email;
      next.business = office.business_name;
      next.kind = 'client';
    }
    upserts.push(next);
    map.set(id, { ...(prev ?? { client_email: null, business: null, kind: 'other', hidden: false }), ...next } as VoiceAgentRow);
  }
  if (upserts.length) {
    const { error } = await sb.from('voice_agents').upsert(upserts, { onConflict: 'assistant_id' });
    if (error) console.error('voice_agents upsert failed', error.message);
  }
  return map;
}

/* ───────────────────────── sync ───────────────────────── */

export type SyncResult = { ok: boolean; pulled: number; written: number; reason?: string };

/**
 * Pull calls from Vapi and upsert them. Incremental by default: everything
 * newer than the last call we hold, minus a two hour window so late summaries
 * and recordings get picked up. `full` walks the whole org history.
 */
export async function syncVoiceCalls(opts: { full?: boolean } = {}): Promise<SyncResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, pulled: 0, written: 0, reason: 'no-supabase' };
  if (!apiKey()) return { ok: false, pulled: 0, written: 0, reason: 'no-vapi-key' };

  const agents = await refreshAgents();

  let since: string | null = null;
  if (!opts.full) {
    const { data, error } = await sb.from('voice_calls').select('started_at').order('started_at', { ascending: false }).limit(1);
    if (error) return { ok: false, pulled: 0, written: 0, reason: tableMissing(error) ? 'table-missing' : 'error' };
    const latest = data?.[0]?.started_at as string | undefined;
    if (latest) since = new Date(Date.parse(latest) - RESYNC_WINDOW_MS).toISOString();
  }

  const all: Json[] = [];
  let before: string | null = null;
  for (let page = 0; page < 50; page++) {
    const qs = new URLSearchParams({ limit: String(PAGE) });
    if (since) qs.set('createdAtGt', since);
    if (before) qs.set('createdAtLt', before);
    const batch = await vapiGet<Json[]>(`/call?${qs.toString()}`);
    if (!batch) return { ok: false, pulled: all.length, written: 0, reason: 'vapi-failed' };
    all.push(...batch);
    if (batch.length < PAGE) break;
    const oldest = batch[batch.length - 1];
    before = typeof oldest.createdAt === 'string' ? oldest.createdAt : null;
    if (!before) break;
  }

  let written = 0;
  const now = new Date().toISOString();
  const rows = all
    .filter((c) => typeof c.id === 'string')
    .map((c) => {
      const shaped = shapeCall(c);
      const who = attribute(shaped, agents);
      return { ...shaped, ...who, synced_at: now };
    });
  for (let i = 0; i < rows.length; i += 50) {
    const slice = rows.slice(i, i + 50);
    const { error } = await sb.from('voice_calls').upsert(slice, { onConflict: 'vapi_call_id' });
    if (error) {
      console.error('voice_calls upsert failed', error.message);
      return { ok: false, pulled: all.length, written, reason: tableMissing(error) ? 'table-missing' : 'error' };
    }
    written += slice.length;
  }
  return { ok: true, pulled: all.length, written };
}

/**
 * Write-through from the studio webhook so Mr. Mustard's call is on the log the
 * moment it ends, before the next sync. The webhook message carries the call
 * object plus artifact and analysis at the top level, so both are read.
 */
export async function recordEndOfCall(message: Json): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const call = (message.call ?? {}) as Json;
  if (typeof call.id !== 'string') return null;
  const merged: Json = {
    ...call,
    artifact: { ...((call.artifact as Json | undefined) ?? {}), ...((message.artifact as Json | undefined) ?? {}) },
    analysis: { ...((call.analysis as Json | undefined) ?? {}), ...((message.analysis as Json | undefined) ?? {}) },
    endedReason: message.endedReason ?? call.endedReason ?? null,
    endedAt: call.endedAt ?? message.endedAt ?? new Date().toISOString(),
    startedAt: call.startedAt ?? message.startedAt ?? call.createdAt ?? null,
    cost: message.cost ?? call.cost,
  };
  if (typeof message.transcript === 'string' && !(merged.artifact as Json).transcript) (merged.artifact as Json).transcript = message.transcript;
  if (typeof message.summary === 'string' && !(merged.analysis as Json).summary) (merged.analysis as Json).summary = message.summary;
  if (typeof message.recordingUrl === 'string' && !(merged.artifact as Json).recordingUrl) (merged.artifact as Json).recordingUrl = message.recordingUrl;
  if (Array.isArray(message.messages) && !(merged.artifact as Json).messages) (merged.artifact as Json).messages = message.messages;
  if (typeof message.durationSeconds === 'number' && !merged.startedAt && merged.endedAt) {
    merged.startedAt = new Date(Date.parse(String(merged.endedAt)) - message.durationSeconds * 1000).toISOString();
  }
  try {
    const { data: known } = await sb.from('voice_agents').select('assistant_id,name,client_email,business,kind,hidden,last_seen_at');
    const agents: AgentMap = new Map();
    for (const a of (known ?? []) as VoiceAgentRow[]) agents.set(a.assistant_id, a);
    const shaped = shapeCall(merged);
    const who = attribute(shaped, agents);
    const { error } = await sb.from('voice_calls').upsert({ ...shaped, ...who, synced_at: new Date().toISOString() }, { onConflict: 'vapi_call_id' });
    if (error) {
      console.error('recordEndOfCall failed', error.message);
      return null;
    }
    return shaped.vapi_call_id;
  } catch (err) {
    console.error('recordEndOfCall threw', err);
    return null;
  }
}

/* ───────────────────────── reads ───────────────────────── */

export type ListResult = { ok: boolean; rows: VoiceCallRow[]; reason?: 'table-missing' | 'no-supabase' | 'error' };

function tableMissing(error: unknown): boolean {
  return /relation .* does not exist|42P01|schema cache/i.test(JSON.stringify(error));
}

const LIST_COLUMNS =
  'id,vapi_call_id,assistant_id,agent_name,client_email,kind,direction,call_type,phone_number_id,line_number,line_label,caller_number,caller_name,status,ended_reason,started_at,ended_at,duration_sec,summary,transcript,messages,recording_url,cost_cents,transferred,transferred_to,booked,metadata,synced_at';

export async function listVoiceCalls(opts: {
  clientEmail?: string | null;
  kind?: CallKind | null;
  assistantId?: string | null;
  includeProbes?: boolean;
  limit?: number;
} = {}): Promise<ListResult> {
  const sb = getSupabase();
  if (!sb) return { ok: false, rows: [], reason: 'no-supabase' };
  let q = sb.from('voice_calls').select(LIST_COLUMNS).order('started_at', { ascending: false }).limit(opts.limit ?? 500);
  if (opts.clientEmail) q = q.ilike('client_email', opts.clientEmail.trim());
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.assistantId) q = q.eq('assistant_id', opts.assistantId);
  if (!opts.includeProbes) q = q.neq('kind', 'probe');
  const { data, error } = await q;
  if (error) return { ok: false, rows: [], reason: tableMissing(error) ? 'table-missing' : 'error' };
  return { ok: true, rows: (data ?? []) as VoiceCallRow[] };
}

export async function listVoiceAgents(): Promise<VoiceAgentRow[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('voice_agents')
    .select('assistant_id,name,client_email,business,kind,hidden,last_seen_at')
    .order('name', { ascending: true });
  return ((data ?? []) as VoiceAgentRow[]).filter((a) => a.kind !== 'probe');
}

/**
 * Assign an agent to a client (or clear it). Re-attributes every call that
 * agent has taken, so the client's portal and the admin filter agree at once.
 */
export async function assignVoiceAgent(input: {
  assistantId: string;
  clientEmail: string | null;
  kind?: CallKind;
  business?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'Database not configured' };
  const clientEmail = input.clientEmail ? input.clientEmail.trim().toLowerCase() : null;
  const kind: CallKind = input.kind ?? (clientEmail ? 'client' : 'other');
  const now = new Date().toISOString();
  const { error } = await sb
    .from('voice_agents')
    .upsert({ assistant_id: input.assistantId, client_email: clientEmail, kind, business: input.business ?? null, updated_at: now }, { onConflict: 'assistant_id' });
  if (error) return { ok: false, error: error.message };
  // Demo calls keep their kind; only the owner changes on those.
  const { error: e1 } = await sb.from('voice_calls').update({ client_email: clientEmail, kind }).eq('assistant_id', input.assistantId).neq('kind', 'demo');
  const { error: e2 } = await sb.from('voice_calls').update({ client_email: clientEmail }).eq('assistant_id', input.assistantId).eq('kind', 'demo');
  if (e1 || e2) return { ok: false, error: (e1 ?? e2)?.message };
  return { ok: true };
}
