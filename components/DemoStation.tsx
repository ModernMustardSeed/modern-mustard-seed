'use client';

import { useState } from 'react';
import { track } from '@vercel/analytics';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';

/**
 * The self-serve Demo Station form + the forge sequence. Signature moment:
 * on submit the station "forges" in front of them (staged status lines with
 * the mascot hammering away), then walks them straight into their hub.
 */

const NICHE_OPTIONS = [
  { value: 'home_service', label: 'Home services (roofing, plumbing, HVAC...)' },
  { value: 'restaurant', label: 'Restaurant / food' },
  { value: 'dental_medspa', label: 'Dental / medical / medspa' },
  { value: 'real_estate', label: 'Real estate' },
  { value: 'other', label: 'Something else' },
];

const FORGE_LINES = [
  'Hiring your receptionist...',
  'Teaching her your business...',
  'Wiring your command center...',
  'Briefing the designer on your website...',
  'Opening your hub...',
];

export default function DemoStation() {
  const [values, setValues] = useState<Record<string, string>>({ niche: 'home_service' });
  const [phase, setPhase] = useState<'form' | 'forging' | 'error'>('form');
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'forging') return;
    setPhase('forging');
    setError(null);
    setLine(0);
    track('station_submit', { niche: values.niche || 'other' });

    const ticker = window.setInterval(() => setLine((l) => Math.min(l + 1, FORGE_LINES.length - 1)), 1600);
    try {
      const res = await fetch('/api/demo-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = (await res.json()) as { url?: string; message?: string; returning?: boolean };
      if (!res.ok || !json.url) throw new Error(json.message || 'The forge hiccuped. Try again in a minute.');
      track('station_forged', { returning: String(Boolean(json.returning)) });
      // Let the sequence land its last line before the reveal.
      window.setTimeout(() => {
        window.location.href = json.url as string;
      }, 900);
    } catch (err) {
      window.clearInterval(ticker);
      setPhase('error');
      setError(err instanceof Error ? err.message : 'The forge hiccuped. Try again in a minute.');
    }
  }

  if (phase === 'forging') {
    return (
      <div className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#B58A2A] p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mascot.png" alt="" width={84} height={84} className="mx-auto animate-[stationHammer_.9s_ease-in-out_infinite]" />
        <style>{`@keyframes stationHammer{0%,100%{transform:rotate(-6deg) translateY(0)}50%{transform:rotate(6deg) translateY(-6px)}}`}</style>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mt-5">The forge is hot</p>
        <div className="mt-4 space-y-2 text-left max-w-sm mx-auto">
          {FORGE_LINES.map((l, i) => (
            <p
              key={l}
              className={`font-mono text-[13px] transition-opacity ${i < line ? 'text-[#FBF6EA]/45' : i === line ? 'text-[#FBF6EA]' : 'text-[#FBF6EA]/15'}`}
            >
              {i < line ? '✓' : i === line ? '▸' : '·'} {l}
            </p>
          ))}
        </div>
        <p className="font-body text-[13px] text-[#FBF6EA]/55 mt-5">Twenty seconds, give or take. Do not close the tab.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-6 sm:p-8">
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { k: 'business', label: 'Business name', ph: 'Rico Roofing', required: true },
          { k: 'name', label: 'Your name', ph: 'Rico Alvarez', required: true },
          { k: 'email', label: 'Email', ph: 'rico@gmail.com', required: true, type: 'email' },
          { k: 'phone', label: 'Business phone', ph: '(406) 555-0123', required: true, type: 'tel' },
          { k: 'city', label: 'City', ph: 'Kalispell' },
          { k: 'state', label: 'State', ph: 'MT' },
        ].map((f) => (
          <label key={f.k} className="block">
            <span className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616]">
              {f.label}
              {f.required ? <span className="text-[#E0301E]"> *</span> : null}
            </span>
            <input
              type={f.type || 'text'}
              required={f.required}
              value={values[f.k] || ''}
              onChange={set(f.k)}
              placeholder={f.ph}
              className="mt-1.5 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
            />
          </label>
        ))}
        <label className="block">
          <span className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616]">What kind of business?</span>
          <select
            value={values.niche}
            onChange={set('niche')}
            className="mt-1.5 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
          >
            {NICHE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-sans text-[11px] uppercase tracking-[0.14em] font-bold text-[#161616]">Current website (if any)</span>
          <input
            type="text"
            value={values.website || ''}
            onChange={set('website')}
            placeholder="ricoroofing.com (or leave blank)"
            className="mt-1.5 w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[14px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
          />
        </label>
        {/* Honeypot: humans never see it. */}
        <input type="text" tabIndex={-1} autoComplete="off" value={values.company_url || ''} onChange={set('company_url')} className="hidden" aria-hidden />
      </div>
      <button
        type="submit"
        className="mt-6 w-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-7 py-4 font-sans font-bold uppercase tracking-[0.1em] text-sm shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-transform"
      >
        Forge my three demos, free →
      </button>
      {phase === 'error' && error ? <p className="font-body text-[13px] text-[#E0301E] text-center mt-3">{error}</p> : null}
      <p className="font-body text-[12px] text-[#161616]/50 text-center mt-3">
        No card, no meeting, no strings. If you love them:{' '}
        {formatUsd(DEMO_PRODUCTS.site.monthlyCents)}-{formatUsd(DEMO_PRODUCTS.voice.monthlyCents)}/mo per piece or{' '}
        {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo for everything, month to month.
      </p>
    </form>
  );
}
