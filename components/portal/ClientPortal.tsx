'use client';

import { useCallback, useEffect, useState, useRef, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { launchCountdown } from '@/lib/launch';
import HelpGuide from '@/components/HelpGuide';
import { CLIENT_HELP } from '@/lib/help-content';
import { OnboardingChecklist, OnboardingIntake } from '@/components/portal/Onboarding';
import LaunchChecklist from '@/components/portal/LaunchChecklist';

/**
 * The client workspace. One screen scoped to the signed-in client: their
 * project status and milestones, files and deliverables, playbook downloads,
 * upcoming calls, and an AI guide that gives a tour and helps with anything.
 */

type Milestone = { title: string; detail?: string; done?: boolean; due?: string };
type Project = { id: string; name: string; status: string; summary: string | null; progress: number; milestones: Milestone[]; launchTarget: string | null };
type PortalData = {
  email: string;
  client: { name: string | null; company: string | null; tier: string; welcomeNote: string | null } | null;
  projects: Project[];
  files: Array<{ label: string; url: string; kind: string }>;
  orders: Array<{ sessionId: string; productName: string; createdAt: string }>;
  bookings: Array<{ whenIso: string; display: string }>;
  audience: 'client' | 'buyer' | 'both' | 'guest';
  billing: {
    oneTime: number;
    deposit: number;
    depositPaid: boolean;
    balanceDue: number;
    balancePaid: boolean;
    signed: boolean;
    monthly: number;
    subscriptionStatus: string;
  } | null;
  audit: {
    url: string | null;
    score: number | null;
    letter: string | null;
    headline: string | null;
    fixes: Array<{ title: string; how: string }>;
  } | null;
  googleReviewUrl: string | null;
};

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

/** Conic progress ring. */
function ProgressRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative h-14 w-14 rounded-full flex-shrink-0"
      style={{ background: `conic-gradient(#F5B700 ${v * 3.6}deg, rgba(22,22,22,0.12) 0deg)` }}
    >
      <div className="absolute inset-[3px] rounded-full bg-white flex items-center justify-center">
        <span className="text-[12px] font-mono font-bold text-[#161616]">{v}%</span>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  discovery: 'Discovery', building: 'In build', review: 'In review', launched: 'Launched', paused: 'Paused',
};
const STATUS_COLOR: Record<string, string> = {
  discovery: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30',
  building: 'bg-[#F5B700]/20 text-[#161616] border-[#161616]/30',
  review: 'bg-amber-100 text-amber-800 border-amber-800/25',
  launched: 'bg-emerald-100 text-emerald-800 border-emerald-800/25',
  paused: 'bg-[#161616]/[0.06] text-[#161616]/65 border-[#161616]/15',
};

type Msg = { role: 'assistant' | 'user'; text: string };

