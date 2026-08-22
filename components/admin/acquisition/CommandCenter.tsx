'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { AcqNav, Section, Stat, Chip, GoalDial, Funnel, api, card, btnPrimary, btnGhost, btnDanger, usd, pct, timeAgo } from '@/components/admin/acquisition/ui';
import { usePoll } from '@/lib/use-poll';

type Preflight = {
  blockers: { id: string; label: string; detail: string; fix: string }[];
  warnings: { id: string; label: string; detail: string; fix: string }[];
  checks: { id: string; level: string; label: string; detail: string; fix: string }[];
  canSendEmail: boolean;
  canPlaceCalls: boolean;
};
type QueueRow = { id: string; business_name: string; contact_name: string | null; city: string | null; state: string | null; trade: string | null; lead_score: number | null; reason: string; at: string | null; href: string };
type Overview = {
  campaign: { id: string; name: string; status: string; goal_clients: number; daily_send_cap: number; hourly_send_cap: number } | null;
  settings: { master_paused: boolean; paused_reason: string | null; email_enabled: boolean; calls_enabled: boolean; followups_enabled: boolean; sourcing_enabled: boolean };
  stats: {
    totals: Record<string, number | null>;
    funnel: { stage: string; label: string; count: number; fromPrevious: number | null; fromTop: number | null }[];
    goal: { goal: number; clients: number; remaining: number; mrrCents: number; goalMrrCents: number; setupCents: number; goalSetupCents: number; observedRate: number | null; prospectsNeeded: number | null; daysToGoal: number | null };
  };
  preflight: Preflight;
  queues: { hot: QueueRow[]; needsHuman: QueueRow[]; followupToday: QueueRow[] };
  emailQueue: { pending: number; failed: number; estimate: string; pace: { sending: boolean; reason?: string; remainingToday?: number; remainingThisHour?: number } };
  events: { id: string; type: string; label: string; occurred_at: string; lead_id: string | null; business_name: string | null; city: string | null; state: string | null }[];
};

