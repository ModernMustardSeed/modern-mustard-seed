'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Chip, api, card, cardFlat, btnGhost, timeAgo } from '@/components/admin/acquisition/ui';
import { usePoll } from '@/lib/use-poll';
import RowBuild from '@/components/admin/acquisition/RowBuild';
import type { RowSuite } from '@/components/admin/acquisition/RowBuild';

/**
 * WHO IS MOVING.
 *
 * Every other screen in the machine is about what we did: sent, built,
 * queued. This one is only about what THEY did, by name. Who opened, who
 * clicked, who landed on the permission page, who typed their number in, who
 * is on the phone with Mr. Mustard, who picked up the phone and called him.
 *
 * Reads: a row is a business, the columns are the steps of the journey, and a
 * filled cell means they took that step. Sorted by whoever moved most
 * recently, so the top of the table is always the warmest person right now.
 */

type Step = 'opened' | 'clicked' | 'visited' | 'replied' | 'consented' | 'called' | 'talked' | 'bought';
type Signal = { n: number; last: string | null; first: string | null };
type Person = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string;
  city: string | null;
  state: string | null;
  trade: string | null;
  lead_score: number | null;
  acq_stage: string;
  email_stage: number;
  needs_human: string | null;
  is_test: boolean;
  unsubscribed_at: string | null;
  client_status: string | null;
  checkout_sent_at: string | null;
  demo_status: string | null;
  demo_emailed_at: string | null;
  suite: RowSuite | null;
  furthest: Step;
  last_activity: string;
  signals: Record<Step, Signal>;
  consent: { at: string; phone_as_typed: string; typed_name: string | null; revoked_at: string | null } | null;
  call: {
    id: string;
    status: string;
    requested_at: string;
    duration_sec: number | null;
    outcome: string | null;
    summary: string | null;
    ended_reason: string | null;
    inbound: boolean;
  } | null;
};
type FeedRow = {
  id: string;
  lead_id: string | null;
  type: string;
  label: string;
  occurred_at: string;
  business_name: string | null;
  contact_name: string | null;
  city: string | null;
  state: string | null;
};
type Payload = {
  window: string;
  since: string | null;
  steps: Step[];
  totals: Record<Step, number>;
  moving: number;
  people: Person[];
  feed: FeedRow[];
};

