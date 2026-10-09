'use client';

import { useEffect, useState } from 'react';
import { BOOTCAMP, fmtMountain, fmtMountainTime } from '@/data/bootcamp';
import { card, emptyBox, errorBox, muted, usdFromCents, type StatsPayload } from './shared';

const MOMENT_LABEL: Record<string, string> = {
  masterclass: 'The free masterclass',
  kickoff: 'The kickoff call',
  day1: 'Day 1: inside the company',
  day2: 'Day 2: your trade, your business',
  day3: 'Day 3: hire your first two agents',
  close: 'Enrollment closes',
  operatorStart: 'The Operator Program starts',
  operatorEnd: 'The Operator Program ends',
  deliverables: 'Deck, Kit and Playbook open in the rooms',
};

function countdown(ms: number): { d: number; h: number; m: number; s: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

function useNow(tick = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), tick);
    return () => window.clearInterval(t);
  }, [tick]);
  return now;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{label}</p>
      <p className="font-display text-3xl font-semibold mt-1 text-[#161616]">{value}</p>
      {sub && <p className="font-body text-xs text-[#3A3733] mt-1">{sub}</p>}
    </div>
  );
}

export default function DeskTab({ stats, error, loading }: { stats: StatsPayload | null; error: string; loading: boolean }) {
  const now = useNow();

  if (error) return <div className={errorBox}>{error}</div>;
  if (!stats) return <div className={emptyBox}>{loading ? 'Loading the numbers.' : 'No numbers yet. Refresh to load them.'}</div>;

  const c = stats.counts;
  const r = stats.revenueCents || {};
  const ticketRevenue = (r.ga || 0) + (r.vip || 0) + (r.platinum || 0);
  const totalRevenue = ticketRevenue + (r.operator || 0);
  const tickets = c.ga + c.vip + c.platinum;
  const o = stats.outreach;
  const by = o?.byStatus || {};
  const sent = (by.sent || 0) + (by.replied || 0) + (by.hosting || 0) + (by.done || 0);
  const next = stats.next;
  const left = next ? countdown(new Date(next.at).getTime() - now) : null;

  return (
    <div className="space-y-6">
      {/* The next moment */}
      <section className={`${card} p-5 md:p-6 bg-[#161616] text-[#FBF6EA] border-[#161616]`}>
        {next && left ? (
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#F5B700]">Next on the calendar</p>
              <h2 className="font-display text-2xl md:text-3xl font-semibold mt-1 text-[#FBF6EA]">{MOMENT_LABEL[next.key] || next.key}</h2>
              <p className="font-body text-sm text-[#FBF6EA]/80 mt-1">
                {fmtMountain(next.at, { year: 'numeric' })} at {fmtMountainTime(next.at)} {BOOTCAMP.tzLabel}
              </p>
            </div>
            <div className="flex gap-3 md:gap-4" aria-live="polite">
              {[
                ['days', left.d],
                ['hrs', left.h],
                ['min', left.m],
                ['sec', left.s],
              ].map(([k, v]) => (
                <div key={k as string} className="text-center min-w-[56px]">
                  <p className="font-display text-3xl md:text-4xl font-semibold tabular-nums text-[#F5B700]">{String(v).padStart(2, '0')}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#FBF6EA]/70">{k as string}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#F5B700]">Calendar</p>
            <h2 className="font-display text-2xl font-semibold mt-1 text-[#FBF6EA]">Every dated moment on this launch has passed.</h2>
            <p className="font-body text-sm text-[#FBF6EA]/80 mt-1">Set the next launch in data/bootcamp.ts and the countdown comes back.</p>
          </div>
        )}
      </section>

      {/* Today */}
      <section className="grid sm:grid-cols-3 gap-3">
        <Stat label="Outreach sent today" value={`${o?.todaySent ?? 0} / ${o?.state?.dailyCap ?? 0}`} sub={o?.state?.armed ? 'Armed. Weekday mornings, Mountain.' : 'Off. Nothing sends until you arm it.'} />
        <Stat label="Hosts awaiting approval" value={String(stats.hosts.applied)} sub={stats.hosts.applied ? 'Approve on the Hosts tab.' : 'Nobody waiting.'} />
        <Stat label="Registrations, last 24 hours" value={String(stats.last24h)} sub={stats.last24h ? 'Across every tier.' : 'Quiet day so far.'} />
      </section>

      {/* Seats and money */}
      <section>
        <h2 className="font-display text-xl font-semibold text-[#161616] mb-3">Seats and revenue</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Stat label="Masterclass seats" value={c.masterclass.toLocaleString('en-US')} sub="Free registrations for January 26" />
          <Stat label="General Admission" value={c.ga.toLocaleString('en-US')} sub={`${usdFromCents(r.ga || 0)} at $97`} />
          <Stat label="VIP" value={c.vip.toLocaleString('en-US')} sub={`${usdFromCents(r.vip || 0)} at $297`} />
          <Stat label="Platinum" value={c.platinum.toLocaleString('en-US')} sub={`${usdFromCents(r.platinum || 0)} at $497`} />
          <Stat label="Operator seats" value={`${c.operator.toLocaleString('en-US')} / 250`} sub={`${usdFromCents(r.operator || 0)} at $4,997`} />
          <Stat label="Revenue, this launch" value={usdFromCents(totalRevenue)} sub={`${tickets.toLocaleString('en-US')} tickets, ${usdFromCents(ticketRevenue)} in tickets`} />
        </div>
      </section>

      {/* Hosts and outreach */}
      <section className="grid lg:grid-cols-2 gap-3">
        <div className={`${card} p-5`}>
          <h2 className="font-display text-xl font-semibold text-[#161616]">Hosts</h2>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Applied', stats.hosts.applied],
              ['Approved', stats.hosts.approved],
              ['Live', stats.hosts.live],
              ['Paused', stats.hosts.paused],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{k as string}</dt>
                <dd className="font-display text-2xl font-semibold text-[#161616]">{v as number}</dd>
              </div>
            ))}
          </dl>
          <p className={`${muted} mt-3`}>Founding hosts are the first 25 approved. {stats.hosts.declined ? `${stats.hosts.declined} declined.` : ''}</p>
        </div>
        <div className={`${card} p-5`}>
          <h2 className="font-display text-xl font-semibold text-[#161616]">Outreach</h2>
          <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Queued', by.queued || 0],
              ['Sent', sent],
              ['Replied', (by.replied || 0) + (by.hosting || 0)],
              ['Hosting', by.hosting || 0],
            ].map(([k, v]) => (
              <div key={k as string}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{k as string}</dt>
                <dd className="font-display text-2xl font-semibold text-[#161616]">{v as number}</dd>
              </div>
            ))}
          </dl>
          <p className={`${muted} mt-3`}>
            {by.hand ? `${by.hand} by hand (a form or a DM): copy the message from the Outreach tab. ` : ''}
            {by.bounced ? `${by.bounced} bounced.` : ''}
            {!by.hand && !by.bounced ? 'Three steps, then done. A reply stops the sequence.' : ''}
          </p>
        </div>
      </section>
    </div>
  );
}
