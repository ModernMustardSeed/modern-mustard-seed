'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import RoadmapDocument from '@/components/RoadmapDocument';
import type { RoadmapReport } from '@/lib/roadmap-shape';
import { MEMBER_STATUSES, SYSTEM_STATUSES } from '@/lib/hundredfold';

/**
 * One member, everything about them, and the three buttons that turn their
 * interview into a plan.
 *
 * The steps are separate on purpose: the whole synthesis is six to eleven
 * minutes of high-effort model calls, which no single request survives, and a
 * failure in step three should not cost step two.
 */

type Member = {
  id: string;
  email: string;
  name: string | null;
  business_name: string | null;
  host: string | null;
  phone: string | null;
  status: string;
  roadmap_slug: string | null;
  deep_roadmap: RoadmapReport | null;
  offer: Offer | null;
  notes: string | null;
  created_at: string;
};

type Offer = {
  name: string;
  one_liner: string;
  promise: string;
  price: string;
  price_logic: string;
  guarantee: string;
  urgency: string;
  headline: string;
  subhead: string;
  call_opening: string;
  close_ask: string;
  stack: { item: string; value: string; why: string }[];
  ladder: Record<string, string>;
  proof_to_build: string[];
  objections: { objection: string; answer: string }[];
};

type Interview = {
  id: string;
  channel: string;
  status: string;
  transcript: { role: string; text: string }[];
  answers: Record<string, string>;
  duration_seconds: number | null;
  created_at: string;
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
  kind: string | null;
  summary: string | null;
  status: string;
  gives_back: string | null;
  url: string | null;
};

type Tab = 'plan' | 'offer' | 'build' | 'interview';

const STEPS = [
  { key: 'answers', label: 'Read the answers', note: 'about a minute' },
  { key: 'roadmap', label: 'Build the roadmap', note: 'three to five minutes' },
  { key: 'offer', label: 'Build the offer', note: 'three to five minutes' },
] as const;

