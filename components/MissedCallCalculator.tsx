'use client';

import { useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';

// The signature interactive moment for the voice-agents page. A live
// missed-call revenue calculator that doubles as the lead magnet: it shows
// the visitor exactly what the leak is worth, then captures the email and
// sends Sarah a qualified lead with the numbers attached.

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

export default function MissedCallCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(10);
  const [avgValue, setAvgValue] = useState(500);
  const [closeRate, setCloseRate] = useState(35);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { leadsPerMonth, monthly, annual } = useMemo(() => {
    const leadsPerMonth = missedPerWeek * 4.33;
    const recovered = leadsPerMonth * (closeRate / 100);
    const monthly = recovered * avgValue;
    return { leadsPerMonth, monthly, annual: monthly * 12 };
  }, [missedPerWeek, avgValue, closeRate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Voice agent calculator lead',
          email: email.trim(),
          source: 'voice-agents-calculator',
          message:
            `Missed-call calculator result. Misses ~${Math.round(leadsPerMonth)} calls/month, ` +
            `average customer value ${usd(avgValue)}, close rate ${closeRate}%. ` +
            `Estimated leak ${usd(monthly)}/month (${usd(annual)}/year). ` +
            `Wants a voice agent plan to plug the leak.`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Something went wrong');
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="pop-card p-7 md:p-10">
      <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">
        The leak calculator
      </span>
      <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight leading-tight mb-2">
        What are missed calls costing you?
      </h2>
      <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed mb-8 max-w-2xl">
        Slide the numbers to match your business. This is the revenue walking out the door while the
        phone rings out.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Inputs */}
        <div className="flex flex-col gap-7">
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="missed" className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
                Calls you miss / week
              </label>
              <span className="font-display font-black text-xl text-[#161616]">{missedPerWeek}</span>
            </div>
            <input
              id="missed"
              type="range"
              min={1}
              max={100}
              value={missedPerWeek}
              onChange={(e) => setMissedPerWeek(Number(e.target.value))}
              className="mms-range w-full"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="value" className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
                Average customer value
              </label>
              <span className="font-display font-black text-xl text-[#161616]">{usd(avgValue)}</span>
            </div>
            <input
              id="value"
              type="range"
              min={50}
              max={10000}
              step={50}
              value={avgValue}
              onChange={(e) => setAvgValue(Number(e.target.value))}
              className="mms-range w-full"
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label htmlFor="close" className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
                Close rate on answered calls
              </label>
              <span className="font-display font-black text-xl text-[#161616]">{closeRate}%</span>
            </div>
            <input
              id="close"
              type="range"
              min={5}
              max={90}
              value={closeRate}
              onChange={(e) => setCloseRate(Number(e.target.value))}
              className="mms-range w-full"
            />
          </div>
        </div>

        {/* Result */}
        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-7 md:p-8 shadow-[5px_5px_0_0_#F5B700]">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold block mb-3">
            Estimated leak
          </span>
          <div className="mb-1">
            <span className="font-display text-4xl md:text-5xl font-black text-[#F5B700] leading-none tracking-tight">
              {usd(monthly)}
            </span>
            <span className="font-mono text-sm text-[#FBF6EA]/70 ml-2">/ month</span>
          </div>
          <div className="mb-6">
            <span className="font-display text-2xl md:text-3xl font-black text-white leading-none tracking-tight">
              {usd(annual)}
            </span>
            <span className="font-mono text-sm text-[#FBF6EA]/70 ml-2">/ year</span>
          </div>
          <p className="text-[#FBF6EA]/65 text-xs font-body leading-relaxed border-t border-white/15 pt-4">
            Based on ~{Math.round(leadsPerMonth)} missed calls a month at a {closeRate}% close rate. A
            voice agent answers them all, day or night.
          </p>
        </div>
      </div>

      {/* Lead capture */}
      <div className="mt-8 pt-8 border-t-2 border-[#161616]/10">
        {status === 'done' ? (
          <div className="rounded-2xl border-2 border-[#161616] bg-[#FFF3CC] p-7 text-center">
            <p className="font-display text-xl md:text-2xl font-black text-[#161616] mb-2">
              Sent. Check your inbox.
            </p>
            <p className="text-[#3a3733] text-sm md:text-base font-body mb-5 max-w-md mx-auto">
              I will send the breakdown and exactly how a voice agent plugs this leak. Want to talk it
              through now?
            </p>
            <Link
              href="/book"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Book a 30-min call
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <p className="font-display text-lg md:text-xl font-black text-[#161616] leading-snug">
              Want this as a plan? I will send the breakdown plus how to plug the leak.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name (optional)"
                className="sm:w-44 px-4 py-3.5 rounded-full bg-white border-2 border-[#161616] text-[#161616] placeholder:text-[#161616]/40 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-all"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                className="flex-1 px-4 py-3.5 rounded-full bg-white border-2 border-[#161616] text-[#161616] placeholder:text-[#161616]/40 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-all"
              />
              <button
                type="submit"
                disabled={status === 'sending' || !email.trim()}
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 whitespace-nowrap"
              >
                {status === 'sending' ? 'Sending…' : 'Send my number →'}
              </button>
            </div>
            {error && <p className="text-[#E0301E] text-xs font-mono">{error}</p>}
            <p className="text-[#161616]/45 text-[11px] font-body">
              No spam. One reply from a real person. Unsubscribe anytime.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
