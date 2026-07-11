'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from './AdminHeader';

/**
 * The Team dashboard. Every teammate's ONE identity with their real, live
 * numbers: partner side (code, clicks, sales, earnings) and operator side
 * (dials and demos vs goal). Owners add and manage the team here, no env edits.
 */

type Dial = { dials: number; conversations: number; demos: number };
type Member = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'staff';
  title: string | null;
  active: boolean;
  affiliate_code: string | null;
  rep_name: string | null;
  partner: { code: string | null; clicks: number; sales: number; pendingCents: number; payableCents: number; paidCents: number };
  outbound: null | { repRole: string; dialGoal: number; demoGoal: number; today: Dial; week: Dial; allTime: Dial };
};

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function TeamBoard() {
  const [team, setTeam] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/team');
      const json = await res.json();
      if (res.ok) setTeam(json.team ?? []);
      else setErr(json.error || 'Failed to load');
    } catch {
      setErr('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = team.reduce(
    (a, m) => ({
      pending: a.pending + m.partner.pendingCents + m.partner.payableCents,
      paid: a.paid + m.partner.paidCents,
      weekDials: a.weekDials + (m.outbound?.week.dials ?? 0),
      weekDemos: a.weekDemos + (m.outbound?.week.demos ?? 0),
    }),
    { pending: 0, paid: 0, weekDials: 0, weekDemos: 0 },
  );

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="team" title="Team" />
      <main className="max-w-6xl mx-auto px-5 md:px-6 pt-8 pb-24">
        {/* Hero */}
        <section className="relative bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#F5B700] overflow-hidden mb-6">
          <div className="absolute inset-0 halftone-bg opacity-[0.15]" aria-hidden />
          <div className="relative p-7 md:p-9">
            <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-[#F5B700] font-mono font-bold mb-3">
              <span className="w-6 h-px bg-[#F5B700]" aria-hidden /> The team
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">One family. One login each. Real numbers.</h1>
            <p className="text-[#FBF6EA]/80 font-body mt-3 max-w-2xl text-[15px]">
              Everyone here is a partner and an operator. This is the live scoreboard: what they refer, what they earn, and what they dial. It tracks itself.
            </p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              <HeroStat label="Teammates" value={String(team.length)} />
              <HeroStat label="Owed to partners" value={money(totals.pending)} sub="pending + payable" />
              <HeroStat label="Paid out" value={money(totals.paid)} sub="all time" />
              <HeroStat label="Dials this week" value={String(totals.weekDials)} sub={`${totals.weekDemos} demos booked`} />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold">Roster</span>
          <button
            onClick={() => setShowAdd((s) => !s)}
            className="text-[11px] uppercase tracking-[0.16em] font-sans font-extrabold text-[#161616] px-4 py-2 rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
          >
            {showAdd ? 'Close' : '+ Add teammate'}
          </button>
        </div>

        {showAdd && <AddTeammate onDone={() => { setShowAdd(false); load(); }} />}

        {err && <div className="bg-white border-2 border-[#E0301E] rounded-2xl p-4 mb-4 text-[#E0301E] text-sm font-body">{err}</div>}

        {loading ? (
          <p className="text-center text-[#161616]/45 py-20 font-body italic">Loading the team...</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {team.map((m) => <TeammateCard key={m.id} m={m} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#FBF6EA]/[0.06] border border-[#F5B700]/25 rounded-xl px-4 py-3">
      <div className="text-[9px] uppercase tracking-[0.25em] font-mono text-[#F5B700]/80 font-bold">{label}</div>
      <div className="font-display font-black text-2xl text-[#FBF6EA] leading-tight mt-0.5">{value}</div>
      {sub && <div className="text-[10px] font-mono text-[#FBF6EA]/45 mt-0.5">{sub}</div>}
    </div>
  );
}

function TeammateCard({ m }: { m: Member }) {
  const [copied, setCopied] = useState(false);
  const earned = m.partner.paidCents;
  const owed = m.partner.pendingCents + m.partner.payableCents;
  const copy = () => {
    if (!m.partner.code) return;
    navigator.clipboard?.writeText(`https://modernmustardseed.com/?ref=${m.partner.code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className={`bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 ${m.active ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl font-bold text-[#161616] truncate">{m.name}</h3>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.active ? '#10b981' : '#9ca3af' }} title={m.active ? 'Active' : 'Inactive'} />
          </div>
          <p className="text-[12px] text-[#3A3733] font-body truncate">{m.title || (m.role === 'owner' ? 'Owner' : 'Team')} · {m.email}</p>
        </div>
        <span className={`shrink-0 text-[9px] uppercase tracking-[0.2em] font-mono font-bold px-2.5 py-1 rounded-full border-2 border-[#161616] ${m.role === 'owner' ? 'bg-[#F5B700] text-[#161616]' : 'bg-[#1E50C8] text-[#FBF6EA]'}`}>
          {m.role}
        </span>
      </div>

      {/* Partner side */}
      <div className="bg-[#FFFDF6] border-2 border-[#161616] rounded-xl p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8]">Partner</span>
          {m.partner.code ? (
            <button onClick={copy} className="font-mono text-[12px] font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-3 py-0.5 hover:-translate-y-0.5 transition-transform">
              {copied ? 'Copied ✓' : m.partner.code}
            </button>
          ) : (
            <span className="font-mono text-[11px] text-[#161616]/40">no code</span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Metric label="Clicks" value={String(m.partner.clicks)} />
          <Metric label="Sales" value={String(m.partner.sales)} />
          <Metric label="Owed" value={money(owed)} accent="#E0301E" />
          <Metric label="Earned" value={money(earned)} accent="#10b981" />
        </div>
      </div>

      {/* Operator side */}
      {m.outbound ? (
        <div className="bg-[#FBF6EA] border-2 border-[#161616] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold text-[#E0301E]">Dial floor · {m.outbound.repRole}</span>
            <span className="font-mono text-[10px] text-[#161616]/50">{m.outbound.allTime.dials} dials all time</span>
          </div>
          <div className="space-y-2">
            <GoalBar label="Dials today" value={m.outbound.today.dials} goal={m.outbound.dialGoal} />
            <GoalBar label="Demos today" value={m.outbound.today.demos} goal={m.outbound.demoGoal} accent="#1E50C8" />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-3 border-t border-[#161616]/10">
            <Metric label="Wk dials" value={String(m.outbound.week.dials)} />
            <Metric label="Wk convos" value={String(m.outbound.week.conversations)} />
            <Metric label="Wk demos" value={String(m.outbound.week.demos)} />
          </div>
        </div>
      ) : (
        <div className="bg-[#FBF6EA] border-2 border-dashed border-[#161616]/25 rounded-xl p-4 text-center text-[12px] text-[#161616]/45 font-body">
          Not on the dial floor
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent = '#161616' }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <div className="font-display font-black text-lg leading-none" style={{ color: accent }}>{value}</div>
      <div className="text-[8.5px] uppercase tracking-[0.15em] font-mono text-[#161616]/50 mt-1">{label}</div>
    </div>
  );
}

function GoalBar({ label, value, goal, accent = '#F5B700' }: { label: string; value: number; goal: number; accent?: string }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : value > 0 ? 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
        <span className="text-[#161616]/60">{label}</span>
        <span className="text-[#161616] font-bold">{value}{goal > 0 ? ` / ${goal}` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-[#161616]/10 border border-[#161616]/10 overflow-hidden">
        <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: accent }} />
      </div>
    </div>
  );
}

function AddTeammate({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ name: '', email: '', role: 'staff', title: '', password: '', affiliateCode: '', repName: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/admin/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await res.json();
      if (!res.ok) setError(j.error || 'Failed');
      else onDone();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };
  const input = 'w-full bg-white border-2 border-[#161616] rounded-lg px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 mb-5">
      <h3 className="font-display text-lg font-bold mb-1">Add a teammate</h3>
      <p className="text-[12px] text-[#3A3733] font-body mb-4">One identity: their login, partner code, and dial-floor rep, wired in one go. No env edits.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input className={input} placeholder="Full name" value={f.name} onChange={set('name')} />
        <input className={input} placeholder="Login email" value={f.email} onChange={set('email')} />
        <input className={input} placeholder="Title (e.g. Partner + Caller)" value={f.title} onChange={set('title')} />
        <select className={input} value={f.role} onChange={set('role')}>
          <option value="staff">Staff (scoped)</option>
          <option value="owner">Owner (full access)</option>
        </select>
        <input className={input} placeholder="Temp password (min 6)" value={f.password} onChange={set('password')} />
        <input className={input} placeholder="Partner code (e.g. JORDAN)" value={f.affiliateCode} onChange={set('affiliateCode')} />
        <input className={input} placeholder="Dial-floor rep name (e.g. Jordan)" value={f.repName} onChange={set('repName')} />
      </div>
      {error && <p className="text-[#E0301E] text-xs font-body mt-3">{error}</p>}
      <button onClick={submit} disabled={saving} className="mt-4 px-6 py-2.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-50">
        {saving ? 'Saving...' : 'Add teammate'}
      </button>
    </div>
  );
}
