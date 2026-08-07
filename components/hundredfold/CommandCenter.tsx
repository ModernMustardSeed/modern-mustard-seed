'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import RoadmapDocument from '@/components/RoadmapDocument';
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

type SystemRow = {
  id: string;
  name: string;
  window_no: number | null;
  summary: string | null;
  status: string;
  gives_back: string | null;
  url: string | null;
};

type Tab = 'week' | 'plan' | 'offer' | 'build';

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
  const [tab, setTab] = useState<Tab>('week');

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
            ['week', 'This week'],
            ['plan', 'The roadmap'],
            ['offer', 'Your offer'],
            ['build', 'What we are building'],
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
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-5">
            The machines
          </span>
          {systems.length === 0 && (
            <p className="font-body text-[#161616]/55">Your build plan lands here after your roadmap is written.</p>
          )}
          <div className="space-y-3">
            {systems.map((s) => (
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
                    {s.url && s.status === 'live' && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-2 text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                      >
                        Open it →
                      </a>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded border-2 text-[9px] uppercase tracking-[0.18em] font-mono font-bold shrink-0 ${
                      SYSTEM_STYLE[s.status] ?? SYSTEM_STYLE.proposed
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
