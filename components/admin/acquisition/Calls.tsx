'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, api, card, cardFlat, timeAgo } from '@/components/admin/acquisition/ui';
import { usePoll } from '@/lib/use-poll';

type Call = {
  id: string;
  status: string;
  attempt: number;
  to_phone: string;
  requested_at: string;
  duration_sec: number | null;
  ended_reason: string | null;
  roleplay_scenario: string | null;
  summary: string | null;
  transcript: string | null;
  intel: Record<string, unknown> | null;
  lead: { id: string; business_name: string; city: string | null; state: string | null; trade: string | null; lead_score: number | null; demo_status: string | null; checkout_sent_at: string | null; client_status: string | null; needs_human: string | null } | null;
};

export default function Calls() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, averageSeconds: 0, failed: 0 });
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api<{ calls: Call[]; summary: typeof summary }>(`/api/admin/acquisition/calls${status ? `?status=${status}` : ''}`);
      setCalls(res.calls);
      setSummary(res.summary);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the calls.');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live while the panel is on screen, silent while the tab is in the background.
  usePoll(() => void load(), 30000);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="calls"
          right={
            <select
              className="rounded-xl border-2 border-[#161616] bg-white px-3 py-2 text-xs font-semibold"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Every call</option>
              <option value="completed">Completed</option>
              <option value="ringing">Ringing</option>
              <option value="no_answer">No answer</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
          }
        />
        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}

        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <Stat label="Calls" value={summary.total} />
          <Stat label="Conversations" value={summary.completed} tone="seed" big />
          <Stat
            label="Average length"
            value={summary.averageSeconds ? `${Math.floor(summary.averageSeconds / 60)}m ${summary.averageSeconds % 60}s` : '—'}
            sub="Target is three to seven minutes"
          />
          <Stat label="Did not connect" value={summary.failed} tone={summary.failed > 0 ? 'red' : 'ink'} />
        </div>

        <Section title="Mr. Mustard on the phones" note="Every acquisition call, newest first. Open one to read the transcript.">
          {calls.length === 0 ? (
            <p className="text-sm text-[#161616]/60">
              No calls yet. They start when a prospect clicks the button in the email and gives consent.
            </p>
          ) : (
            <ul className="space-y-2">
              {calls.map((c) => (
                <li key={c.id} className={`${cardFlat} p-4`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip
                      label={c.status.replace(/_/g, ' ')}
                      tone={c.status === 'completed' ? 'good' : c.status === 'failed' || c.status === 'no_answer' ? 'bad' : 'warn'}
                    />
                    {c.lead ? (
                      <Link href={`/admin/acquisition/prospects/${c.lead.id}`} className="font-semibold hover:underline">
                        {c.lead.business_name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[#161616]/65">Unknown prospect</span>
                    )}
                    {c.lead?.trade && <Chip label={c.lead.trade} />}
                    {c.lead?.city && (
                      <span className="text-[12px] text-[#161616]/65">
                        {c.lead.city}
                        {c.lead.state ? `, ${c.lead.state}` : ''}
                      </span>
                    )}
                    {c.duration_sec ? <Chip label={`${Math.floor(c.duration_sec / 60)}m ${c.duration_sec % 60}s`} /> : null}
                    {c.attempt > 1 && <Chip label={`attempt ${c.attempt}`} tone="warn" />}
                    {c.lead?.needs_human && <Chip label="NEEDS YOU" tone="hot" />}
                    {c.lead?.demo_status === 'ready' && <Chip label="forged" tone="good" />}
                    {c.lead?.client_status === 'client' && <Chip label="CLIENT" tone="good" />}
                    <span className="ml-auto text-[11px] font-mono text-[#161616]/60">{timeAgo(c.requested_at)}</span>
                  </div>

                  {c.roleplay_scenario && (
                    <p className="mt-2 text-[12px] text-[#161616]/60">
                      Roleplay: <span className="font-semibold">{c.roleplay_scenario}</span>
                    </p>
                  )}
                  {c.summary && <p className="mt-2 text-[13px] leading-relaxed text-[#161616]/80">{c.summary}</p>}
                  {c.ended_reason && !c.summary && (
                    <p className="mt-2 text-[12px] font-mono text-[#161616]/60">Ended: {c.ended_reason}</p>
                  )}

                  {c.transcript && (
                    <>
                      <button className="mt-2 text-xs underline font-semibold" onClick={() => setOpen(open === c.id ? null : c.id)}>
                        {open === c.id ? 'Hide transcript' : 'Read the transcript'}
                      </button>
                      {open === c.id && (
                        <pre className={`${card} mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap text-[12px] leading-relaxed p-3`}>
                          {c.transcript}
                        </pre>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>
    </div>
  );
}
