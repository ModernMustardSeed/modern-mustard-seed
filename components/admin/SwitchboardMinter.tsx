'use client';

import { useMemo, useState } from 'react';
import { quoteFor, usd, BUILD_FEE_USD, PRICE_TIERS } from '@/data/switchboard';

/**
 * Mint a Switchboard franchise proposal in one click: enter the brand and its
 * location count, get the exact per-location quote, a copyable proposal, and a
 * live Stripe checkout link to send. Admin-only (middleware gates /admin/*).
 */
export default function SwitchboardMinter() {
  const [business, setBusiness] = useState('');
  const [email, setEmail] = useState('');
  const [locations, setLocations] = useState(12);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'proposal' | null>(null);

  const q = useMemo(() => quoteFor(locations), [locations]);

  const proposalText = useMemo(() => {
    const b = business.trim() || 'your brand';
    return [
      `The Switchboard, for ${b}`,
      ``,
      `${locations} locations at ${usd(q.perLocationUsd)}/location/month`,
      `Monthly: ${usd(q.monthlyUsd)}  (${usd(q.annualUsd)}/year)`,
      `One-time franchise build: ${usd(q.buildUsd)}`,
      `First invoice: ${usd(q.firstInvoiceUsd)} (build + first month)`,
      ``,
      `Every location gets a 24/7 AI concierge in your brand voice, one master number that routes,`,
      `and one Command Board that rolls up the recovered revenue across all ${locations} locations.`,
    ].join('\n');
  }, [business, locations, q]);

  const createLink = async () => {
    setLoading(true);
    setError(null);
    setLink(null);
    try {
      const res = await fetch('/api/switchboard/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locations, business, email }),
      });
      const data = await res.json();
      if (res.ok && data.url) setLink(data.url as string);
      else setError(data.message || 'Could not create the link.');
    } catch {
      setError('Could not create the link.');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string, which: 'link' | 'proposal') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616] px-5 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">MMS Admin · Switchboard</p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl font-extrabold">Mint a franchise proposal.</h1>
        <p className="mt-2 text-[#5c554a]">Enter the brand and its location count. You get the quote, a copyable proposal, and a live Stripe link to send.</p>

        {/* inputs */}
        <div className="mt-8 rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[6px_6px_0_0_#161616]">
          <div className="grid sm:grid-cols-3 gap-4">
            <label className="block sm:col-span-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a] block mb-1.5">Locations</span>
              <input type="number" min={1} max={9999} value={locations} onChange={(e) => setLocations(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2.5 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
            </label>
            <label className="block sm:col-span-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a] block mb-1.5">Brand</span>
              <input value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="Sunrise Plumbing"
                className="w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
            </label>
          </div>
          <label className="block mt-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a] block mb-1.5">Buyer email (optional, prefills checkout)</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@brand.com"
              className="w-full rounded-lg border-2 border-[#161616] bg-[#FBF6EA] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#F5B700]" />
          </label>

          {/* quote */}
          <div className="mt-6 grid sm:grid-cols-4 gap-3">
            {[
              ['Per location', `${usd(q.perLocationUsd)}/mo`, q.tier.label],
              ['Monthly', `${usd(q.monthlyUsd)}`, `${locations} locations`],
              ['Per year', `${usd(q.annualUsd)}`, 'recurring'],
              ['Build (once)', `${usd(q.buildUsd)}`, 'first invoice'],
            ].map(([label, big, sub]) => (
              <div key={label} className="rounded-xl border-2 border-[#161616] bg-[#F5F0E8] p-3">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5c554a]">{label}</p>
                <p className="font-display text-xl font-extrabold text-[#1E50C8] leading-tight">{big}</p>
                <p className="text-[11px] text-[#5c554a]">{sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-[#5c554a]">First invoice: <b className="text-[#161616]">{usd(q.firstInvoiceUsd)}</b> (build + first month).</p>
        </div>

        {/* proposal + link */}
        <div className="mt-6 grid gap-4">
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[6px_6px_0_0_#161616]">
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a]">Proposal (copy &amp; send)</p>
              <button onClick={() => copy(proposalText, 'proposal')} className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-3 py-1 text-[11px] font-sans font-extrabold uppercase tracking-[0.1em]">
                {copied === 'proposal' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-body text-sm text-[#161616] bg-[#F5F0E8] rounded-lg p-4 border border-[#161616]/15">{proposalText}</pre>
          </div>

          <div className="rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[6px_6px_0_0_#161616]">
            <button onClick={createLink} disabled={loading}
              className="rounded-full border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] px-7 py-3 font-sans font-extrabold text-sm uppercase tracking-[0.12em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5 disabled:opacity-60">
              {loading ? 'Creating link…' : 'Create Stripe checkout link'}
            </button>
            {error && <p className="mt-3 text-sm font-mono text-[#E0301E]">{error}</p>}
            {link && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <input readOnly value={link} className="flex-1 rounded-lg border-2 border-[#161616] bg-[#F5F0E8] px-3 py-2 text-sm font-mono" />
                  <button onClick={() => copy(link, 'link')} className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-4 py-2 text-[11px] font-sans font-extrabold uppercase tracking-[0.1em]">
                    {copied === 'link' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-bold text-[#1E50C8] underline underline-offset-2">Open the checkout to preview →</a>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs text-[#5c554a] font-mono">
          Tiers: {PRICE_TIERS.map((t) => `${t.min}${t.max ? `-${t.max}` : '+'}=$${t.perLocationUsd}`).join(' · ')} · build ${BUILD_FEE_USD}
        </p>
      </div>
    </div>
  );
}
