'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminHeader from './AdminHeader';
import CallDetail, { CallPills, cleanSummary, endedLabel, fmtDuration, fmtPhone, fmtWhen, whoLabel, type CallView } from '@/components/calls/CallDetail';

/**
 * THE CALL LOG.
 *
 * Every call every voice agent on the org has taken, newest first, with the
 * transcript one click away. Mr. Mustard on the studio lines, every built
 * demo, and every client's own agent, in one list, filterable by which.
 * Powered by /api/admin/calls, which pulls from Vapi on every load so this
 * page is never behind the phone.
 *
 * The Agents rail at the bottom is where an agent gets assigned to the client
 * who owns it. That one assignment is what puts the client's calls under their
 * name here and in their portal.
 */

type Row = {
  id: string;
  vapi_call_id: string;
  assistant_id: string | null;
  agent_name: string | null;
  client_email: string | null;
  kind: 'studio' | 'demo' | 'client' | 'partner' | 'probe' | 'other';
  direction: 'inbound' | 'outbound' | 'web';
  line_number: string | null;
  line_label: string | null;
  caller_number: string | null;
  caller_name: string | null;
  ended_reason: string | null;
  started_at: string | null;
  duration_sec: number | null;
  summary: string | null;
  transcript: string | null;
  messages: CallView['messages'];
  recording_url: string | null;
  cost_cents: number | null;
  transferred: boolean;
  transferred_to: string | null;
  booked: boolean;
  lead?: { id: string; name: string | null; email: string | null; company: string | null; audit_url: string | null } | null;
};

type Agent = { assistant_id: string; name: string | null; client_email: string | null; business: string | null; kind: Row['kind']; hidden: boolean; last_seen_at: string | null };
type ClientOpt = { email: string; label: string };
type ApiResult = {
  ok: boolean;
  rows: Row[];
  agents: Agent[];
  clients: ClientOpt[];
  reason?: string;
  sync?: { ok: boolean; pulled: number; written: number; reason?: string } | null;
  syncedAt?: string;
};

type Filter = 'all' | 'studio' | 'demo' | 'client' | 'partner' | 'other';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All calls' },
  { key: 'studio', label: 'Mr. Mustard' },
  { key: 'demo', label: 'Demos' },
  { key: 'client', label: 'Clients' },
  { key: 'partner', label: 'Partner lines' },
  { key: 'other', label: 'Unassigned agents' },
];

