'use client';

/**
 * The Ad Budget Planner: the /ads interactive tool and lead magnet. Turns
 * industry + daily budget + average job value into an honest planning range
 * (labeled estimates, never promises), then emails the plan via
 * /api/ads/plan. Client math mirrors the server so the email matches the
 * screen.
 */

import { FormEvent, useMemo, useState } from 'react';
import Reveal from '@/components/mustard-mode/Reveal';
import { plannerVerticals, getPlannerVertical } from '@/data/ads';

export default function AdBudgetPlanner() {
  const [verticalId, setVerticalId] = useState('landscaping');
  const [daily, setDaily] = useState(15);
  const [jobValue, setJobValue] = useState(getPlannerVertical('landscaping').defaultJobUsd);
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const v = getPlannerVertical(verticalId);

  const plan = useMemo(() => {
    const monthly = daily * 30;
    const leadsLow = Math.max(1, Math.floor(monthly / v.cplHigh));
    const leadsHigh = Math.max(leadsLow, Math.round(monthly / v.cplLow));
    const closedLow = Math.max(1, Math.round(leadsLow / 3));
    const closedHigh = Math.max(closedLow, Math.round(leadsHigh / 3));
    const breakEvenJobs = Math.max(1, Math.ceil((monthly + 297) / jobValue));
    return { monthly, leadsLow, leadsHigh, closedLow, closedHigh, breakEvenJobs };
  }, [daily, jobValue, v]);

  const pickVertical = (id: string) => {
    setVerticalId(id);
    setJobValue(getPlannerVertical(id).defaultJobUsd);
  };

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes('@') || state === 'sending') return;
    setState('sending');
    try {
      const honeypot = (new FormData(e.currentTarget).get('company') as string) || '';
      const res = await fetch('/api/ads/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, vertical: verticalId, dailyBudget: daily, jobValue, company: honeypot }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <section id="planner" className="py-16 md:py-24 halftone-bg border-b-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10">
          <Reveal variant="eyebrow">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">[ THE AD BUDGET PLANNER ]</p>
          </Reveal>
          <Reveal variant="slam">
            <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              What should you actually spend?
            </h2>
          </Reveal>
          <Reveal variant="rise" delay={100}>
            <p className="font-body text-[#161616]/70 max-w-2xl mx-auto mt-4">
              Honest planning ranges from typical local campaigns. Estimates, not promises: anyone promising exact results is selling you something.
            </p>
          </Reveal>
        </div>

        <Reveal variant="rise" delay={140}>
          <div className="grid lg:grid-cols-2 gap-6 max-w-4xl mx-auto items-start">
            {/* Controls */}
            <div className="rounded-2xl bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-6 md:p-7">
              <label className="block">
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/70 font-bold">Your Trade</span>
                <select
                  value={verticalId}
                  onChange={(e) => pickVertical(e.target.value)}
                  className="mt-2 w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2.5 font-body text-sm text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                >
                  {plannerVerticals.map((pv) => (
                    <option key={pv.id} value={pv.id}>
                      {pv.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block mt-6">
                <span className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/70 font-bold">Daily Budget</span>
                  <span className="font-display text-2xl font-black text-[#161616]">${daily}/day</span>
                </span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={daily}
                  onChange={(e) => setDaily(Number(e.target.value))}
                  className="mt-2 w-full accent-[#F5B700]"
                />
                <span className="flex justify-between font-mono text-[10px] text-[#161616]/50">
                  <span>$5</span>
                  <span>$100</span>
                </span>
              </label>

              <label className="block mt-6">
                <span className="flex items-baseline justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/70 font-bold">Average Customer Value</span>
                  <span className="font-display text-2xl font-black text-[#161616]">${jobValue.toLocaleString()}</span>
                </span>
                <input
                  type="range"
                  min={25}
                  max={10000}
                  step={25}
                  value={Math.min(jobValue, 10000)}
                  onChange={(e) => setJobValue(Number(e.target.value))}
                  className="mt-2 w-full accent-[#F5B700]"
                />
                <span className="flex justify-between font-mono text-[10px] text-[#161616]/50">
                  <span>$25</span>
                  <span>$10,000</span>
                </span>
              </label>
            </div>

            {/* The receipt */}
            <div className="rounded-2xl bg-[#161616] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-6 md:p-7 lg:rotate-[0.5deg]">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Your Starting Plan</p>
              <dl className="mt-4 space-y-3 font-mono text-sm text-[#FBF6EA]">
                <div className="flex justify-between gap-4 border-b border-dashed border-[#FBF6EA]/25 pb-2">
                  <dt className="text-[#FBF6EA]/65">Monthly ad spend (your card)</dt>
                  <dd className="font-bold">${plan.monthly.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-dashed border-[#FBF6EA]/25 pb-2">
                  <dt className="text-[#FBF6EA]/65">Typical cost per lead</dt>
                  <dd className="font-bold">${v.cplLow} to ${v.cplHigh}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-dashed border-[#FBF6EA]/25 pb-2">
                  <dt className="text-[#FBF6EA]/65">Estimated inquiries / month</dt>
                  <dd className="font-bold">{plan.leadsLow} to {plan.leadsHigh}</dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-dashed border-[#FBF6EA]/25 pb-2">
                  <dt className="text-[#FBF6EA]/65">New customers (close 1 in 3)</dt>
                  <dd className="font-bold">{plan.closedLow} to {plan.closedHigh}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#FBF6EA]/65">Jobs to cover ads + ON AIR</dt>
                  <dd className="font-bold text-[#F5B700]">
                    {plan.breakEvenJobs} {plan.breakEvenJobs === 1 ? 'job' : 'jobs'}
                  </dd>
                </div>
              </dl>

              {state === 'sent' ? (
                <p className="mt-6 rounded-lg bg-[#F5B700] border-2 border-[#F5B700] px-4 py-3 font-sans font-bold text-sm text-[#161616]">
                  Sent. Your plan is in your inbox (Sarah reads replies personally).
                </p>
              ) : (
                <form onSubmit={send} className="mt-6">
                  <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/60">Email me this plan</span>
                    <div className="flex gap-2 mt-2">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourbusiness.com"
                        className="flex-1 min-w-0 rounded-lg border-2 border-[#FBF6EA]/30 bg-[#FBF6EA] px-3 py-2.5 font-body text-sm text-[#161616] placeholder:text-[#161616]/40 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
                      />
                      <button
                        type="submit"
                        disabled={state === 'sending'}
                        className="shrink-0 rounded-lg bg-[#F5B700] border-2 border-[#F5B700] px-4 py-2.5 font-sans font-extrabold text-xs uppercase tracking-[0.14em] text-[#161616] transition-all hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        {state === 'sending' ? 'Sending…' : 'Send It'}
                      </button>
                    </div>
                  </label>
                  {state === 'error' && (
                    <p role="alert" className="mt-2 font-body text-xs text-[#FF8550] font-bold">
                      That did not send. Try again, or email sarah@modernmustardseed.com.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