const STEP_LABEL: Record<Step, string> = {
  opened: 'Opened',
  clicked: 'Clicked',
  visited: 'On the page',
  replied: 'Replied',
  consented: 'Gave permission',
  called: 'Call placed',
  talked: 'Talked',
  bought: 'Bought',
};
const STEP_NOTE: Record<Step, string> = {
  opened: 'Opened one of our emails.',
  visited: 'Landed on the Mr. Mustard permission page.',
  clicked: 'Clicked the Mr. Mustard button in an email.',
  replied: 'Wrote back to a campaign email.',
  consented: 'Typed their number in and agreed to the call.',
  called: 'A Mr. Mustard call was placed, or they rang his line themselves.',
  talked: 'A demo call connected and ran.',
  bought: 'Booked a meeting or paid.',
};
const STEP_TONE: Record<Step, 'neutral' | 'warn' | 'good' | 'hot'> = {
  opened: 'neutral',
  clicked: 'warn',
  visited: 'warn',
  replied: 'good',
  consented: 'good',
  called: 'good',
  talked: 'hot',
  bought: 'hot',
};
const WINDOWS: { key: string; label: string }[] = [
  { key: '1d', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function Engagement() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [window_, setWindow] = useState('7d');
  const [step, setStep] = useState<Step | 'all' | 'needs'>('all');
  const [q, setQ] = useState('');
  const [includeTest, setIncludeTest] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const load = useCallback(
    async (background = false) => {
      try {
        const next = await api<Payload>(`/api/admin/acquisition/engagement?window=${window_}${includeTest ? '&test=1' : ''}`);
        setData(next);
        setError('');
      } catch (e) {
        if (!background) setError(e instanceof Error ? e.message : 'Could not load who is moving.');
      }
    },
    [window_, includeTest],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Live while the panel is on screen, silent while the tab is in the background.
  usePoll(() => void load(true), 30000);

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.people.filter((p) => {
      if (step === 'needs' && !p.needs_human) return false;
      if (step !== 'all' && step !== 'needs' && p.signals[step].n === 0) return false;
      if (!needle) return true;
      return [p.business_name, p.contact_name, p.email, p.phone, p.city, p.state, p.trade].some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [data, step, q]);

  const steps: Step[] = data?.steps ?? ['opened', 'clicked', 'visited', 'replied', 'consented', 'called', 'talked', 'bought'];
  const needsCount = data ? data.people.filter((p) => p.needs_human).length : 0;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[110rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="engagement"
          badge={{ engagement: needsCount }}
          right={
            <div className="flex items-center gap-1 rounded-xl border-2 border-[#161616] bg-white p-1">
              {WINDOWS.map((w) => (
                <button
                  key={w.key}
                  onClick={() => setWindow(w.key)}
                  className={`px-3 py-1.5 rounded-lg font-oswald text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                    window_ === w.key ? 'bg-[#161616] text-[#FBF6EA]' : 'text-[#161616]/70 hover:text-[#161616]'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          }
        />

        {error && <p className="mb-4 rounded-xl border-2 border-[#E0301E] bg-white px-4 py-3 text-sm font-semibold text-[#E0301E]">{error}</p>}

        {/* the funnel by name: one tile per step, click to filter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-9 gap-3 mb-6">
          <button
            onClick={() => setStep('all')}
            className={`${cardFlat} p-4 text-left transition-all ${step === 'all' ? 'shadow-[4px_4px_0_0_#F5B700] -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
          >
            <p className="text-[9px] uppercase tracking-[0.2em] font-oswald font-semibold text-[#161616]/60">Moving</p>
            <p className="mt-1 font-oswald text-3xl font-bold tabular-nums leading-none">{data?.moving ?? '—'}</p>
            <p className="mt-1 text-[11px] text-[#161616]/65 leading-snug">people did something</p>
          </button>
          {steps.map((s) => (
            <button
              key={s}
              onClick={() => setStep(step === s ? 'all' : s)}
              title={STEP_NOTE[s]}
              className={`${cardFlat} p-4 text-left transition-all ${step === s ? 'shadow-[4px_4px_0_0_#F5B700] -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
            >
              <p className="text-[9px] uppercase tracking-[0.2em] font-oswald font-semibold text-[#161616]/60">{STEP_LABEL[s]}</p>
              <p className={`mt-1 font-oswald text-3xl font-bold tabular-nums leading-none ${s === 'talked' || s === 'bought' ? 'text-[#E0301E]' : s === 'consented' || s === 'called' ? 'text-[#3f5d34]' : ''}`}>
                {data ? data.totals[s] : '—'}
              </p>
              <p className="mt-1 text-[11px] text-[#161616]/65 leading-snug truncate">{STEP_NOTE[s]}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
          <Section
            title={step === 'all' ? 'Everyone who moved' : step === 'needs' ? 'Needs you' : `${STEP_LABEL[step]}: ${rows.length}`}
            note="Newest movement first. Click a business to open its full record. Opens are a strong signal, not proof: Apple Mail can register one on the recipient's behalf."
            right={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Find a business, person, city, number"
                  className="w-64 bg-white border-2 border-[#161616]/25 focus:border-[#F5B700] rounded-xl px-3 py-2 text-sm outline-none placeholder:text-[#161616]/50"
                />
                <button onClick={() => setStep(step === 'needs' ? 'all' : 'needs')} className={`${btnGhost} !py-2 ${step === 'needs' ? '!bg-[#E0301E] !text-white !border-[#E0301E]' : ''}`}>
                  Needs you {needsCount > 0 && <span className="tabular-nums">{needsCount}</span>}
                </button>
                <label className="flex items-center gap-1.5 text-[11px] text-[#161616]/70 select-none">
                  <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
                  Show test rows
                </label>
              </div>
            }
          >
            {!data && !error && <p className="text-sm text-[#161616]/65">Loading...</p>}
            {data && rows.length === 0 && (
              <p className="text-sm text-[#161616]/65">
                {data.people.length === 0
                  ? 'Nobody has moved in this window yet. Widen the window, or check the Campaign screen to confirm mail is going out.'
                  : 'Nobody matches that filter.'}
              </p>
            )}
            {rows.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#161616]">
                      <Th>Who</Th>
                      <Th>Furthest step</Th>
                      <Th>Opened</Th>
                      <Th>Clicked</Th>
                      <Th>On the page</Th>
                      <Th>Permission</Th>
                      <Th>Call</Th>
                      <Th>Their suite</Th>
                      <Th className="text-right">Last moved</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => {
                      const expanded = openRow === p.id;
                      return (
                        <Fragment key={p.id}>
                          <tr
                            className={`border-b border-[#161616]/10 hover:bg-[#F5B700]/[0.08] cursor-pointer ${p.needs_human ? 'bg-[#E0301E]/[0.04]' : ''}`}
                            onClick={() => setOpenRow(expanded ? null : p.id)}
                          >
                            <Td>
                              <div className="flex items-start gap-2 min-w-[14rem]">
                                <div className="min-w-0">
                                  <Link
                                    href={`/admin/acquisition/prospects/${p.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-semibold text-[#161616] hover:underline"
                                  >
                                    {p.business_name}
                                  </Link>
                                  <div className="text-[11px] text-[#161616]/70 truncate">
                                    {p.contact_name ? `${p.contact_name} · ` : ''}
                                    {p.city ? `${p.city}${p.state ? `, ${p.state}` : ''}` : p.state ?? ''}
                                    {p.trade ? ` · ${p.trade.replace(/_/g, ' ')}` : ''}
                                  </div>
                                  <div className="text-[11px] text-[#161616]/70 truncate">
                                    {p.email ?? 'no email'}
                                    {p.phone ? ` · ${p.phone}` : ''}
                                  </div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {p.needs_human && <Chip label="NEEDS YOU" tone="hot" title={p.needs_human} />}
                                    {p.is_test && <Chip label="TEST" tone="warn" />}
                                    {p.client_status === 'client' && <Chip label="CLIENT" tone="good" />}
                                    {p.checkout_sent_at && <Chip label="checkout sent" tone="warn" />}
                                    {p.unsubscribed_at && <Chip label="opted out" tone="bad" />}
                                  </div>
                                </div>
                              </div>
                            </Td>
                            <Td>
                              <Chip label={STEP_LABEL[p.furthest]} tone={STEP_TONE[p.furthest]} />
                            </Td>
                            <Td>
                              <Cell sig={p.signals.opened} unit="open" />
                            </Td>
                            <Td>
                              <Cell sig={p.signals.clicked} unit="click" />
                            </Td>
                            <Td>
                              <Cell sig={p.signals.visited} unit="visit" />
                            </Td>
                            <Td>
                              {p.consent ? (
                                <div className="text-[12px] leading-snug">
                                  <div className={`font-semibold ${p.consent.revoked_at ? 'line-through text-[#161616]/60' : 'text-[#3f5d34]'}`}>
                                    {p.consent.revoked_at ? 'Revoked' : 'Yes'}
                                  </div>
                                  <div className="font-mono text-[11px] text-[#161616]/70">{p.consent.phone_as_typed}</div>
                                  {p.consent.typed_name && <div className="text-[11px] text-[#161616]/70">signed {p.consent.typed_name}</div>}
                                  <div className="text-[11px] text-[#161616]/65">{when(p.consent.at)}</div>
                                </div>
                              ) : p.signals.consented.n > 0 ? (
                                <Cell sig={p.signals.consented} unit="consent" />
                              ) : (
                                <Dash />
                              )}
                            </Td>
                            <Td>
                              {p.call ? (
                                <div className="text-[12px] leading-snug min-w-[9rem]">
                                  <div className="flex items-center gap-1.5">
                                    <Chip
                                      label={p.call.inbound && p.call.status === 'inbound' ? 'they called us' : p.call.status.replace(/_/g, ' ')}
                                      tone={p.call.status === 'completed' || p.call.inbound ? 'good' : p.call.status === 'failed' || p.call.status === 'no_answer' ? 'bad' : 'warn'}
                                    />
                                    {p.call.inbound && p.call.status !== 'inbound' && <Chip label="rang us too" tone="good" />}
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-[#161616]/70">
                                    {when(p.call.requested_at)}
                                    {p.call.duration_sec ? ` · ${Math.round(p.call.duration_sec / 60)}m ${p.call.duration_sec % 60}s` : ''}
                                    {p.call.outcome ? ` · ${p.call.outcome.replace(/_/g, ' ')}` : ''}
                                  </div>
                                </div>
                              ) : (
                                <Dash />
                              )}
                            </Td>
                            <Td>
                              <RowBuild
                                id={p.id}
                                business={p.business_name}
                                email={p.email}
                                suite={p.suite}
                                demoEmailedAt={p.demo_emailed_at}
                                onDone={() => void load()}
                              />
                            </Td>
                            <Td className="text-right whitespace-nowrap">
                              <div className="font-mono text-[11px] text-[#161616]/70">{timeAgo(p.last_activity)}</div>
                              <div className="text-[10px] text-[#161616]/60">{when(p.last_activity)}</div>
                            </Td>
                          </tr>
                          {expanded && (
                            <tr className="border-b border-[#161616]/10 bg-[#FFFDF8]">
                              <td colSpan={9} className="px-3 py-3">
                                <Detail p={p} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="As it happens" note="Every move, newest first, with the name attached. Refreshes on its own.">
            <ol className="space-y-2 max-h-[48rem] overflow-y-auto pr-1">
              {data && data.feed.length === 0 && <li className="text-sm text-[#161616]/65">Quiet so far.</li>}
              {(data?.feed ?? []).map((e) => (
                <li key={e.id} className="rounded-lg border-2 border-[#161616]/12 px-3 py-2 leading-snug">
                  <div className="flex items-baseline justify-between gap-2">
                    {e.lead_id ? (
                      <Link href={`/admin/acquisition/prospects/${e.lead_id}`} className="font-semibold text-sm text-[#161616] hover:underline truncate">
                        {e.business_name ?? 'Unknown business'}
                      </Link>
                    ) : (
                      <span className="font-semibold text-sm truncate">{e.business_name ?? 'Unknown business'}</span>
                    )}
                    <span className="font-mono text-[10px] text-[#161616]/65 tabular-nums shrink-0">{timeAgo(e.occurred_at)}</span>
                  </div>
                  <div className="text-[12px] text-[#161616]/80">
                    <FeedIcon type={e.type} /> {e.label}
                  </div>
                  {(e.contact_name || e.city) && (
                    <div className="text-[11px] text-[#161616]/65">
                      {e.contact_name ?? ''}
                      {e.contact_name && e.city ? ' · ' : ''}
                      {e.city ? `${e.city}${e.state ? `, ${e.state}` : ''}` : ''}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Detail({ p }: { p: Person }) {
  const steps: Step[] = ['opened', 'clicked', 'visited', 'replied', 'consented', 'called', 'talked', 'bought'];
  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] font-oswald font-semibold text-[#161616]/65 mb-2">Their steps, in order</p>
        <ol className="space-y-1">
          {steps
            .filter((s) => p.signals[s].n > 0)
            .map((s) => (
              <li key={s} className="flex items-center gap-2 text-[12px]">
                <Chip label={STEP_LABEL[s]} tone={STEP_TONE[s]} />
                <span className="text-[#161616]/80">
                  {p.signals[s].n > 1 ? `${p.signals[s].n} times, ` : ''}
                  first {when(p.signals[s].first)}
                  {p.signals[s].n > 1 ? `, last ${when(p.signals[s].last)}` : ''}
                </span>
              </li>
            ))}
        </ol>
        {p.needs_human && (
          <p className="mt-3 rounded-lg border-2 border-[#E0301E] bg-white px-3 py-2 text-[12px] font-semibold text-[#E0301E]">Needs you: {p.needs_human}</p>
        )}
      </div>
      <div>
        {p.call?.summary ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.2em] font-oswald font-semibold text-[#161616]/65 mb-2">How the call went</p>
            <p className="text-[12px] leading-relaxed text-[#161616]/85 whitespace-pre-line">{p.call.summary}</p>
          </>
        ) : (
          <p className="text-[12px] text-[#161616]/65">No call summary yet.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/admin/acquisition/prospects/${p.id}`} className={`${btnGhost} !py-1.5 !px-3 !text-[11px]`}>
            Open the full record
          </Link>
          {p.email && (
            <a href={`mailto:${p.email}`} className={`${btnGhost} !py-1.5 !px-3 !text-[11px]`}>
              Email {p.contact_name?.split(/\s+/)[0] ?? 'them'}
            </a>
          )}
          {p.phone && (
            <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`} className={`${btnGhost} !py-1.5 !px-3 !text-[11px]`}>
              Call {p.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Cell({ sig, unit }: { sig: Signal; unit: string }) {
  if (!sig.n) return <Dash />;
  return (
    <div className="text-[12px] leading-snug whitespace-nowrap">
      <div className="font-semibold">
        {sig.n} {unit}
        {sig.n === 1 ? '' : 's'}
      </div>
      <div className="text-[11px] text-[#161616]/70">{when(sig.last)}</div>
    </div>
  );
}

function Dash() {
  return <span className="text-[#161616]/40">—</span>;
}

function FeedIcon({ type }: { type: string }) {
  const map: Record<string, string> = {
    email_opened: '👀',
    link_clicked: '👆',
    permission_visited: '🚪',
    consent_captured: '✅',
    consent_revoked: '🚫',
    call_queued: '📞',
    call_started: '📞',
    call_completed: '🗣️',
    call_failed: '📵',
    call_inbound: '☎️',
    reply: '✉️',
    meeting_booked: '📅',
    purchased: '💰',
    unsubscribed: '🚫',
  };
  return <span aria-hidden="true">{map[type] ?? '•'}</span>;
}

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2.5 text-left text-[10px] uppercase tracking-[0.16em] font-oswald font-semibold text-[#161616]/65 ${className}`}>{children}</th>;
}
function Td({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-top ${className}`}>{children}</td>;
}