export default function ClientPortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingBalance, setPayingBalance] = useState(false);
  const [startingPlan, setStartingPlan] = useState(false);
  const [requestRefresh, setRequestRefresh] = useState(0);
  const [intakeStatus, setIntakeStatus] = useState('in_progress');

  const payBalance = async () => {
    if (payingBalance) return;
    setPayingBalance(true);
    try {
      const res = await fetch('/api/portal/pay-balance', { method: 'POST' });
      const j = await res.json().catch(() => null);
      if (j?.url) window.location.href = j.url;
      else setPayingBalance(false);
    } catch {
      setPayingBalance(false);
    }
  };

  const startPlan = async () => {
    if (startingPlan) return;
    setStartingPlan(true);
    try {
      const res = await fetch('/api/portal/start-subscription', { method: 'POST' });
      const j = await res.json().catch(() => null);
      if (j?.url) window.location.href = j.url;
      else setStartingPlan(false);
    } catch {
      setStartingPlan(false);
    }
  };

  const managePlan = async () => {
    try {
      const res = await fetch('/api/portal/billing-portal', { method: 'POST' });
      const j = await res.json().catch(() => null);
      if (j?.url) window.location.href = j.url;
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/portal/data');
        if (res.status === 401) { window.location.href = '/portal/login'; return; }
        const json = await res.json();
        if (res.ok) setData(json);
        else setError(json.error ?? 'Could not load your portal');
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = async () => {
    await fetch('/api/portal/logout', { method: 'POST' });
    window.location.href = '/portal/login';
  };

  const firstName = data?.client?.name?.split(' ')[0] || data?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="border-b-2 border-[#161616] sticky top-0 z-30 bg-[#FBF6EA]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-9 w-auto" priority />
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block">Modern Mustard Seed</span>
              <h1 className="font-sans text-xl font-bold text-[#161616] tracking-tight mt-1">Your Portal</h1>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <HelpGuide guide={CLIENT_HELP} nudge={{ storageKey: 'mms_portal_tour_v1', text: 'New here? Take the 1-minute tour.' }} />
            <Link href="/?book=1" className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] px-4 py-2">Book a call</Link>
            <button onClick={logout} className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616]/55 hover:text-[#161616] px-4 py-2">Sign out</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-center text-[#161616]/50 py-20 font-body italic">Opening your workspace...</p>
        ) : error ? (
          <div className="bg-white border-2 border-[#E0301E] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6"><p className="text-[#E0301E] text-sm font-body">{error}</p></div>
        ) : data ? (
          <>
            {/* Welcome */}
            <div className="mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#161616] tracking-tight">
                Welcome back, {firstName}.
              </h2>
              <p className="text-[#3A3733] font-body mt-2">
                {data.client?.welcomeNote
                  || (data.audience === 'buyer'
                    ? 'Your playbooks and a personal AI helper are below.'
                    : data.audience === 'guest'
                      ? 'This is your home base with Modern Mustard Seed. The guide below can help with anything.'
                      : 'Here is where your build stands and everything you need in one place.')}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Getting started checklist */}
                {(data.audience === 'client' || data.audience === 'both') && (
                  <OnboardingChecklist
                    signed={!!data.billing?.signed}
                    depositPaid={!!data.billing?.depositPaid}
                    intakeSubmitted={intakeStatus === 'submitted'}
                    onStartIntake={() => document.getElementById('intake-card')?.scrollIntoView({ behavior: 'smooth' })}
                  />
                )}

                {/* Billing */}
                {data.billing && (data.billing.oneTime > 0 || data.billing.monthly > 0) && (
                  <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">
                      Your engagement
                    </span>
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#3A3733] font-body text-sm">Project total</span>
                        <span className="text-[#161616] font-sans font-bold">{money(data.billing.oneTime)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#3A3733] font-body text-sm">Deposit, 50%</span>
                        {data.billing.depositPaid ? (
                          <span className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-700">Paid ✓</span>
                        ) : (
                          <span className="text-[#161616]/70 font-mono text-sm">{money(data.billing.deposit)} due</span>
                        )}
                      </div>
                      {data.billing.balanceDue > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-[#3A3733] font-body text-sm">Balance on delivery</span>
                          {data.billing.balancePaid ? (
                            <span className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-700">Paid ✓</span>
                          ) : (
                            <span className="text-[#161616]/70 font-mono text-sm">{money(data.billing.balanceDue)}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {data.billing.depositPaid && data.billing.balanceDue > 0 && !data.billing.balancePaid && (
                      <button
                        onClick={payBalance}
                        disabled={payingBalance}
                        className="mt-5 w-full py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                      >
                        {payingBalance ? 'Opening checkout…' : `Pay remaining balance ${money(data.billing.balanceDue)}`}
                      </button>
                    )}
                    {data.billing.balancePaid && (
                      <p className="mt-4 text-emerald-700 font-body text-sm">Paid in full. Thank you. It is all yours.</p>
                    )}
                    {data.billing.signed && (
                      <a
                        href="/api/portal/proposal-pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                      >
                        Download signed proposal ↗
                      </a>
                    )}

                    {data.billing.monthly > 0 && (
                      <div className="mt-5 pt-4 border-t border-[#161616]/10">
                        <div className="flex items-center justify-between">
                          <span className="text-[#3A3733] font-body text-sm">Monthly plan</span>
                          {data.billing.subscriptionStatus === 'active' ? (
                            <span className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-emerald-700">Active ✓</span>
                          ) : (
                            <span className="text-[#161616] font-sans font-bold">{money(data.billing.monthly)}/mo</span>
                          )}
                        </div>
                        {data.billing.subscriptionStatus === 'active' ? (
                          <div className="mt-2">
                            <p className="text-emerald-700 font-body text-xs mb-2">Your plan is active. Thank you.</p>
                            <button onClick={managePlan} className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]">
                              Manage plan (card, cancel) ↗
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={startPlan}
                            disabled={startingPlan}
                            className="mt-3 w-full py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                          >
                            {startingPlan ? 'Opening checkout…' : `Start monthly plan ${money(data.billing.monthly)}/mo`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Projects */}
                {data.projects.map((p) => {
                  const activeIdx = p.milestones.findIndex((m) => !m.done);
                  return (
                  <div key={p.id} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-medium">Project</span>
                        <h3 className="font-sans text-lg font-semibold text-[#161616] mt-1">{p.name}</h3>
                        <span className={`inline-block mt-2 text-[9px] uppercase tracking-[0.15em] font-mono font-semibold px-2.5 py-1 rounded border ${STATUS_COLOR[p.status] ?? STATUS_COLOR.building}`}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </div>
                      <ProgressRing value={p.progress} />
                    </div>
                    {p.summary && <p className="text-[#3A3733] font-body text-sm leading-relaxed mb-4">{p.summary}</p>}
                    {(() => {
                      const cd = launchCountdown(p.launchTarget);
                      if (!cd) return null;
                      const launched = p.status === 'launched';
                      return (
                        <>
                        <div
                          className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 ${launched ? 'mb-4' : 'mb-2'} ${
                            launched
                              ? 'border-emerald-800/30 bg-emerald-50'
                              : cd.past
                                ? 'border-[#E0301E]/30 bg-red-50'
                                : 'border-[#161616]/20 bg-[#FFF8E6]'
                          }`}
                        >
                          <div>
                            <span className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-0.5">
                              {launched ? 'Launched' : 'Launch'}
                            </span>
                            <p className="font-sans font-semibold text-[#161616] text-sm">
                              {launched ? 'It is live 🎉' : cd.label}
                            </p>
                            <p className="text-[#161616]/45 font-mono text-[11px] mt-0.5">{cd.date}</p>
                          </div>
                          {!launched && (
                            <div className="flex flex-col items-center flex-shrink-0">
                              <span className={`font-display text-3xl font-semibold leading-none ${cd.past ? 'text-[#E0301E]' : 'text-[#161616]'}`}>
                                {cd.days < 0 ? Math.abs(cd.days) : cd.days}
                              </span>
                              <span className="text-[8px] uppercase tracking-[0.25em] text-[#161616]/45 font-mono mt-1">
                                {cd.past ? 'days late' : cd.days === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                          )}
                        </div>
                        {!launched && (
                          <LaunchDateRequest projectId={p.id} onRequested={() => setRequestRefresh((n) => n + 1)} />
                        )}
                        </>
                      );
                    })()}

                    {p.milestones.length > 0 && (
                      <div className="space-y-2.5 mt-5">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 font-mono block mb-1">Milestones</span>
                        {p.milestones.map((m, i) => {
                          const active = i === activeIdx;
                          return (
                            <div key={i} className={`flex items-start gap-3 ${active ? 'rounded-lg bg-[#FFF8E6] border border-[#161616]/20 px-3 py-2 -mx-1' : ''}`}>
                              <span className={`mt-0.5 h-4 w-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] ${m.done ? 'bg-emerald-600 text-white' : active ? 'border-2 border-[#F5B700] text-transparent' : 'border border-[#161616]/25 text-transparent'}`}>✓</span>
                              <div className="flex-1">
                                <p className={`font-body text-sm ${m.done ? 'text-[#161616]/45 line-through' : 'text-[#161616]'}`}>{m.title}</p>
                                {m.detail && <p className="text-[#161616]/45 font-body text-xs mt-0.5">{m.detail}</p>}
                              </div>
                              {active && <span className="text-[8px] uppercase tracking-[0.2em] font-mono font-bold text-[#E0301E] mt-1">Now</span>}
                              {!active && m.due && <span className="text-[#161616]/45 font-mono text-[10px]">{m.due}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* The two free edits. Sits right under the project because it is
                    the thing they act on while the build is in front of them. */}
                <RevisionsCard refreshKey={requestRefresh} onSubmitted={() => setRequestRefresh((n) => n + 1)} />

                {/* Project intake */}
                {(data.audience === 'client' || data.audience === 'both') && (
                  <OnboardingIntake onStatus={setIntakeStatus} />
                )}

                {/* Connect Google: the listing matters more than the website. */}
                <ConnectionsCard />

                {/* Launch checklist, now a door rather than the whole room. */}
                <LaunchChecklistCard email={data.email} />

                {/* Saved website audit */}
                {data.audit && (data.audit.score != null || data.audit.headline) && (
                  <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">Your website audit</span>
                        {data.audit.url && <span className="text-[#161616]/50 font-mono text-[11px]">{data.audit.url}</span>}
                      </div>
                      {data.audit.score != null && (
                        <div className="flex flex-col items-center flex-shrink-0">
                          <span className="font-display text-3xl font-semibold text-[#161616] leading-none">{data.audit.score}</span>
                          <span className="text-[8px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono mt-1">/100</span>
                          {data.audit.letter && <span className="mt-1 px-2 py-0.5 rounded-full border border-[#161616]/40 text-[#161616] font-display italic text-xs">{data.audit.letter}</span>}
                        </div>
                      )}
                    </div>
                    {data.audit.headline && (
                      <p className="font-display italic text-[#3A3733] text-base leading-snug mb-4">&ldquo;{data.audit.headline}&rdquo;</p>
                    )}
                    {data.audit.fixes.length > 0 && (
                      <>
                        <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-2">Top fixes</span>
                        <div className="space-y-2">
                          {data.audit.fixes.map((f, i) => (
                            <div key={i} className="rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2.5">
                              <p className="text-[#161616] font-body text-sm font-medium">{i + 1}. {f.title}</p>
                              {f.how && <p className="text-[#161616]/60 font-body text-xs mt-1 leading-relaxed">{f.how}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Credentials & access (encrypted vault) */}
                <CredentialsCard />

                {/* Send a change, edit, or note to Sarah */}
                {(data.audience === 'client' || data.audience === 'both' || data.audience === 'guest') && (
                  <RequestsCard refreshKey={requestRefresh} onSubmitted={() => setRequestRefresh((n) => n + 1)} />
                )}

                {/* Downloads (PDF buyers) */}
                {data.orders.length > 0 && (
                  <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">Your playbooks</span>
                    <div className="space-y-2">
                      {data.orders.map((o) => (
                        <DownloadRow key={o.sessionId} sessionId={o.sessionId} productName={o.productName} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {data.files.length > 0 && (
                  <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-4">Files and deliverables</span>
                    <div className="space-y-1.5">
                      {data.files.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#161616]/[0.04] border border-transparent hover:border-[#161616]/15 transition-colors group">
                          <span className="text-[#161616]/80 font-body text-sm group-hover:text-[#161616]">{f.label}</span>
                          <span className="text-[9px] uppercase tracking-[0.2em] text-[#1E50C8] font-mono">{f.kind} ↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leave a review (clients) */}
                {(data.audience === 'client' || data.audience === 'both') && (
                  <ReviewCard googleReviewUrl={data.googleReviewUrl} />
                )}

                {/* Calls */}
                <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Calls</span>
                    <Link href="/?book=1" className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#1E50C8] hover:text-[#161616]">Book a call →</Link>
                  </div>
                  {data.bookings.length === 0 ? (
                    <p className="text-[#161616]/50 font-body text-sm italic">No upcoming calls. Book one any time, Wed or Thu.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.bookings.map((b, i) => (
                        <div key={i} className="border-l-2 border-emerald-600/40 pl-3">
                          <p className="text-emerald-700 font-mono text-sm">{b.display}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {data.audience === 'guest' && data.projects.length === 0 && data.orders.length === 0 && (
                  <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 text-center">
                    <p className="text-[#3A3733] font-body text-sm mb-4">Nothing here yet. When Sarah starts your build or you grab a playbook, it shows up here automatically.</p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/store" className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#161616] bg-white border-2 border-[#161616] rounded-full hover:bg-[#FFF8E6] transition-all">Browse playbooks</Link>
                      <Link href="/?book=1" className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all">Book a call</Link>
                    </div>
                  </div>
                )}
              </div>

              {/* AI guide */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24">
                  <PortalAssistant firstName={firstName} audience={data.audience} onNoteSent={() => setRequestRefresh((n) => n + 1)} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

/* Leave-a-review card. Submits to moderation; Sarah approves before it goes public. */
function ReviewCard({ googleReviewUrl }: { googleReviewUrl: string | null }) {
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(5);
  const [outcome, setOutcome] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quote.trim() || sending) return;
    setSending(true);
    setErr('');
    try {
      const res = await fetch('/api/portal/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, rating, outcome }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) setErr((j && j.error) || 'Could not submit.');
      else setDone(true);
    } catch {
      setErr('Network error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">
        Leave a review
      </span>
      {done ? (
        <div className="py-3">
          <p className="text-[#161616] font-body text-sm mb-1">Thank you. Sarah reviews each one before it goes live on the site.</p>
          {googleReviewUrl && (
            <a
              href={googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Also post it on Google →
            </a>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="mt-2">
          <p className="text-[#161616]/60 font-body text-xs mb-4">A line or two about working together means the world, and helps the next person find us.</p>
          <div className="flex items-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} stars`}
                className={`text-2xl leading-none ${n <= rating ? 'text-[#F5B700]' : 'text-[#161616]/20'} hover:text-[#FFD23F] transition-colors`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={3}
            placeholder="What was it like working with Modern Mustard Seed?"
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] resize-y mb-3"
          />
          <input
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="A result, if you have one (e.g. 30% more booked jobs)"
            className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] mb-3"
          />
          {err && <p className="text-[#E0301E] text-xs font-body mb-3">{err}</p>}
          <button
            type="submit"
            disabled={sending || !quote.trim()}
            className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            {sending ? 'Sending…' : 'Submit review'}
          </button>
        </form>
      )}
    </div>
  );
}

/* Credentials & access: the client's own launch logins, encrypted at rest,
   masked until they reveal or copy. Never emailed. */
type PortalCredential = { id: string; label: string; username: string | null; url: string | null };
function CredentialsCard() {
  const [items, setItems] = useState<PortalCredential[]>([]);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/portal/credentials')
      .then((r) => r.json())
      .then((j) => {
        if (alive && Array.isArray(j?.credentials)) setItems(j.credentials);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const reveal = async (id: string) => {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const n = { ...r };
        delete n[id];
        return n;
      });
      return;
    }
    try {
      const r = await fetch(`/api/portal/credentials/${id}/reveal`);
      const j = await r.json().catch(() => null);
      if (r.ok && typeof j?.secret === 'string') setRevealed((m) => ({ ...m, [id]: j.secret }));
    } catch {
      /* ignore */
    }
  };

  const copy = async (id: string) => {
    let v = revealed[id];
    if (v === undefined) {
      try {
        const r = await fetch(`/api/portal/credentials/${id}/reveal`);
        const j = await r.json().catch(() => null);
        if (r.ok && typeof j?.secret === 'string') v = j.secret;
      } catch {
        return;
      }
    }
    if (v === undefined) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">Credentials &amp; access</span>
      <p className="text-[#161616]/60 font-body text-xs mb-4">Your launch logins, encrypted and private to you. Reveal or copy when you need them.</p>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <span className="block text-sm text-[#161616] font-body truncate">{c.label}</span>
                {(c.username || c.url) && (
                  <span className="block text-[11px] text-[#161616]/50 font-mono truncate">
                    {c.username || ''}
                    {c.username && c.url ? ' · ' : ''}
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1E50C8]">
                        {c.url}
                      </a>
                    ) : (
                      ''
                    )}
                  </span>
                )}
              </div>
              <button onClick={() => reveal(c.id)} className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#1E50C8] hover:text-[#161616] flex-shrink-0">
                {revealed[c.id] !== undefined ? 'Hide' : 'Reveal'}
              </button>
              <button onClick={() => copy(c.id)} className="text-[9px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616]/55 hover:text-[#161616] flex-shrink-0">
                {copiedId === c.id ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-1.5 font-mono text-[12px] text-[#161616] break-all">
              {revealed[c.id] !== undefined ? revealed[c.id] : '••••••••••••'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Propose a different launch date. Routed to Sarah to approve; on approval the
   project's launch date updates and the client gets a confirmation email. */
function LaunchDateRequest({ projectId, onRequested }: { projectId: string; onRequested: () => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!date || sending) return;
    setSending(true);
    setErr('');
    try {
      const res = await fetch('/api/portal/launch-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, date, reason }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) setErr((j && j.error) || 'Could not send.');
      else {
        setDone(true);
        setOpen(false);
        onRequested();
      }
    } catch {
      setErr('Network error.');
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return <p className="text-emerald-700 font-body text-xs mb-4">Date change requested. Sarah will confirm it shortly.</p>;
  }

  return (
    <div className="mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
        >
          Request a different date →
        </button>
      ) : (
        <form onSubmit={submit} className="rounded-xl border border-[#161616]/15 bg-[#FFFDF6] p-4">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-2">Propose a new launch date</span>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="flex-1 bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
          </div>
          {err && <p className="text-[#E0301E] text-xs font-body mb-2">{err}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={sending || !date}
              className="px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[2px_2px_0_0_#161616] disabled:opacity-50 hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              {sending ? 'Sending…' : 'Send request'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-[0.2em] font-mono text-[#161616]/55 hover:text-[#161616]">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* Send a change, edit, or note to Sarah. Posts to the portal, notifies Sarah,
   shows the client's running history with status. */
type ClientRequest = {
  id: string;
  body: string;
  source: 'note' | 'chatbot' | 'launch_date' | 'revision';
  status: 'new' | 'read' | 'done';
  created_at: string;
  reply_body?: string | null;
  replied_at?: string | null;
  revision_number?: number | null;
};
const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Sent', cls: 'text-[#161616] border-[#161616]/30 bg-[#F5B700]/20' },
  read: { label: 'Seen by Sarah', cls: 'text-[#1E50C8] border-[#1E50C8]/30 bg-blue-100' },
  done: { label: 'Done', cls: 'text-emerald-800 border-emerald-800/25 bg-emerald-100' },
};

/**
 * YOUR TWO FREE EDITS.
 *
 * The offer promises two free edits before the site goes live, and until now that
 * promise lived only in the sales copy: no counter, no ledger, no way for either
 * side to know whether this was the first edit or the fifth. The count is spent
 * server-side by claim_revision() (one atomic statement, fails closed), so this
 * card only ever reports what is true.
 *
 * Running out is not a wall. The words still reach Sarah, as a change request she
 * prices. Swallowing what a paying customer typed would be the worst outcome here.
 */
type RevisionState = { id: string; name: string; included: number; used: number; remaining: number; closed: boolean; hasSite: boolean; published: boolean; carePlan: boolean; careUsed: number; careCap: number; paidCount: number };
type EditState = { status: 'queued' | 'building' | 'ready' | 'failed'; instruction: string | null; paid: boolean };
const money2 = (cents: number) => `$${Math.round(cents / 100)}`;

/**
 * SELF-SERVE EDITS. You talk, your site changes, you watch it happen.
 *
 * Submit an edit and the forge applies it to a copy within minutes. You PREVIEW
 * the change here, then ship it yourself, adjust it again free, or throw it away.
 * The first two are free. After that, buy one at a time. Sarah keeps oversight on
 * her side, but you never wait on her for the happy path.
 */
function RevisionsCard({ refreshKey, onSubmitted }: { refreshKey: number; onSubmitted: () => void }) {
  const [state, setState] = useState<RevisionState | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [priceCents, setPriceCents] = useState(2900);
  const [carePriceCents, setCarePriceCents] = useState(9700);
  const [text, setText] = useState('');
  const [adjustText, setAdjustText] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [justPurchased, setJustPurchased] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/revision');
      const j = await res.json().catch(() => null);
      if (res.ok) {
        if (j?.project) setState(j.project as RevisionState);
        setEdit((j?.edit as EditState | null) ?? null);
        if (j?.edit) setJustPurchased(false); // the paid edit landed
        if (typeof j?.editPriceCents === 'number') setPriceCents(j.editPriceCents);
        if (typeof j?.carePlanPriceCents === 'number') setCarePriceCents(j.carePlanPriceCents);
      }
    } catch {
      /* leave state as-is */
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  // Just back from paying for an edit: the webhook queues it a beat later, so poll
  // until it shows up instead of flashing the buy form at someone who just paid.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('edit') !== 'purchased') return;
    setJustPurchased(true);
    let n = 0;
    const t = setInterval(() => { n += 1; load(); if (n >= 12) { clearInterval(t); setJustPurchased(false); } }, 4000);
    return () => clearInterval(t);
  }, [load]);

  // Just back from starting the Care Plan: poll a few times so the card flips to the
  // active state as soon as the subscription webhook lands.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('care') !== 'active') return;
    setNote('Your Care Plan is on. Every edit is included now.');
    let n = 0;
    const t = setInterval(() => { n += 1; load(); if (n >= 10) clearInterval(t); }, 3000);
    return () => clearInterval(t);
  }, [load]);

  // While the forge is building the change, poll so it flips to the preview on its own.
  useEffect(() => {
    if (edit?.status === 'queued' || edit?.status === 'building') {
      const t = setInterval(load, 8000);
      return () => clearInterval(t);
    }
  }, [edit?.status, load]);

  // Pull the draft to show the moment it is ready.
  useEffect(() => {
    let alive = true;
    if (edit?.status === 'ready') {
      fetch('/api/portal/edit/preview')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive && j?.html) setPreview(j.html as string); })
        .catch(() => {});
    } else {
      setPreview(null);
      setAdjustOpen(false);
    }
    return () => { alive = false; };
  }, [edit?.status]);

  if (!state) return null;

  const inFlight = Boolean(edit);
  const spent = state.remaining === 0;

  // Submit a FREE edit (auto-applies to a draft when a site exists).
  const submitFree = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy('submit');
    setErr('');
    setNote('');
    try {
      const res = await fetch('/api/portal/revision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { setErr((j && j.error) || 'Could not send.'); }
      else {
        setText('');
        if (j.applying) { await load(); }
        else setNote(j.exhausted ? ((j.message as string) || 'Sent to Sarah as a change request.') : 'Sent to Sarah.');
        onSubmitted();
      }
    } catch { setErr('Network error.'); } finally { setBusy(null); }
  };

  // Buy ONE edit once the free ones are gone.
  const buyEdit = async (e: FormEvent) => {
    e.preventDefault();
    const instruction = text.trim();
    if (!instruction || busy) return;
    setBusy('buy');
    setErr('');
    try {
      const res = await fetch('/api/portal/edit/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction }),
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.url) { window.location.href = j.url as string; }
      else { setErr((j && j.error) || 'Could not start checkout.'); setBusy(null); }
    } catch { setErr('Network error.'); setBusy(null); }
  };

  // Turn on the Care Plan: unlimited edits, one monthly price.
  const startCarePlan = async () => {
    if (busy) return;
    setBusy('care');
    setErr('');
    try {
      const res = await fetch('/api/portal/care-plan/checkout', { method: 'POST' });
      const j = await res.json().catch(() => null);
      if (res.ok && j?.url) { window.location.href = j.url as string; }
      else { setErr((j && j.error) || 'Could not start the Care Plan.'); setBusy(null); }
    } catch { setErr('Network error.'); setBusy(null); }
  };

  const act = async (action: 'ship' | 'adjust' | 'discard', instruction?: string) => {
    setBusy(action);
    setErr('');
    setNote('');
    try {
      const res = await fetch('/api/portal/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, instruction }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) { setErr((j && j.error) || 'That did not work.'); }
      else {
        if (action === 'ship') setNote(j.published ? 'Shipped. Your change is live now.' : 'Looks great. It is set into your site, ready for launch.');
        setAdjustText('');
        await load();
        onSubmitted();
      }
    } catch { setErr('Network error.'); } finally { setBusy(null); }
  };

  // ── The in-flight edit takes over the card: building, then preview + ship. ──
  if (inFlight && edit) {
    return (
      <div className="border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 bg-[#F5B700]/12">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Your edit</span>

        {(edit.status === 'queued' || edit.status === 'building') && (
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5B700] opacity-70" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#F5B700]" />
              </span>
              <h3 className="font-display text-xl font-semibold text-[#161616]">Making your change now</h3>
            </div>
            {edit.instruction && <p className="text-[#161616]/70 font-body text-sm mt-2 italic">&ldquo;{edit.instruction}&rdquo;</p>}
            <p className="text-[#161616]/60 font-body text-sm mt-2">
              This usually takes a few minutes. Nothing on your live site changes until you look at it and ship it. This card updates itself.
            </p>
          </div>
        )}

        {edit.status === 'failed' && (
          <div className="mt-2">
            <h3 className="font-display text-xl font-semibold text-[#161616]">That one did not take</h3>
            <p className="text-[#161616]/65 font-body text-sm mt-1 mb-3">Try describing it a different way, and we will run it again. This one is on us.</p>
            <button onClick={() => act('discard')} disabled={!!busy} className="px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50">
              {busy === 'discard' ? '…' : 'Start over'}
            </button>
            {err && <p className="text-[#E0301E] text-xs font-body mt-2">{err}</p>}
          </div>
        )}

        {edit.status === 'ready' && (
          <div className="mt-2">
            <h3 className="font-display text-xl font-semibold text-[#161616]">Here is your change</h3>
            {edit.instruction && <p className="text-[#161616]/70 font-body text-sm mt-1 italic">&ldquo;{edit.instruction}&rdquo;</p>}
            <p className="text-[#161616]/60 font-body text-sm mt-1 mb-3">
              Take a look. Ship it and it goes {state.published ? 'live' : 'into your site for launch'}, keep adjusting it free until it is right, or throw it away.
            </p>
            <div className="rounded-xl border-2 border-[#161616] overflow-hidden bg-white mb-4">
              {preview ? (
                <iframe sandbox="" srcDoc={preview} title="Your edited site" className="w-full h-[380px] bg-white block" />
              ) : (
                <div className="h-[380px] grid place-items-center font-mono uppercase text-xs text-[#161616]/40">Loading your preview…</div>
              )}
            </div>

            {adjustOpen ? (
              <div className="mb-3">
                <textarea
                  value={adjustText}
                  onChange={(e) => setAdjustText(e.target.value)}
                  rows={2}
                  placeholder="What else should change? e.g. make the button green instead."
                  className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] resize-y mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={() => act('adjust', adjustText.trim())} disabled={!!busy || !adjustText.trim()} className="px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50">
                    {busy === 'adjust' ? 'Adjusting…' : 'Adjust it'}
                  </button>
                  <button onClick={() => setAdjustOpen(false)} className="px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-mono text-[#161616]/55 hover:text-[#161616]">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => act('ship')} disabled={!!busy} className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
                  {busy === 'ship' ? 'Shipping…' : state.published ? 'Ship it live' : 'Looks great, ship it'}
                </button>
                <button onClick={() => setAdjustOpen(true)} disabled={!!busy} className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50">
                  Adjust it
                </button>
                <button onClick={() => act('discard')} disabled={!!busy} className="px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] font-mono text-[#161616]/55 hover:text-[#E0301E] transition-colors">
                  {busy === 'discard' ? '…' : 'Discard'}
                </button>
              </div>
            )}
            {err && <p className="text-[#E0301E] text-xs font-body mt-2">{err}</p>}
          </div>
        )}
      </div>
    );
  }

  // Just paid, webhook still catching up: reassure rather than reshow the buy form.
  if (justPurchased && !edit) {
    return (
      <div className="border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 bg-[#F5B700]/12">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Your edit</span>
        <div className="flex items-center gap-3 mt-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5B700] opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#F5B700]" />
          </span>
          <h3 className="font-display text-xl font-semibold text-[#161616]">Payment received. Starting your edit…</h3>
        </div>
        <p className="text-[#161616]/60 font-body text-sm mt-2">This takes a few seconds to kick off, then a few minutes to build. This card updates itself.</p>
      </div>
    );
  }

  // ── No edit in flight: care plan, free edit, buy one, or send a note. ──
  const canBuy = spent && state.hasSite && !state.closed;
  const editTextarea = (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      rows={3}
      placeholder="e.g. Swap the hero photo for our storefront, use our green, and make the phone number bigger at the top."
      className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] resize-y mb-3"
    />
  );

  // CARE PLAN ACTIVE: every edit included. No pips, no price, no buy button.
  if (state.carePlan) {
    return (
      <div className="border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 bg-[#F5B700]/12">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Care Plan · active</span>
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-emerald-700">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
            Unlimited
          </span>
        </div>
        <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Every edit is included.</h3>
        <p className="text-[#161616]/65 font-body text-sm mb-4">
          Change your site as often as you like. We make it within minutes, you preview it right here, then you ship it yourself.{state.careUsed > 0 ? ` ${state.careUsed} edit${state.careUsed === 1 ? '' : 's'} this month.` : ''}
        </p>
        <form onSubmit={submitFree}>
          {editTextarea}
          {err && <p className="text-[#E0301E] text-xs font-body mb-3">{err}</p>}
          {note && <p className="text-emerald-700 text-xs font-body mb-3">{note}</p>}
          <button
            type="submit"
            disabled={!!busy || !text.trim()}
            className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            {busy === 'submit' ? 'Sending…' : 'Make this edit'}
          </button>
        </form>
      </div>
    );
  }

  // Show the Care Plan upsell the moment editing starts to cost: free edits spent,
  // the site is live, or they have already bought at least one edit.
  const showUpsell = canBuy || state.closed || state.paidCount > 0;

  return (
    <div className="space-y-4">
      <div className={`border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 ${spent ? 'bg-white' : 'bg-[#F5B700]/12'}`}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">{canBuy ? 'Edit your site' : 'Your free edits'}</span>
          <div className="flex gap-1.5 flex-shrink-0" aria-label={`${state.used} of ${state.included} edits used`}>
            {Array.from({ length: state.included }).map((_, i) => (
              <span key={i} className={`w-7 h-2.5 rounded-full border-2 border-[#161616] ${i < state.used ? 'bg-[#161616]' : 'bg-white'}`} />
            ))}
          </div>
        </div>

        <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">
          {state.closed ? 'Your site is live' : canBuy ? 'Want another change?' : spent ? 'Both free edits are used' : `${state.remaining} free edit${state.remaining === 1 ? '' : 's'} left`}
        </h3>
        <p className="text-[#161616]/65 font-body text-sm mb-4">
          {state.closed
            ? 'Type any change below. It comes back to you as a preview before anything goes live.'
            : canBuy
              ? `Your two free edits are used. Buy one more for ${money2(priceCents)} and it works the same way: we make it, you preview it, you ship it.`
              : spent
                ? 'Send the change anyway. Sarah will come back with a price before anyone touches anything.'
                : 'Tell us what to change. We make it within minutes, you preview it right here, then you ship it yourself.'}
        </p>

        <form onSubmit={canBuy || state.closed ? buyEdit : submitFree}>
          {editTextarea}
          {err && <p className="text-[#E0301E] text-xs font-body mb-3">{err}</p>}
          {note && <p className="text-emerald-700 text-xs font-body mb-3">{note}</p>}
          <button
            type="submit"
            disabled={!!busy || !text.trim()}
            className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            {busy === 'buy' ? 'Opening checkout…' : busy === 'submit' ? 'Sending…' : canBuy || state.closed ? `Buy this edit · ${money2(priceCents)}` : 'Make this edit'}
          </button>
        </form>
      </div>

      {showUpsell && (
        <div className="border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#1E50C8] p-5 bg-[#161616] text-[#FBF6EA]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold">Editing a lot?</span>
          <h4 className="font-display text-lg font-semibold mt-1 mb-1">Go unlimited with the Care Plan.</h4>
          <p className="text-[#FBF6EA]/70 font-body text-sm mb-3">
            {money2(carePriceCents)}/mo, every edit included, none of them counted.{state.paidCount > 0 ? ` You have spent ${money2(state.paidCount * priceCents)} on edits so far.` : ''} Cancel anytime.
          </p>
          <button
            onClick={startCarePlan}
            disabled={busy === 'care'}
            className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#FBF6EA] rounded-lg shadow-[3px_3px_0_0_#FBF6EA] disabled:opacity-50 hover:-translate-y-0.5 transition-all"
          >
            {busy === 'care' ? 'Opening checkout…' : `Get the Care Plan · ${money2(carePriceCents)}/mo`}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * CONNECT YOUR GOOGLE.
 *
 * The alternative, and what this replaces, was asking a small business owner for their
 * Google PASSWORD so Sarah could paste it into a vault. That hands over their email,
 * their reviews, and their ad account all at once, with no way to revoke it. A scoped
 * OAuth grant they can cut off themselves is the honest way to ask.
 *
 * The pitch is not "authorize an integration". It is: this is what gets you found.
 */
type Integration = {
  provider: 'google';
  accountEmail: string | null;
  accountName: string | null;
  status: 'connected' | 'revoked' | 'error';
  connectedAt: string;
};

function ConnectionsCard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [available, setAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await fetch('/api/portal/integrations');
      const j = await res.json().catch(() => null);
      if (res.ok) {
        setIntegrations((j?.integrations ?? []) as Integration[]);
        setAvailable(Boolean(j?.available));
      }
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  if (!loaded || !available) return null;

  const google = integrations.find((i) => i.provider === 'google');
  const live = google?.status === 'connected';

  const disconnect = async () => {
    if (!confirm('Disconnect Google? We will lose access to your business listing and your stats.')) return;
    setBusy(true);
    try {
      await fetch('/api/portal/integrations', { method: 'DELETE' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">
        Getting you found
      </span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">
        {live ? 'Google is connected' : 'Connect your Google'}
      </h3>

      {live ? (
        <>
          <p className="text-[#161616]/65 font-body text-sm mb-3">
            Connected as <strong>{google?.accountEmail ?? 'your Google account'}</strong>. We keep your business listing
            accurate and watch how the site is doing. We never post as you, and you can cut this off any time, here or
            from your Google account.
          </p>
          <button
            type="button"
            onClick={disconnect}
            disabled={busy}
            className="px-5 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform"
          >
            {busy ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </>
      ) : (
        <>
          <p className="text-[#161616]/65 font-body text-sm mb-1">
            {google?.status === 'revoked'
              ? 'Your Google connection was cut off. Reconnect and we will pick right back up.'
              : 'Your Google Business Profile is the listing people see on Maps and in search, and it is what the AI assistants read when someone asks who does this near you. It matters more than the website.'}
          </p>
          <ul className="text-[#161616]/65 font-body text-sm mb-4 mt-2 space-y-1">
            <li>· Keep your hours, phone, and services correct everywhere at once</li>
            <li>· See whether the site is actually bringing you calls</li>
            <li>· Let the receptionist book straight into your calendar</li>
          </ul>
          <a
            href="/api/oauth/google/start"
            className="inline-block px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            {google?.status === 'revoked' ? 'Reconnect Google' : 'Connect Google'}
          </a>
          <p className="text-[#161616]/45 font-body text-xs mt-3">
            We never get your password, and we never post as you.
          </p>
        </>
      )}
    </div>
  );
}

/**
 * The launch checklist is genuinely good, but it is for someone STARTING a
 * business, and most people here are not. It was the tallest thing on the page by
 * a wide margin, so it read as the point of the portal. It is now a door: one line
 * with its own progress, opened only by people who want it.
 */
function LaunchChecklistCard({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mb-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]/60 hover:text-[#161616] transition-colors"
        >
          &larr; Hide the checklist
        </button>
        <LaunchChecklist email={email} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full text-left bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold block mb-1">
            Starting a business?
          </span>
          <h3 className="font-display text-lg font-semibold text-[#161616]">The Launch Checklist</h3>
          <p className="text-[#161616]/60 font-body text-xs mt-0.5">
            Every step to get open, online, and selling. Licenses, taxes, getting found. Open it only if you need it.
          </p>
        </div>
        <span className="flex-shrink-0 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] px-4 py-2">
          Open
        </span>
      </div>
    </button>
  );
}

function RequestsCard({ refreshKey, onSubmitted }: { refreshKey: number; onSubmitted: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [justSent, setJustSent] = useState(false);
  const [history, setHistory] = useState<ClientRequest[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/portal/requests');
        const j = await res.json().catch(() => null);
        if (alive && res.ok && Array.isArray(j?.requests)) setHistory(j.requests);
      } catch {
        /* leave history as-is */
      }
    })();
    return () => { alive = false; };
  }, [refreshKey]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setErr('');
    try {
      const res = await fetch('/api/portal/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) {
        setErr((j && j.error) || 'Could not send.');
      } else {
        setText('');
        setJustSent(true);
        setTimeout(() => setJustSent(false), 4000);
        onSubmitted();
      }
    } catch {
      setErr('Network error.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">
        Requests and notes
      </span>
      <p className="text-[#161616]/60 font-body text-xs mb-4">
        Send a change, an edit, or anything on your mind. It goes straight to Sarah. You can also just tell Mr. Mustard Seed and he will pass it along.
      </p>

      <form onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Can we change the hero headline to ‘Faith over fear’ and swap the homepage photo?"
          className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] resize-y mb-3"
        />
        {err && <p className="text-[#E0301E] text-xs font-body mb-3">{err}</p>}
        {justSent && <p className="text-emerald-700 text-xs font-body mb-3">Sent to Sarah. She will follow up.</p>}
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="px-6 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
        >
          {sending ? 'Sending…' : 'Send to Sarah'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[#161616]/10">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#161616]/50 font-mono block mb-3">Your requests</span>
          <div className="space-y-2.5">
            {history.map((r) => {
              const s = REQ_STATUS[r.status] ?? REQ_STATUS.new;
              return (
                <div key={r.id} className="rounded-lg bg-[#FFFDF6] border border-[#161616]/15 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[#3A3733] font-body text-[13px] leading-relaxed flex-1">{r.body}</p>
                    <span className={`flex-shrink-0 text-[8px] uppercase tracking-[0.15em] font-mono font-bold px-2 py-0.5 rounded border ${s.cls}`}>{s.label}</span>
                  </div>
                  {r.source === 'chatbot' && (
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#161616]/45 font-mono mt-1.5 inline-block">via Mr. Mustard Seed</span>
                  )}
                  {r.source === 'revision' && r.revision_number != null && (
                    <span className="text-[9px] uppercase tracking-[0.15em] text-[#161616]/45 font-mono mt-1.5 inline-block">Free edit {r.revision_number}</span>
                  )}
                  {/* Sarah's answer, in the portal. Before this her replies went out
                      as plain email and were invisible here, so the thread the client
                      saw was permanently one-sided. */}
                  {r.reply_body && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#161616]/10">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold block mb-1">Sarah replied</span>
                      <p className="text-[#3A3733] font-body text-[13px] leading-relaxed whitespace-pre-wrap">{r.reply_body}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Download row: fetches a fresh signed link from the existing store endpoint. */
function DownloadRow({ sessionId, productName }: { sessionId: string; productName: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const get = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/store/download/${sessionId}`);
      const json = await res.json();
      if (res.ok && json.downloads?.length) {
        for (const d of json.downloads) {
          if (d.url) window.open(d.url, '_blank', 'noopener');
        }
      } else {
        setErr('Link unavailable. Email Sarah.');
      }
    } catch {
      setErr('Could not fetch. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[#FFFDF6] border border-[#161616]/15">
      <span className="text-[#161616] font-body text-sm">{productName}</span>
      <div className="flex items-center gap-3">
        {err && <span className="text-[#E0301E] font-body text-[11px]">{err}</span>}
        <button onClick={get} disabled={busy} className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] disabled:opacity-50">
          {busy ? '...' : 'Download'}
        </button>
      </div>
    </div>
  );
}

/* In-portal AI guide with a one-tap guided tour. */
function PortalAssistant({ firstName, audience, onNoteSent }: { firstName: string; audience: string; onNoteSent?: () => void }) {
  const greeting: Msg = {
    role: 'assistant',
    text: `Hi ${firstName}. I am Mr. Mustard Seed, your guide. I can walk you through your portal, explain where your project stands, or pass a change or note straight to Sarah. Just tell me what you need.`,
  };
  const [messages, setMessages] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: Msg[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/portal/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(1).map((m) => ({ role: m.role, content: m.text })) }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: json.reply || 'Tell me a bit more.' }]);
      if (json.noteSent) onNoteSent?.();
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'I hit a snag. Try again in a moment.' }]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  const quick = audience === 'buyer'
    ? ['Give me the tour', 'Help me use my playbook', 'Send Sarah a note']
    : ['Give me the tour', "What's my project status?", 'Request a change'];

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] flex flex-col h-[560px] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#161616]/10 flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F5B700] opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F5B700]" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Your guide</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap ${m.role === 'assistant' ? 'bg-[#FFFDF6] border border-[#161616]/15 text-[#161616] rounded-bl-md' : 'bg-[#F5B700] text-[#161616] rounded-br-md'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {quick.map((q) => (
              <button key={q} onClick={() => void send(q)} className="text-left px-3 py-1.5 rounded-lg text-[12px] font-body bg-[#FFFDF6] border border-[#161616]/15 text-[#161616]/80 hover:border-[#161616] hover:text-[#161616] transition-all">
                {q}
              </button>
            ))}
          </div>
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#FFFDF6] border border-[#161616]/15">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B700] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B700] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#F5B700] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-[#161616]/10 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sending ? 'Thinking...' : 'Ask me anything...'}
          disabled={sending}
          className="flex-1 bg-white border-2 border-[#161616] rounded-full px-4 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700] disabled:opacity-50"
        />
        <button type="submit" disabled={sending || !input.trim()} className="px-4 py-2 rounded-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] text-[10px] uppercase tracking-[0.15em] font-sans font-bold disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
