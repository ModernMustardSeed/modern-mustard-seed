'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from './AdminHeader';
import { PATHS } from '@/data/proposal-menu';

/**
 * Log a discovery call. Capture the scope while it is fresh, then hand it
 * straight to the proposal builder (seeded via sessionStorage, the same path
 * the audit handoff uses).
 */
const inp =
  'bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-mustard-500/40 w-full';

export default function CallIntake() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '',
    email: '',
    url: '',
    problem: '',
    outcome: '',
    mustHaves: '',
    outOfScope: '',
    budget: '',
    timeline: '',
    model: 'unsure',
    access: '',
    brand: '',
    other: '',
    pathId: '',
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const buildProposal = () => {
    const host = f.url || f.name || 'the client';
    const situation = [f.problem && `Problem: ${f.problem}`, f.outcome && `Wants: ${f.outcome}`].filter(Boolean).join(' ');
    const notes = [
      `Discovery call notes for ${f.name || host}.`,
      f.problem && `\nProblem / why now:\n${f.problem}`,
      f.outcome && `\nDesired outcome / success:\n${f.outcome}`,
      f.mustHaves && `\nMust-haves (v1):\n${f.mustHaves}`,
      f.outOfScope && `\nOut of scope:\n${f.outOfScope}`,
      f.budget && `\nBudget range: ${f.budget}`,
      f.timeline && `\nTimeline / deadline: ${f.timeline}`,
      f.model && f.model !== 'unsure' && `\nPreferred model: ${f.model}`,
      f.access && `\nAccess / tools / data:\n${f.access}`,
      f.brand && `\nBrand / audience:\n${f.brand}`,
      f.other && `\nOther:\n${f.other}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      sessionStorage.setItem(
        'mms_proposal_seed',
        JSON.stringify({
          name: f.name || undefined,
          email: f.email || undefined,
          url: f.url || undefined,
          situation,
          notes,
          pathId: f.pathId || undefined,
        })
      );
    } catch {
      /* sessionStorage blocked */
    }
    router.push('/admin/proposals');
  };

  const field = (label: string, key: keyof typeof f, opts?: { area?: boolean; placeholder?: string }) => (
    <div>
      <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono block mb-1.5">{label}</label>
      {opts?.area ? (
        <textarea rows={3} value={f[key]} onChange={(e) => set(key, e.target.value)} placeholder={opts?.placeholder} className={`${inp} resize-y`} />
      ) : (
        <input value={f[key]} onChange={(e) => set(key, e.target.value)} placeholder={opts?.placeholder} className={inp} />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <AdminHeader active="call" title="Log a Call" />
      <main className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-white/45 text-sm font-body mb-6 max-w-2xl">
          Capture the scope on the call. When you are done, build the proposal straight from it. Pair this with the discovery call script for the questions to ask.
        </p>

        <div className="space-y-5">
          <div className="glass-card p-5">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-3">Client</span>
            <div className="grid sm:grid-cols-2 gap-3">
              {field('Name', 'name', { placeholder: 'Their name' })}
              {field('Email', 'email', { placeholder: 'their@email.com' })}
              {field('Business / site', 'url', { placeholder: 'theirsite.com' })}
              <div>
                <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono block mb-1.5">Likely path</label>
                <select value={f.pathId} onChange={(e) => set('pathId', e.target.value)} className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustard-500/40 w-full">
                  <option value="" className="bg-neutral-900">Not sure yet</option>
                  {PATHS.map((p) => (
                    <option key={p.id} value={p.id} className="bg-neutral-900">{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 space-y-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block">Discovery</span>
            {field('Problem / why now', 'problem', { area: true })}
            {field('Desired outcome / what success looks like', 'outcome', { area: true })}
            {field('Must-haves for v1', 'mustHaves', { area: true })}
            {field('Out of scope', 'outOfScope', { placeholder: 'What we are explicitly not doing' })}
          </div>

          <div className="glass-card p-5 space-y-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block">Money, timeline, access</span>
            <div className="grid sm:grid-cols-2 gap-3">
              {field('Budget range', 'budget', { placeholder: 'e.g. $5k to $10k' })}
              {field('Timeline / deadline', 'timeline', { placeholder: 'e.g. live by Aug 1' })}
            </div>
            <div>
              <label className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-mono block mb-1.5">Preferred model</label>
              <select value={f.model} onChange={(e) => set('model', e.target.value)} className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustard-500/40 w-full">
                <option value="unsure" className="bg-neutral-900">Unsure</option>
                <option value="one-time build fee" className="bg-neutral-900">One-time build fee</option>
                <option value="monthly subscription" className="bg-neutral-900">Monthly subscription</option>
                <option value="hybrid (setup + monthly)" className="bg-neutral-900">Hybrid (setup + monthly)</option>
              </select>
            </div>
            {field('Access / tools / data notes', 'access', { area: true, placeholder: 'Domain, accounts, CRM, where data lives, who grants access' })}
            {field('Brand / audience notes', 'brand', { area: true })}
            {field('Anything else', 'other', { area: true })}
          </div>

          <button
            onClick={buildProposal}
            className="px-6 py-3 rounded-lg text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#080c16] bg-mustard-400 hover:bg-mustard-300 transition-colors"
          >
            Build proposal from this call →
          </button>
        </div>
      </main>
    </div>
  );
}