export default function CommandCenter() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (background = false) => {
    try {
      const next = await api<Overview>('/api/admin/acquisition/overview');
      setData(next);
      setError('');
    } catch (e) {
      if (!background) setError(e instanceof Error ? e.message : 'Could not load the Command Center.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live while the panel is on screen, silent while the tab is in the background.
  usePoll(() => void load(true), 45000);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(action);
    setNotice('');
    try {
      const res = await api<{ report?: Record<string, unknown> }>('/api/admin/acquisition/campaign', {
        method: 'POST',
        body: JSON.stringify({ action, ...extra }),
      });
      if (action === 'drain' && res.report) {
        const r = res.report as { done: number; skipped: number; failed: number; held: string | null };
        setNotice(r.held ? `Held: ${r.held}` : `Ran ${r.done} job${r.done === 1 ? '' : 's'}, skipped ${r.skipped}, failed ${r.failed}.`);
      }
      if (action === 'enroll' && res.report) {
        const r = res.report as { enrolled: number; alreadyIn: number; queued: number; considered: number };
        setNotice(`Looked at ${r.considered.toLocaleString()} prospects: ${r.enrolled} newly enrolled, ${r.alreadyIn} already in, ${r.queued} first emails queued.`);
      }
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.');
    } finally {
      setBusy('');
    }
  };

  const t = data?.stats.totals ?? {};
  const n = (k: string): number => Number(t[k] ?? 0);
  const live = data?.campaign?.status === 'live' && !data?.settings.master_paused;
  const status = data?.settings.master_paused ? 'PAUSED' : data?.campaign?.status === 'live' ? 'LIVE' : (data?.campaign?.status ?? '').toUpperCase() || 'DRAFT';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-7xl mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="command"
          badge={{ campaign: data?.emailQueue.failed ?? 0, calls: data?.queues.needsHuman.length ?? 0 }}
          right={
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-lg border-2 font-oswald text-xs font-bold uppercase tracking-[0.14em] ${
                  status === 'LIVE'
                    ? 'bg-[#3f5d34] text-white border-[#161616]'
                    : status === 'PAUSED'
                      ? 'bg-[#F5B700] text-[#161616] border-[#161616]'
                      : 'bg-white text-[#161616]/60 border-[#161616]/30'
                }`}
              >
                {status}
              </span>
              {!live ? (
                <button className={btnPrimary} disabled={busy !== ''} onClick={() => void act(data?.campaign?.status === 'paused' ? 'resume' : 'start')}>
                  {data?.campaign?.status === 'paused' ? 'Resume campaign' : 'Start campaign'}
                </button>
              ) : (
                <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('pause')}>
                  Pause everything
                </button>
              )}
            </div>
          }
        />

        {error && <p className="mb-4 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-4 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        {/* ── blockers first. Nothing else matters if the machine cannot send. ── */}
        {data && data.preflight.blockers.length > 0 && (
          <div className="mb-6 rounded-2xl border-[3px] border-[#E0301E] bg-[#E0301E]/[0.06] p-5 shadow-[5px_5px_0_0_#E0301E]">
            <p className="font-oswald text-sm font-bold uppercase tracking-[0.16em] text-[#E0301E]">
              Outbound paused: {data.preflight.blockers[0].label.toLowerCase()}
            </p>
            <ul className="mt-3 space-y-2.5">
              {data.preflight.blockers.map((b) => (
                <li key={b.id}>
                  <p className="font-semibold text-sm text-[#161616]">{b.label}</p>
                  <p className="text-[13px] text-[#161616]/70 leading-snug">{b.detail}</p>
                  {b.fix && <p className="text-[13px] font-mono text-[#a32315] mt-0.5">{b.fix}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data && data.preflight.warnings.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-[#F5B700] bg-[#F5B700]/10 p-4">
            <p className="font-oswald text-xs font-bold uppercase tracking-[0.16em] text-[#7a5c00]">Worth knowing</p>
            <ul className="mt-2 space-y-1.5">
              {data.preflight.warnings.map((w) => (
                <li key={w.id} className="text-[13px] text-[#161616]/75">
                  <span className="font-semibold">{w.label}.</span> {w.detail} {w.fix && <span className="font-mono text-[#7a5c00]">{w.fix}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!data ? (
          <p className="text-sm text-[#161616]/65">Loading the machine...</p>
        ) : (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6">
              <GoalDial
                clients={data.stats.goal.clients}
                goal={data.stats.goal.goal}
                mrrCents={data.stats.goal.mrrCents}
                setupCents={data.stats.goal.setupCents}
                goalMrrCents={data.stats.goal.goalMrrCents}
                goalSetupCents={data.stats.goal.goalSetupCents}
              />

              <Section
                title="Trajectory"
                note="Computed from this campaign's own observed rates. Blank means not enough has happened yet to say honestly."
              >
                <div className="grid sm:grid-cols-3 gap-3">
                  <Stat label="Clients still needed" value={data.stats.goal.remaining} tone="red" big />
                  <Stat
                    label="Prospects needed"
                    value={data.stats.goal.prospectsNeeded?.toLocaleString() ?? 'Not yet'}
                    sub={data.stats.goal.observedRate ? `At the observed ${(data.stats.goal.observedRate * 100).toFixed(2)}% prospect to client rate` : 'No wins yet, so no honest rate'}
                  />
                  <Stat
                    label="Days to 50"
                    value={data.stats.goal.daysToGoal ?? 'Not yet'}
                    sub={data.stats.goal.daysToGoal ? 'At the last 14 days of pace' : 'Needs a win in the last two weeks'}
                  />
                </div>
                <div className="mt-3 grid sm:grid-cols-3 gap-3">
                  <Stat label="Close rate" value={pct(t.closeRatePct as number | null)} sub="Of completed Mr. Mustard conversations" />
                  <Stat label="Emails queued" value={data.emailQueue.pending.toLocaleString()} sub={data.emailQueue.estimate} />
                  <Stat
                    label="Sending"
                    value={data.emailQueue.pace.sending ? `${data.emailQueue.pace.remainingThisHour ?? 0} left this hour` : 'Holding'}
                    tone={data.emailQueue.pace.sending ? 'seed' : 'warn'}
                    sub={data.emailQueue.pace.sending ? `${data.emailQueue.pace.remainingToday ?? 0} left today` : data.emailQueue.pace.reason}
                  />
                </div>
              </Section>
            </div>

            <Section
              title="The funnel"
              note="Prospect → email → permission → consent → Mr. Mustard → demo → forge → demo sent → meeting or checkout → client. The percentage is the conversion from the step above."
            >
              <Funnel steps={data.stats.funnel} />
            </Section>

            <Section title="Today" note="Everything the machine has done, counted.">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                <Stat label="Total prospects" value={n('prospects').toLocaleString()} />
                <Stat label="New today" value={n('newToday')} />
                <Stat label="Verified emails" value={n('verifiedEmails').toLocaleString()} />
                <Stat label="Campaign ready" value={n('campaignReady').toLocaleString()} tone="seed" />
                <Stat label="Sent today" value={n('emailsSentToday')} />
                <Stat label="Sent total" value={n('emailsSentTotal').toLocaleString()} />
                <Stat label="Bounced" value={n('bounced')} tone={n('bounced') > 0 ? 'red' : 'ink'} />
                <Stat label="Unsubscribed" value={n('unsubscribed')} />
                <Stat label="Replies" value={n('replies')} />
                <Stat label="Permission clicks" value={n('permissionClicks')} tone="mustard" />
                <Stat label="Calls requested" value={n('callsRequested')} tone="mustard" />
                <Stat label="Calls attempted" value={n('callsAttempted')} />
                <Stat label="Conversations" value={n('conversationsCompleted')} tone="seed" />
                <Stat label="Demos forged" value={n('demosCreated')} tone="seed" />
                <Stat label="Demos emailed" value={n('demosEmailed')} />
                <Stat label="Meetings booked" value={n('meetingsBooked')} />
                <Stat label="Checkouts sent" value={n('checkoutsSent')} />
                <Stat label="Purchases" value={n('purchases')} tone="seed" big />
                <Stat label="Setup revenue" value={usd(n('setupRevenueCents'))} tone="seed" />
                <Stat label="New MRR" value={usd(n('newMrrCents'))} tone="seed" />
              </div>
            </Section>

            <div className="grid lg:grid-cols-3 gap-6">
              <PriorityList title="Hot right now" tone="hot" rows={data.queues.hot} empty="Nothing hot yet. Get email one out." />
              <PriorityList title="Needs a human" tone="bad" rows={data.queues.needsHuman} empty="Mr. Mustard has not flagged anybody." />
              <PriorityList title="Follow up today" tone="warn" rows={data.queues.followupToday} empty="Nothing due in the next day." />
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
              <Section
                title="Run the machine"
                note="Enrolment decides who is allowed in and queues their first email. Both are safe to press twice; the queue refuses duplicates."
              >
                <div className="flex flex-wrap gap-2">
                  <button className={btnPrimary} disabled={busy !== ''} onClick={() => void act('enroll', { queue: true })}>
                    {busy === 'enroll' ? 'Enrolling...' : 'Enroll eligible prospects'}
                  </button>
                  <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('enroll', { queue: false, dryRun: true })}>
                    Dry run
                  </button>
                  <button className={btnGhost} disabled={busy !== ''} onClick={() => void act('drain', { limit: 25 })}>
                    {busy === 'drain' ? 'Working...' : 'Send the next batch now'}
                  </button>
                  <Link className={btnGhost} href="/admin/acquisition/lead-finder">
                    Find more prospects
                  </Link>
                  {data.campaign?.status === 'live' && (
                    <button className={btnDanger} disabled={busy !== ''} onClick={() => void act('stop')}>
                      Stop campaign
                    </button>
                  )}
                </div>
                <p className="mt-3 text-xs text-[#161616]/65">
                  Caps: {data.campaign?.daily_send_cap ?? 0} a day, {data.campaign?.hourly_send_cap ?? 0} an hour, weekdays inside business hours Mountain.{' '}
                  <Link href="/admin/acquisition/settings" className="underline font-semibold">
                    Change them
                  </Link>
                  .
                </p>
              </Section>

              <Section
                title="Live activity"
                note="The last forty things that happened, and who did them."
                right={
                  <Link href="/admin/acquisition/engagement" className={`${btnGhost} !py-1.5 !px-3 !text-[11px]`}>
                    Who is moving
                  </Link>
                }
              >
                <ol className="space-y-1.5 max-h-[22rem] overflow-y-auto pr-1">
                  {data.events.length === 0 && <li className="text-sm text-[#161616]/60">Nothing yet.</li>}
                  {data.events.map((e) => (
                    <li key={e.id} className="flex items-start gap-2 text-[13px] leading-snug">
                      <span className="font-mono text-[10px] text-[#161616]/60 tabular-nums shrink-0 pt-0.5">{timeAgo(e.occurred_at)}</span>
                      <span className="min-w-0">
                        {e.lead_id ? (
                          <Link href={`/admin/acquisition/prospects/${e.lead_id}`} className="font-semibold text-[#161616] hover:underline">
                            {e.business_name ?? 'Unknown business'}
                          </Link>
                        ) : (
                          <span className="font-semibold text-[#161616]">Campaign</span>
                        )}
                        <span className="text-[#161616]/80"> · {e.label}</span>
                        {e.city && <span className="text-[#161616]/60 text-[11px]"> · {e.city}{e.state ? `, ${e.state}` : ''}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PriorityList({ title, rows, tone, empty }: { title: string; rows: QueueRow[]; tone: 'hot' | 'bad' | 'warn'; empty: string }) {
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="font-oswald text-base font-bold uppercase tracking-[0.08em]">{title}</h2>
        <Chip label={String(rows.length)} tone={tone} />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-[#161616]/60">{empty}</p>
      ) : (
        <ol className="space-y-2 max-h-[20rem] overflow-y-auto pr-1">
          {rows.map((r) => (
            <li key={`${r.id}-${r.reason}`}>
              <Link href={r.href} className="block rounded-lg border-2 border-[#161616]/15 hover:border-[#161616] px-3 py-2 transition-colors">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{r.business_name}</span>
                  {r.lead_score != null && <span className="font-mono text-[11px] tabular-nums text-[#161616]/65 shrink-0">{r.lead_score}</span>}
                </div>
                <p className="text-[12px] text-[#161616]/60 truncate">
                  {r.reason}
                  {r.city ? ` · ${r.city}${r.state ? `, ${r.state}` : ''}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