function toView(r: Row): CallView {
  return {
    id: r.vapi_call_id,
    agentName: r.agent_name,
    direction: r.direction,
    callerNumber: r.caller_number,
    callerName: r.caller_name,
    lineNumber: r.line_number,
    lineLabel: r.line_label,
    clientEmail: r.client_email,
    kind: r.kind,
    startedAt: r.started_at,
    durationSec: r.duration_sec,
    endedReason: r.ended_reason,
    summary: r.summary,
    transcript: r.transcript,
    messages: r.messages ?? [],
    recordingUrl: r.recording_url,
    transferred: r.transferred,
    transferredTo: r.transferred_to,
    booked: r.booked,
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border-2 border-[#161616] rounded-xl px-5 py-4 shadow-[3px_3px_0_0_#161616]">
      <div className="font-sans text-3xl font-bold text-[#161616] leading-none">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 font-sans font-semibold">{label}</div>
    </div>
  );
}

const KIND_LABEL: Record<Row['kind'], string> = {
  studio: 'Mr. Mustard',
  demo: 'Demo',
  client: 'Client',
  partner: 'Partner line',
  probe: 'Probe',
  other: 'Unassigned',
};

export default function CallsPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [client, setClient] = useState<string>(params.get('client') ?? '');
  const [openId, setOpenId] = useState<string | null>(params.get('call'));
  const [saving, setSaving] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async (sync: '1' | 'full' | '0' = '1') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/calls?sync=${sync}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiResult;
      setData(json);
    } catch {
      setData({ ok: false, rows: [], agents: [], clients: [], reason: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => data?.rows ?? [], [data]);
  const clientLabel = useCallback(
    (email: string | null) => {
      if (!email) return '';
      const c = data?.clients.find((x) => x.email.toLowerCase() === email.toLowerCase());
      return c?.label ?? email;
    },
    [data],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.kind !== filter) return false;
      if (client && (r.client_email ?? '').toLowerCase() !== client.toLowerCase()) return false;
      if (!needle) return true;
      return [r.caller_name, r.caller_number, r.agent_name, r.summary, r.transcript, r.client_email, r.line_number, clientLabel(r.client_email)]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [rows, filter, client, q, clientLabel]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400_000;
    const week = rows.filter((r) => r.started_at && Date.parse(r.started_at) >= weekAgo);
    const minutes = Math.round(week.reduce((s, r) => s + (r.duration_sec ?? 0), 0) / 60);
    return {
      week: week.length,
      minutes,
      handed: week.filter((r) => r.transferred).length,
      booked: week.filter((r) => r.booked).length,
    };
  }, [rows]);

  const open = useMemo(() => rows.find((r) => r.vapi_call_id === openId) ?? null, [rows, openId]);

  const setOpen = (id: string | null) => {
    setOpenId(id);
    const next = new URLSearchParams(params.toString());
    if (id) next.set('call', id);
    else next.delete('call');
    router.replace(`/admin/calls${next.toString() ? `?${next}` : ''}`, { scroll: false });
  };

  const assign = async (agent: Agent, clientEmail: string) => {
    setSaving(agent.assistant_id);
    setNote('');
    try {
      const res = await fetch('/api/admin/calls', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assistantId: agent.assistant_id, clientEmail: clientEmail || null, business: clientLabel(clientEmail) || null }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setNote(json.error || 'Could not save that assignment.');
        return;
      }
      setNote(clientEmail ? `${agent.name || 'Agent'} now belongs to ${clientLabel(clientEmail)}.` : `${agent.name || 'Agent'} is unassigned.`);
      await load('0');
    } finally {
      setSaving(null);
    }
  };

  const agents = useMemo(() => (data?.agents ?? []).filter((a) => !a.hidden), [data]);
  const syncLine = data?.sync
    ? data.sync.ok
      ? `Checked Vapi ${data.syncedAt ? fmtWhen(data.syncedAt) : 'just now'}. ${data.sync.pulled} ${data.sync.pulled === 1 ? 'call' : 'calls'} refreshed.`
      : data.sync.reason === 'no-vapi-key'
        ? 'Vapi key is not set in this environment, so this is the last stored log.'
        : 'Could not reach Vapi this time. Showing the last stored log.'
    : '';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="calls" title="Calls" onRefresh={() => load('1')} />

      <main className="max-w-7xl mx-auto px-5 md:px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-sans text-2xl font-bold tracking-tight">The call log</h2>
            <p className="mt-1 text-sm text-[#161616]/60 max-w-2xl">
              Every call a voice agent has taken, with the transcript and recording. Mr. Mustard, every demo, and every
              client agent, in one place.
            </p>
            {syncLine && <p className="mt-1 text-[11px] text-[#161616]/45 font-mono">{syncLine}</p>}
          </div>
          <button
            onClick={() => load('full')}
            className="bg-white border-2 border-[#161616] rounded-lg px-3 py-2 font-sans text-xs font-bold shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            Pull full history
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 max-w-3xl">
          <Stat label="Calls this week" value={stats.week} />
          <Stat label="Minutes on the line" value={stats.minutes} />
          <Stat label="Handed to a person" value={stats.handed} />
          <Stat label="Booked" value={stats.booked} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg border-2 border-[#161616] font-sans text-xs font-bold transition-transform hover:-translate-y-0.5 ${
                filter === f.key ? 'bg-[#F5B700] shadow-[2px_2px_0_0_#161616]' : 'bg-white'
              }`}
            >
              {f.label}
            </button>
          ))}
          {data?.clients && data.clients.length > 0 && (
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="px-3 py-1.5 rounded-lg border-2 border-[#161616] bg-white font-sans text-xs font-bold"
            >
              <option value="">Any client</option>
              {data.clients.map((c) => (
                <option key={c.email} value={c.email}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, number, agent, or anything that was said..."
            className="w-full max-w-xl bg-white border-2 border-[#161616] rounded-xl px-4 py-3 font-sans text-sm text-[#161616] placeholder:text-[#161616]/40 shadow-[3px_3px_0_0_#161616] focus:outline-none focus:-translate-y-0.5 transition-transform"
          />
        </div>

        {loading && !data && <p className="text-sm text-[#161616]/50 font-sans">Pulling the latest calls...</p>}

        {!loading && data && !data.ok && data.reason === 'table-missing' && (
          <div className="bg-white border-2 border-[#E0301E] rounded-xl p-6 shadow-[3px_3px_0_0_#161616] max-w-2xl">
            <h3 className="font-sans text-lg font-bold">The call log is not switched on yet</h3>
            <p className="mt-2 text-sm text-[#161616]/70">
              Run migration <code className="font-mono text-[#E0301E]">117_voice_calls.sql</code> once against the database. This page
              fills itself from Vapi the moment the table exists.
            </p>
          </div>
        )}

        {!loading && data?.ok && rows.length === 0 && (
          <div className="bg-white border-2 border-[#161616] rounded-xl p-6 shadow-[3px_3px_0_0_#161616] max-w-2xl">
            <h3 className="font-sans text-lg font-bold">No calls yet</h3>
            <p className="mt-2 text-sm text-[#161616]/70">The log fills in as the agents take calls.</p>
          </div>
        )}

        {data?.ok && rows.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-[#161616]/50 font-sans">No calls match.</p>
        )}

        {filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((r) => {
              const v = toView(r);
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setOpen(r.vapi_call_id)}
                    className="w-full text-left bg-white border-2 border-[#161616] rounded-xl px-5 py-4 shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3 className="font-sans text-lg font-bold leading-tight">{whoLabel(v)}</h3>
                          {r.caller_name && r.caller_number && <span className="font-mono text-xs text-[#161616]/60">{fmtPhone(r.caller_number)}</span>}
                        </div>
                        <p className="mt-0.5 text-sm text-[#161616]/65">
                          {fmtWhen(r.started_at)}
                          {r.duration_sec != null && <> &middot; {fmtDuration(r.duration_sec)}</>}
                          {r.agent_name && <> &middot; {r.agent_name}</>}
                          {r.client_email && <> &middot; {clientLabel(r.client_email)}</>}
                          {r.line_label && <> &middot; {r.line_label}</>}
                        </p>
                        {r.summary && <p className="mt-2 text-[13px] text-[#161616]/80 leading-relaxed line-clamp-2">{cleanSummary(r.summary)}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <CallPills c={v} />
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-[#161616]/45 font-sans font-semibold">
                          {KIND_LABEL[r.kind]}
                          {r.ended_reason && <> &middot; {endedLabel(r.ended_reason, r.transferred)}</>}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Agents: the assignment rail */}
        {data?.ok && agents.length > 0 && (
          <section className="mt-12">
            <h2 className="font-sans text-xl font-bold tracking-tight">Agents</h2>
            <p className="mt-1 text-sm text-[#161616]/60 max-w-2xl">
              Every assistant on the Vapi org. Assign an agent to the client who owns it and their calls show up under that client
              here and in their portal.
            </p>
            {note && <p className="mt-2 text-sm font-sans font-bold text-[#161616]">{note}</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {agents.map((a) => (
                <div key={a.assistant_id} className="bg-white border-2 border-[#161616] rounded-xl px-4 py-3 shadow-[3px_3px_0_0_#161616] flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-sans font-bold truncate">{a.name || a.assistant_id}</div>
                    <div className="text-[11px] text-[#161616]/55 font-sans">
                      {KIND_LABEL[a.kind]}
                      {a.client_email && <> &middot; {clientLabel(a.client_email)}</>}
                    </div>
                  </div>
                  {a.kind !== 'studio' && (
                    <select
                      value={a.client_email ?? ''}
                      disabled={saving === a.assistant_id}
                      onChange={(e) => assign(a, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border-2 border-[#161616] bg-white font-sans text-xs font-bold max-w-[220px]"
                    >
                      <option value="">Not a client&apos;s</option>
                      {(data?.clients ?? []).map((c) => (
                        <option key={c.email} value={c.email}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {open && (
        <CallDetail
          call={toView(open)}
          onClose={() => setOpen(null)}
          extra={
            <div className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-[#161616]/70">
              <span>{KIND_LABEL[open.kind]}</span>
              {open.client_email && <span>{clientLabel(open.client_email)}</span>}
              {open.cost_cents != null && <span>${(open.cost_cents / 100).toFixed(2)}</span>}
              {open.lead?.email && <span>Lead: {open.lead.company || open.lead.name || open.lead.email}</span>}
              {open.lead?.audit_url && (
                <a href={open.lead.audit_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-[#1E50C8]">
                  Audit report
                </a>
              )}
              <a
                href={`https://dashboard.vapi.ai/calls/${open.vapi_call_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Open in Vapi
              </a>
            </div>
          }
        />
      )}
    </div>
  );
}
