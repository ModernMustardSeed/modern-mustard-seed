'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import RoadmapDocument from '@/components/RoadmapDocument';
import CoachPanel from '@/components/hundredfold/CoachPanel';
import type { RoadmapReport } from '@/lib/roadmap-shape';

/**
 * The member's Command Center.
 *
 * The whole program on one screen: which window they are in, what clears the
 * gate, what we are building, and the plan itself. Opened Monday morning it
 * should answer "what is this week" without them having to think.
 */

type Member = {
  id: string;
  business_name: string | null;
  name: string | null;
  host: string | null;
  status: string;
  deep_roadmap: RoadmapReport | null;
  offer: {
    name: string;
    one_liner: string;
    promise: string;
    price: string;
    guarantee: string;
    stack: { item: string; value: string; why: string }[];
    call_opening: string;
    close_ask: string;
    objections: { objection: string; answer: string }[];
  } | null;
  started_at: string | null;
};

type Gate = {
  id: string;
  window_no: number;
  kind: string;
  label: string;
  target: string | null;
  done: boolean;
};

type Asset = {
  kind: 'image' | 'text' | 'file' | 'page' | 'tool';
  title: string;
  url?: string;
  text?: string;
  embed?: string;
  at: string;
};

type SystemRow = {
  id: string;
  name: string;
  window_no: number | null;
  kind: string | null;
  summary: string | null;
  status: string;
  gives_back: string | null;
  url: string | null;
  assets: Asset[] | null;
  approved_at: string | null;
  public_slug: string | null;
  error: string | null;
};

type Meter = {
  capCents: number;
  spentCents: number;
  remainingCents: number;
  cycleEnd: string;
  unreadable: boolean;
};

type Submission = {
  id: string;
  system_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  payload: Record<string, string>;
  created_at: string;
};

/** Kinds the factory makes on demand. Everything else is the studio's to build. */
const SELF_SERVE = new Set(['page', 'tool', 'pdf', 'copy', 'script', 'email-sequence', 'social-campaign', 'images']);
const SPENDS = new Set(['video', 'ad-campaign']);

const usd = (cents: number) => `$${(cents / 100).toFixed(0)}`;

type Tab = 'coach' | 'week' | 'plan' | 'offer' | 'build';

const SYSTEM_STYLE: Record<string, string> = {
  proposed: 'bg-white text-[#161616]/60 border-[#161616]/30',
  queued: 'bg-[#1E50C8]/10 text-[#1E50C8] border-[#1E50C8]/40',
  building: 'bg-[#F5B700]/30 text-[#8f6600] border-[#8f6600]/45',
  live: 'bg-[#2F7D32]/12 text-[#2F7D32] border-[#2F7D32]/45',
  retired: 'bg-[#161616]/5 text-[#161616]/40 border-[#161616]/20',
};