export default function HundredfoldMember({ id }: { id: string }) {
  const [member, setMember] = useState<Member | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [coverage, setCoverage] = useState<{ answered: number; total: number; enough: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>('plan');
  const [running, setRunning] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/admin/hundredfold/${id}`);
    const data = await res.json();
    if (!data.ok) return;
    setMember(data.member);
    setInterviews(data.interviews ?? []);
    setGates(data.gates ?? []);
    setSystems(data.systems ?? []);
    setCoverage(data.coverage ?? null);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const runStep = async (step: string) => {
    if (running) return;
    setRunning(step);
    setError(null);
    setNote(`Running: ${STEPS.find((s) => s.key === step)?.label}. Leave this tab open.`);
    try {
      const res = await fetch(`/api/admin/hundredfold/${id}/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'step failed');
      setNote(`Done: ${step}.`);
      await load();
    } catch (err) {
      setNote(null);
      setError(err instanceof Error ? err.message : 'step failed');
    } finally {
      setRunning(null);
    }
  };

  const patch = async (body: Record<string, unknown>) => {
    await fetch(`/api/admin/hundredfold/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-[#FBF6EA]">
        <AdminHeader active="hundredfold" title="Hundredfold" />
        <p className="max-w-7xl mx-auto px-8 py-16 font-body text-[#161616]/50">Loading…</p>
      </div>
    );
  }

  const latest = interviews.find((i) => i.status === 'complete') ?? interviews[0] ?? null;
  const windows = [1, 2, 3, 4];

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="hundredfold" title="Hundredfold" />

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-8 md:py-10">
        <Link
          href="/admin/hundredfold"
          className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
        >
          ← All members
        </Link>

        <header className="mt-4 mb-7 flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
              {member.business_name || member.name || member.email}
            </h1>
            <p className="mt-1.5 text-[#161616]/65 font-body text-sm">
              {member.name && <span>{member.name} · </span>}
              <a href={`mailto:${member.email}`} className="text-[#1E50C8] hover:underline">
                {member.email}
              </a>
              {member.phone && <span> · {member.phone}</span>}
              {member.roadmap_slug && (
                <>
                  {' · '}
                  <Link
                    href={`/scaling-roadmap/r/${member.roadmap_slug}`}
                    target="_blank"
                    className="text-[#1E50C8] hover:underline"
                  >
                    free roadmap
                  </Link>
                </>
              )}
            </p>
          </div>
          <select
            value={member.status}
            onChange={(e) => patch({ status: e.target.value })}
            className="border-2 border-[#161616] rounded-lg px-4 py-2.5 font-mono text-xs uppercase tracking-[0.15em] font-bold bg-white"
          >
            {MEMBER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </header>

        {/* The three steps */}
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 mb-7">
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
            Build their plan
          </span>
          {coverage && (
            <p className="mb-4 font-body text-sm text-[#161616]/70">
              {coverage.answered} of {coverage.total} questions answered.{' '}
              {coverage.enough ? 'Enough to build on.' : 'Thin. Consider finishing the interview first.'}
            </p>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            {STEPS.map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={Boolean(running) || !latest}
                onClick={() => runStep(s.key)}
                className="px-4 py-3.5 text-left border-2 border-[#161616] rounded-lg bg-[#FBF6EA] hover:bg-[#FFF8E6] disabled:opacity-40 transition-colors"
              >
                <span className="block font-sans font-extrabold text-sm">
                  {running === s.key ? 'Running…' : s.label}
                </span>
                <span className="block text-[10px] font-mono text-[#161616]/50 mt-0.5">{s.note}</span>
              </button>
            ))}
          </div>
          {note && <p className="mt-4 font-body text-sm text-[#1E50C8] font-semibold">{note}</p>}
          {error && <p className="mt-4 font-body text-sm text-[#C4160B] font-semibold">{error}</p>}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(
            [
              ['plan', 'The roadmap'],
              ['offer', 'The offer'],
              ['build', 'Build and gates'],
              ['interview', 'The interview'],
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

        {tab === 'plan' &&
          (member.deep_roadmap ? (
            <RoadmapDocument
              report={member.deep_roadmap}
              host={member.host ?? member.business_name ?? ''}
              generatedAt={member.created_at}
            />
          ) : (
            <p className="font-body text-[#161616]/55 py-10">
              No roadmap yet. Run the answers step, then the roadmap step.
            </p>
          ))}

        {tab === 'offer' &&
          (member.offer ? (
            <div className="space-y-4">
              <div className="pop-card-yellow p-7 md:p-9">
                <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#161616]/70 mb-3">
                  The offer
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight">{member.offer.name}</h2>
                <p className="mt-2 font-display italic font-bold text-lg">{member.offer.one_liner}</p>
                <p className="mt-4 font-body text-base leading-relaxed text-[#161616]/85">{member.offer.promise}</p>
                <p className="mt-5 font-display text-2xl font-black">{member.offer.price}</p>
                <p className="mt-2 font-body text-sm text-[#161616]/80 leading-relaxed">{member.offer.price_logic}</p>
              </div>

              <div className="pop-card p-6 md:p-8">
                <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                  The stack
                </span>
                <div className="divide-y divide-[#161616]/10">
                  {member.offer.stack.map((s, i) => (
                    <div key={i} className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans font-extrabold text-sm">{s.item}</p>
                        <p className="text-[#3a3733] font-body text-sm mt-0.5">{s.why}</p>
                      </div>
                      <span className="font-display font-black shrink-0">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="pop-card p-6">
                  <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-3">
                    Guarantee
                  </span>
                  <p className="font-body text-sm leading-relaxed">{member.offer.guarantee}</p>
                </div>
                <div className="pop-card p-6">
                  <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-3">
                    Why now
                  </span>
                  <p className="font-body text-sm leading-relaxed">{member.offer.urgency}</p>
                </div>
              </div>

              <div className="pop-card p-6 md:p-8">
                <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                  On the phone
                </span>
                <p className="font-body text-sm leading-relaxed mb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 mr-2">Open</span>
                  {member.offer.call_opening}
                </p>
                <p className="font-body text-sm leading-relaxed mb-5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 mr-2">Ask</span>
                  {member.offer.close_ask}
                </p>
                <div className="space-y-3 pt-4 border-t border-[#161616]/10">
                  {member.offer.objections.map((o, i) => (
                    <div key={i}>
                      <p className="font-sans font-extrabold text-sm">&ldquo;{o.objection}&rdquo;</p>
                      <p className="text-[#3a3733] font-body text-sm mt-0.5">{o.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="font-body text-[#161616]/55 py-10">No offer yet. Run the offer step.</p>
          ))}

        {tab === 'build' && (
          <div className="space-y-6">
            <div className="pop-card p-6 md:p-8">
              <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                What we build
              </span>
              {systems.length === 0 && <p className="font-body text-[#161616]/55">Nothing planned yet.</p>}
              <div className="space-y-3">
                {systems.map((s) => (
                  <div key={s.id} className="border-2 border-[#161616]/20 rounded-lg p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sans font-extrabold text-sm">
                          <span className="font-mono text-[10px] text-[#161616]/45 mr-2">W{s.window_no}</span>
                          {s.name}
                        </p>
                        <p className="text-[#3a3733] font-body text-sm mt-1">{s.summary}</p>
                        {s.gives_back && (
                          <p className="text-[#2F7D32] font-body text-xs mt-1.5 font-semibold">
                            Gives back: {s.gives_back}
                          </p>
                        )}
                      </div>
                      <select
                        value={s.status}
                        onChange={(e) => patch({ action: 'system', systemId: s.id, systemStatus: e.target.value })}
                        className="border-2 border-[#161616] rounded px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] font-bold bg-white shrink-0"
                      >
                        {SYSTEM_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {windows.map((w) => {
              const rows = gates.filter((g) => g.window_no === w);
              if (!rows.length) return null;
              return (
                <div key={w} className="pop-card p-6 md:p-8">
                  <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                    Window {w}
                  </span>
                  <div className="space-y-2.5">
                    {rows.map((g) => (
                      <label
                        key={g.id}
                        className={`flex items-start gap-3 cursor-pointer p-3 rounded-lg border-2 ${
                          g.kind === 'gate' ? 'border-[#F5B700] bg-[#FFF8E6]' : 'border-transparent hover:bg-[#FFFDF6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={g.done}
                          onChange={(e) => patch({ action: 'gate', gateId: g.id, done: e.target.checked })}
                          className="mt-1 w-4 h-4 accent-[#161616] shrink-0"
                        />
                        <span className="min-w-0">
                          <span className={`block font-body text-sm ${g.done ? 'line-through text-[#161616]/45' : ''}`}>
                            {g.kind === 'gate' && (
                              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#8f6600] mr-2">
                                Gate
                              </span>
                            )}
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
              );
            })}
          </div>
        )}

        {tab === 'interview' && (
          <div className="space-y-4">
            {!latest && <p className="font-body text-[#161616]/55 py-10">No interview yet.</p>}
            {latest && (
              <>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/55">
                  {latest.channel} · {latest.status} ·{' '}
                  {latest.duration_seconds ? `${Math.round(latest.duration_seconds / 60)} min` : 'no duration'} ·{' '}
                  {latest.transcript?.filter((t) => t.role === 'owner').length ?? 0} answers
                </p>
                {Object.keys(latest.answers ?? {}).length > 0 && (
                  <div className="pop-card p-6 md:p-8">
                    <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                      Filed answers
                    </span>
                    <div className="space-y-3">
                      {Object.entries(latest.answers).map(([k, v]) => (
                        <div key={k}>
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/45">{k}</p>
                          <p className="font-body text-sm mt-0.5">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pop-card p-6 md:p-8">
                  <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
                    Transcript
                  </span>
                  <div className="space-y-3">
                    {(latest.transcript ?? []).map((t, i) => (
                      <p key={i} className="font-body text-sm leading-relaxed">
                        <span
                          className={`font-mono text-[10px] uppercase tracking-[0.18em] mr-2 ${
                            t.role === 'coach' ? 'text-[#8f6600]' : 'text-[#1E50C8]'
                          }`}
                        >
                          {t.role === 'coach' ? 'Mustard' : 'Owner'}
                        </span>
                        {t.text}
                      </p>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
