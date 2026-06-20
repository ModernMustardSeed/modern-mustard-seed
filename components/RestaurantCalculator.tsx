'use client';

import { useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';
import { trackLead, metaDedup } from '@/lib/analytics';

// Restaurant-specific missed-call calculator for /for/restaurants. Splits the
// two revenue streams a restaurant actually loses to a ringing phone: everyday
// to-go / pickup / delivery orders (frequent, smaller ticket) and catering /
// large-party jobs (rare, big ticket). Separating them gives an owner an honest,
// recognizable number instead of a generic "average customer value." Doubles as
// the lead magnet: captures the email and sends Sarah the numbers.

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(n)));

const WEEKS_PER_MONTH = 4.33;

export default function RestaurantCalculator() {
  // To-go / pickup / delivery: frequent, smaller ticket.
  const [togoCallsPerWeek, setTogoCallsPerWeek] = useState(20);
  const [togoTicket, setTogoTicket] = useState(35);
  // Catering / large parties: rare, large ticket. Measured per month.
  const [cateringCallsPerMonth, setCateringCallsPerMonth] = useState(4);
  const [cateringTicket, setCateringTicket] = useState(500);
  // Of the calls you miss, the share that would actually have ordered.
  const [bookRate, setBookRate] = useState(65);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const { togoMonthly, cateringMonthly, monthly, annual } = useMemo(() => {
    const rate = bookRate / 100;
    const togoMonthly = togoCallsPerWeek * WEEKS_PER_MONTH * rate * togoTicket;
    const cateringMonthly = cateringCallsPerMonth * rate * cateringTicket;
    const monthly = togoMonthly + cateringMonthly;
    return { togoMonthly, cateringMonthly, monthly, annual: monthly * 12 };
  }, [togoCallsPerWeek, togoTicket, cateringCallsPerMonth, cateringTicket, bookRate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'sending') return;
    setStatus('sending');
    setError(null);
    try {
      const dedup = metaDedup();
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...dedup,
          name: name.trim() || 'Restaurant calculator lead',
          email: email.trim(),
          source: 'restaurant-calculator',
          message:
            `Restaurant missed-call calculator. ` +
            `To-go/pickup/delivery: ~${togoCallsPerWeek} missed calls/week at ${usd(togoTicket)} avg ticket = ${usd(togoMonthly)}/month. ` +
            `Catering/large party: ~${cateringCallsPerMonth} missed calls/month at ${usd(cateringTicket)} avg = ${usd(cateringMonthly)}/month. ` +
            `Assumed ${bookRate}% would have ordered. ` +
            `Estimated total leak ${usd(monthly)}/month (${usd(annual)}/year). Wants a phone agent plan.`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Something went wrong');
      }
      trackLead({ source: 'restaurant-calculator', value: Math.round(monthly), eventId: dedup.metaEventId });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className="pop-card p-7 md:p-10">
      <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-2">
        The restaurant leak calculator
      </span>
      <h2 className="font-display text-2xl md:text-4xl font-black text-[#161616] tracking-tight leading-tight mb-2">
        What are missed calls costing your restaurant?
      </h2>
      <p className="text-[#3a3733] text-sm md:text-base font-body leading-relaxed mb-8 max-w-2xl">
        Two streams ring your phone: everyday to-go orders and the occasional catering job. Set both
        to match your spot and see the real number walking out the door while the line stays busy.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        {/* Inputs */}
        <div className="flex flex-col gap-8">
          {/* To-go stream */}
          <div className="flex flex-col gap-6">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold">
              To-go, pickup & delivery
            </span>
            <Slider
              id="togo-calls"
              label="Missed order calls / week"
              value={togoCallsPerWeek}
              display={String(togoCallsPerWeek)}
              min={0}
              max={150}
              step={1}
              onChange={setTogoCallsPerWeek}
            />
            <Slider
              id="togo-ticket"
              label="Average to-go ticket"
              value={togoTicket}
              display={usd(togoTicket)}
              min={10}
              max={150}
              step={5}
              onChange={setTogoTicket}
            />
          </div>

          {/* Catering stream */}
          <div className="flex flex-col gap-6 pt-6 border-t-2 border-[#161616]/10">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#161616]/45 font-mono font-bold">
              Catering & large parties
            </span>
            <Slider
              id="catering-calls"
              label="Missed catering calls / month"
              value={cateringCallsPerMonth}
              display={String(cateringCallsPerMonth)}
              min={0}
              max={40}
              step={1}
              onChange={setCateringCallsPerMonth}
            />
            <Slider
              id="catering-ticket"
              label="Average catering order"
              value={cateringTicket}
              display={usd(cateringTicket)}
              min={100}
              max={5000}
              step={50}
              onChange={setCateringTicket}
            />
          </div>

          {/* Conversion */}
          <div className="flex flex-col gap-6 pt-6 border-t-2 border-[#161616]/10">
            <Slider
              id="book-rate"
              label="Of missed calls, share that would have ordered"
              value={bookRate}
              display={`${bookRate}%`}
              min={20}
              max={95}
              step={5}
              onChange={setBookRate}
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

          {/* Stream breakdown so they can see exactly where it leaks */}
          <div className="space-y-2.5 border-t border-white/15 pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[#FBF6EA]/65 text-xs font-body">To-go, pickup & delivery</span>
              <span className="font-mono text-sm text-[#FBF6EA] font-semibold">{usd(togoMonthly)}/mo</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[#FBF6EA]/65 text-xs font-body">Catering & large parties</span>
              <span className="font-mono text-sm text-[#FBF6EA] font-semibold">{usd(cateringMonthly)}/mo</span>
            </div>
          </div>
          <p className="text-[#FBF6EA]/60 text-xs font-body leading-relaxed border-t border-white/15 pt-4 mt-4">
            A phone agent answers every one of these, day or night, and fires the order to your POS.
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
              I will send the breakdown and exactly how a phone agent plugs this leak for a restaurant
              like yours. Want to talk it through now?
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
                placeholder="Restaurant name (optional)"
                className="sm:w-52 px-4 py-3.5 rounded-full bg-white border-2 border-[#161616] text-[#161616] placeholder:text-[#161616]/40 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-all"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@restaurant.com"
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

function Slider({
  id,
  label,
  value,
  display,
  min,
  max,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label htmlFor={id} className="text-[11px] uppercase tracking-[0.2em] font-mono font-bold text-[#161616]">
          {label}
        </label>
        <span className="font-display font-black text-xl text-[#161616] whitespace-nowrap">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mms-range w-full"
      />
    </div>
  );
}