export default function HundredfoldCommandCenter() {
  const [member, setMember] = useState<Member | null>(null);
  const [gates, setGates] = useState<Gate[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('coach');
  const [meter, setMeter] = useState<Meter | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  /** systemId -> what the factory is doing, or what it said when it refused. */
  const [busy, setBusy] = useState<string | null>(null);
  const [says, setSays] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const loadMeter = async () => {
    try {
      const res = await fetch('/api/portal/hundredfold/build');
      const data = await res.json();
      if (data.ok) {
        setMeter(data.meter ?? null);
        setSubmissions(data.submissions ?? []);
      }
    } catch {
      /* the arsenal still renders without the meter */
    }
  };

  /**
   * Fire a build. Deliberately awaits the whole thing rather than polling: a
   * page or a tool takes a minute or two and the member is watching, so the
   * honest UI is a button that stays busy until there is something to show.
   */
  const act = async (systemId: string, action: 'build' | 'approve' | 'unpublish') => {
    setBusy(systemId);
    setSays((s) => ({ ...s, [systemId]: action === 'build' ? 'Building it now. This takes a minute or two.' : '' }));
    try {
      const res = await fetch('/api/portal/hundredfold/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId, action }),
      });
      const data = await res.json();
      setSays((s) => ({
        ...s,
        [systemId]: data.ok
          ? action === 'approve'
            ? 'Approved. It is queued and you can build it now.'
            : action === 'unpublish'
              ? 'Taken down. The address stops serving straight away.'
              : 'Done. It is below.'
          : (data.reason ?? 'That did not go through. Try it again.'),
      }));
      await Promise.all([load(), loadMeter()]);
    } catch {
      setSays((s) => ({ ...s, [systemId]: 'That did not go through. Try it again.' }));
    } finally {
      setBusy(null);
    }
  };

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600);
    } catch {
      /* clipboard blocked; the text is on screen and selectable anyway */
    }
  };

  const load = async () => {
    try {
      const res = await fetch('/api/portal/hundredfold');
      const data = await res.json();
      if (data.ok && data.member) {
        setMember(data.member);
        setGates(data.gates ?? []);
        setSystems(data.systems ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadMeter();
  }, []);

  /** The window they are actually in: the first one whose gate is not cleared. */
  const currentWindow = useMemo(() => {
    for (let w = 1; w <= 4; w += 1) {
      const gate = gates.find((g) => g.window_no === w && g.kind === 'gate');
      if (gate && !gate.done) return w;
    }
    return gates.length ? 4 : 1;
  }, [gates]);

  const toggle = async (g: Gate) => {
    setGates((gs) => gs.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)));
    await fetch('/api/portal/hundredfold', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateId: g.id, done: !g.done }),
    });
  };

  if (loading) {
    return <p className="font-body text-[#161616]/50 py-10">Loading your program…</p>;
  }

  if (!member) {
    return (
      <div className="pop-card p-8 md:p-10">
        <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-3">
          Hundredfold
        </span>
        <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight mb-3">
          You are not in the program yet
        </h2>
        <p className="text-[#3a3733] font-body text-base leading-relaxed mb-6 max-w-xl">
          HUNDREDFOLD starts with an interview. About twenty minutes with Mr. Mustard, and at the end of it
          you have a roadmap built from your own numbers.
        </p>
        <Link
          href="/hundredfold"
          className="inline-block px-6 py-3.5 text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616] hover:-translate-y-0.5 transition-all"
        >
          See what it is
        </Link>
      </div>
    );
  }

  const windowGates = gates.filter((g) => g.window_no === currentWindow);
  const moves = windowGates.filter((g) => g.kind !== 'gate');
  const gate = windowGates.find((g) => g.kind === 'gate');
  const phase = member.deep_roadmap?.phases?.[currentWindow - 1];
  const doneCount = gates.filter((g) => g.done).length;

  return (
    <div className="space-y-6">
      {/* Where they are */}
      <div className="border-2 border-[#161616] rounded-2xl bg-[#161616] shadow-[6px_6px_0_0_#F5B700] p-7 md:p-9">
        <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#F5B700] mb-3">
          Hundredfold · Window {currentWindow} of 4
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-black text-[#FBF6EA] tracking-tight leading-tight">
          {phase?.title ?? member.business_name ?? 'Your program'}
        </h2>
        {phase?.goal && (
          <p className="mt-3 text-[#FBF6EA]/80 font-body text-base leading-relaxed max-w-2xl">{phase.goal}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <span className="block text-[9px] uppercase tracking-[0.3em] font-mono text-[#FBF6EA]/45 mb-1">
              Cleared
            </span>
            <span className="font-display text-2xl font-black text-[#FBF6EA]">
              {doneCount}
              <span className="text-[#FBF6EA]/40 text-lg">/{gates.length}</span>
            </span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-[0.3em] font-mono text-[#FBF6EA]/45 mb-1">
              Systems live
            </span>
            <span className="font-display text-2xl font-black text-[#FBF6EA]">
              {systems.filter((s) => s.status === 'live').length}
              <span className="text-[#FBF6EA]/40 text-lg">/{systems.length}</span>
            </span>
          </div>
          {member.started_at && (
            <div>
              <span className="block text-[9px] uppercase tracking-[0.3em] font-mono text-[#FBF6EA]/45 mb-1">
                Day
              </span>
              <span className="font-display text-2xl font-black text-[#FBF6EA]">
                {Math.max(1, Math.round((Date.now() - +new Date(member.started_at)) / 86_400_000))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['coach', 'Your coach'],
            ['week', 'This week'],
            ['plan', 'The roadmap'],
            ['offer', 'Your offer'],
            ['build', 'Your arsenal'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 rounded-lg border-2 border-[#161616] text-[10px] uppercase tracking-[0.2em] font-mono font-bold transition-colors ${
              tab === k ? 'bg-[#F5B700]' : 'bg-white hover:bg-[#FFF8E6]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'coach' && (
        <CoachPanel
          firstName={member.name?.split(/\s+/)[0] ?? null}
          windowTitle={phase?.title ?? null}
          gateLabel={gate?.label ?? null}
          onFiled={load}
        />
      )}

      {tab === 'week' && (
        <div className="space-y-4">
          <div className="pop-card p-6 md:p-8">
            <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-5">
              Your moves in this window
            </span>
            {moves.length === 0 && (
              <p className="font-body text-[#161616]/55">
                Nothing listed yet. Sarah sets these after your plan is built.
              </p>
            )}
            <div className="space-y-2">
              {moves.map((g) => (
                <label
                  key={g.id}
                  className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-[#FFFDF6] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={g.done}
                    onChange={() => toggle(g)}
                    className="mt-1 w-4 h-4 accent-[#161616] shrink-0"
                  />
                  <span className="min-w-0">
                    <span className={`block font-body text-sm md:text-base ${g.done ? 'line-through text-[#161616]/45' : ''}`}>
                      {g.label}
                    </span>
                    {g.target && (
                      <span className="block font-mono text-[11px] text-[#161616]/55 mt-0.5">{g.target}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {gate && (
            <div className="pop-card-yellow p-6 md:p-8">
              <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#161616]/70 mb-3">
                The gate to window {Math.min(currentWindow + 1, 4)}
              </span>
              <p className="font-display text-xl md:text-2xl font-black leading-snug">{gate.label}</p>
              {gate.target && <p className="mt-2 font-body text-base text-[#161616]/80">{gate.target}</p>}
              <label className="mt-5 inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gate.done}
                  onChange={() => toggle(gate)}
                  className="w-5 h-5 accent-[#161616]"
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold">
                  {gate.done ? 'Cleared' : 'Mark it cleared'}
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {tab === 'plan' &&
        (member.deep_roadmap ? (
          <RoadmapDocument report={member.deep_roadmap} host={member.host ?? member.business_name ?? ''} />
        ) : (
          <p className="font-body text-[#161616]/55 py-10">
            Your roadmap is being built from your interview. It lands here.
          </p>
        ))}

      {tab === 'offer' &&
        (member.offer ? (
          <div className="space-y-4">
            <div className="pop-card-yellow p-7 md:p-9">
              <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#161616]/70 mb-3">
                What you sell now
              </span>
              <h3 className="font-display text-3xl md:text-4xl font-black tracking-tight">{member.offer.name}</h3>
              <p className="mt-2 font-display italic font-bold text-lg">{member.offer.one_liner}</p>
              <p className="mt-4 font-body text-base leading-relaxed text-[#161616]/85">{member.offer.promise}</p>
              <p className="mt-5 font-display text-2xl font-black">{member.offer.price}</p>
            </div>
            <div className="pop-card p-6 md:p-8">
              <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                Say this on the phone
              </span>
              <p className="font-body text-sm md:text-base leading-relaxed mb-3">{member.offer.call_opening}</p>
              <p className="font-body text-sm md:text-base leading-relaxed font-semibold">{member.offer.close_ask}</p>
            </div>
            <div className="pop-card p-6 md:p-8">
              <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                When they push back
              </span>
              <div className="space-y-4">
                {member.offer.objections.map((o, i) => (
                  <div key={i}>
                    <p className="font-sans font-extrabold text-sm">&ldquo;{o.objection}&rdquo;</p>
                    <p className="text-[#3a3733] font-body text-sm mt-1">{o.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="font-body text-[#161616]/55 py-10">Your offer is being forged. It lands here.</p>
        ))}

      {tab === 'build' && (
        <div className="pop-card p-6 md:p-8">
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-2">
            Your arsenal
          </span>
          <p className="font-body text-sm text-[#161616]/65 mb-5 max-w-2xl leading-relaxed">
            Everything built for this plan. Most of it you can make right here, as often as you want, and put live
            yourself. Anything that spends real money to run waits for your yes, and nothing is charged before you
            give it.
          </p>

          {meter && (
            <div className="mb-6 border-2 border-[#161616] rounded-xl bg-[#FFFDF6] p-4 md:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <span className="text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/55">
                  This cycle&rsquo;s included build work
                </span>
                <span className="font-mono text-[11px] text-[#161616]/55">
                  Resets{' '}
                  {new Date(meter.cycleEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#161616]/10 overflow-hidden border border-[#161616]/20">
                <div
                  className="h-full bg-[#F5B700]"
                  style={{
                    width: `${Math.min(100, Math.round((meter.spentCents / Math.max(1, meter.capCents)) * 100))}%`,
                  }}
                />
              </div>
              <p className="font-body text-sm text-[#161616]/70 mt-2">
                {meter.unreadable ? (
                  <>The meter is not reading right now, so builds are paused for a moment. Nothing was charged.</>
                ) : (
                  <>
                    <strong>{usd(meter.remainingCents)}</strong> of {usd(meter.capCents)} left. Past it, builds queue
                    to next cycle instead of costing you anything.
                  </>
                )}
              </p>
            </div>
          )}

          {systems.length === 0 && (
            <p className="font-body text-[#161616]/55">Your build plan lands here after your roadmap is written.</p>
          )}

          <div className="space-y-3">
            {systems.map((s) => {
              const kind = s.kind ?? '';
              const buildable = SELF_SERVE.has(kind);
              const spends = SPENDS.has(kind);
              const assets = s.assets ?? [];
              const subs = submissions.filter((x) => x.system_id === s.id);
              const working = busy === s.id;

              return (
                <div key={s.id} className="border-2 border-[#161616]/15 rounded-lg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-sans font-extrabold text-sm">
                        <span className="font-mono text-[10px] text-[#161616]/45 mr-2">W{s.window_no}</span>
                        {s.name}
                      </p>
                      {s.summary && <p className="text-[#3a3733] font-body text-sm mt-1">{s.summary}</p>}
                      {s.gives_back && (
                        <p className="text-[#2F7D32] font-body text-xs mt-1.5 font-semibold">
                          Hands back: {s.gives_back}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded border-2 text-[9px] uppercase tracking-[0.18em] font-mono font-bold shrink-0 ${
                        SYSTEM_STYLE[s.status] ?? SYSTEM_STYLE.proposed
                      }`}
                    >
                      {working ? 'building' : s.status}
                    </span>
                  </div>

                  {/* The buttons. Spend waits for a yes; everything else is theirs. */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {spends && !s.approved_at && (
                      <button
                        type="button"
                        onClick={() => void act(s.id, 'approve')}
                        disabled={working}
                        className="px-3 py-1.5 rounded border-2 border-[#161616] bg-[#F5B700] text-[10px] uppercase tracking-[0.18em] font-mono font-bold disabled:opacity-50"
                      >
                        Approve the spend
                      </button>
                    )}
                    {buildable && (
                      <button
                        type="button"
                        onClick={() => void act(s.id, 'build')}
                        disabled={working}
                        className="px-3 py-1.5 rounded border-2 border-[#161616] bg-white text-[10px] uppercase tracking-[0.18em] font-mono font-bold hover:bg-[#F5B700] disabled:opacity-50"
                      >
                        {working ? 'Building…' : assets.length ? 'Build another' : 'Build it'}
                      </button>
                    )}
                    {s.public_slug && s.status === 'live' && (
                      <button
                        type="button"
                        onClick={() => void act(s.id, 'unpublish')}
                        disabled={working}
                        className="px-3 py-1.5 rounded border-2 border-[#161616]/30 bg-white text-[10px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/60 hover:border-[#C4160B] hover:text-[#C4160B] disabled:opacity-50"
                      >
                        Take it down
                      </button>
                    )}
                    {!buildable && !spends && (
                      <span className="text-[11px] font-body text-[#161616]/50 self-center">
                        The studio builds this one by hand. You will watch it move.
                      </span>
                    )}
                  </div>

                  {(says[s.id] || s.error) && (
                    <p className="font-body text-[13px] text-[#161616]/70 mt-2">{says[s.id] || s.error}</p>
                  )}

                  {/* What actually got made. */}
                  {assets.length > 0 && (
                    <div className="mt-4 space-y-3 border-t border-[#161616]/10 pt-4">
                      {assets.map((a, i) => (
                        <div key={`${s.id}-${i}`}>
                          <p className="font-sans font-extrabold text-[13px] mb-1.5">{a.title}</p>

                          {a.kind === 'image' && a.url && (
                            <a href={a.url} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={a.url}
                                alt={a.title}
                                className="rounded-lg border-2 border-[#161616]/15 max-w-full w-full sm:w-80"
                                loading="lazy"
                              />
                            </a>
                          )}

                          {a.kind === 'text' && a.text && (
                            <div>
                              <pre className="whitespace-pre-wrap font-body text-[13px] text-[#3a3733] bg-[#FFFDF6] border border-[#161616]/12 rounded-lg p-3 max-h-72 overflow-y-auto">
                                {a.text}
                              </pre>
                              <button
                                type="button"
                                onClick={() => void copy(`${s.id}-${i}`, a.text!)}
                                className="mt-1.5 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                              >
                                {copied === `${s.id}-${i}` ? 'Copied' : 'Copy it'}
                              </button>
                            </div>
                          )}

                          {(a.kind === 'file' || a.kind === 'page' || a.kind === 'tool') && a.url && (
                            <div>
                              <a
                                href={a.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                              >
                                {a.kind === 'file' ? 'Download it →' : 'Open it live →'}
                              </a>
                              {a.embed && (
                                <div className="mt-2">
                                  <p className="text-[11px] font-body text-[#161616]/55 mb-1">
                                    Paste this anywhere on your own website:
                                  </p>
                                  <code className="block text-[11px] font-mono bg-[#161616] text-[#FBF6EA] rounded-lg p-3 overflow-x-auto">
                                    {a.embed}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => void copy(`${s.id}-embed-${i}`, a.embed!)}
                                    className="mt-1.5 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                                  >
                                    {copied === `${s.id}-embed-${i}` ? 'Copied' : 'Copy the embed'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Real people who used their real tool. */}
                  {subs.length > 0 && (
                    <div className="mt-4 border-t border-[#161616]/10 pt-3">
                      <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#2F7D32] mb-2">
                        {subs.length} came in through this
                      </span>
                      <ul className="space-y-1.5">
                        {subs.slice(0, 6).map((sub) => (
                          <li key={sub.id} className="text-[13px] font-body text-[#161616]/75">
                            <strong className="font-sans font-extrabold">{sub.name ?? 'Someone'}</strong>{' '}
                            {sub.email && <span className="font-mono text-[11px]">{sub.email}</span>}{' '}
                            {sub.phone && <span className="font-mono text-[11px]">{sub.phone}</span>}
                            <span className="text-[#161616]/45">
                              {' '}
                              · {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </li>
                        ))}
                      </ul>
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
