'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import SmsThread from '@/components/admin/SmsThread';

/**
 * THE TEXT DESK.
 *
 * Every conversation on every number we own, unanswered first. This is the page
 * the `texting` nav key has pointed at nothing since the SMS stack was retired
 * on 2026-08-01, and it stayed empty for a reason worth stating: there was no
 * inbound webhook, so there were no conversations to list. Replies went to a
 * personal handset and stopped there.
 *
 * Now they arrive. The list is the proof.
 */

type Thread = {
  phone: string;
  display: string;
  last: string;
  lastAt: string;
  lastDirection: 'inbound' | 'outbound';
  unread: number;
  outboundLeadId: string | null;
  prospectId: string | null;
  businessName: string | null;
  failed: boolean;
};

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function TextingPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sms/inbox${unreadOnly ? '?unread=1' : ''}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load the text desk.');
      setThreads(json.threads as Thread[]);
      setSelected((cur) => cur ?? (json.threads as Thread[])[0]?.phone ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="texting" title="Texting" onRefresh={() => void load()} />

      <main className="mx-auto max-w-[100rem] px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[46rem] text-[13px] leading-relaxed text-[#161616]/65">
            Every text conversation on a number we own. Somebody waiting on an answer sorts to the top. A reply lands here
            the second it arrives, which is new: before the inbound webhook, replies went to a handset and never reached
            this building.
          </p>
          <label className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.12em] text-[#161616]/60">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#F5B700]"
            />
            Unanswered only
          </label>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border-2 border-[#E0301E]/45 bg-[#E0301E]/[0.07] px-3 py-2 text-[12px] text-[#a32315]">{error}</p>
        )}

        <div className="grid gap-5 lg:grid-cols-12 items-start">
          <section className="lg:col-span-4">
            <div className="rounded-xl border-2 border-[#161616]/15 bg-white">
              {loading && threads.length === 0 && (
                <p className="px-4 py-6 text-[13px] text-[#161616]/55">Loading.</p>
              )}
              {!loading && threads.length === 0 && (
                <p className="px-4 py-6 text-[13px] leading-relaxed text-[#161616]/55">
                  No text conversations yet. Once a number is pointed at the webhook, the first reply shows up here without
                  anybody doing anything.
                </p>
              )}
              <ul className="divide-y-2 divide-[#161616]/10">
                {threads.map((t) => {
                  const active = t.phone === selected;
                  return (
                    <li key={t.phone}>
                      <button
                        type="button"
                        onClick={() => setSelected(t.phone)}
                        className={`w-full px-4 py-3 text-left transition ${active ? 'bg-[#F5B700]/25' : 'hover:bg-[#161616]/[0.04]'}`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-[#161616]">
                            {t.businessName || t.display}
                          </span>
                          <span className="shrink-0 text-[10px] font-mono uppercase tracking-[0.1em] text-[#161616]/45">
                            {ago(t.lastAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[#161616]/60">
                          {t.lastDirection === 'outbound' ? 'You: ' : ''}
                          {t.last}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {t.unread > 0 && (
                            <span className="inline-flex items-center rounded-md border border-[#F5B700] bg-[#F5B700]/25 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-[#7a5c00]">
                              {t.unread} waiting
                            </span>
                          )}
                          {t.failed && (
                            <span className="inline-flex items-center rounded-md border border-[#E0301E]/45 bg-[#E0301E]/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide text-[#a32315]">
                              did not land
                            </span>
                          )}
                          {t.businessName && (
                            <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#161616]/40">{t.display}</span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section className="lg:col-span-8">
            {selected ? (
              <SmsThread phone={selected} title="Conversation" />
            ) : (
              <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-6">
                <p className="text-[13px] text-[#161616]/55">Pick a conversation.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
