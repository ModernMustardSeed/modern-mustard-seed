'use client';

/**
 * THE GEO DESK: the conversion module under the free audit. The examiner's
 * verdict card reacts to the live grade (mms-audit-done event from
 * WebsiteAuditEngine), stamps it in red ink, and writes the prescription.
 * Below it: the tiers. Honest copy law: installed signals and graded reports,
 * never ranking promises.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { GEO, geoTiers } from '@/data/geo';

type LastAudit = { url: string; grade: string; score: number };

function prescription(grade: string): string {
  const g = grade.toUpperCase().charAt(0);
  if (g === 'A') return 'Frame it. Then put THE WATCH on it so it stays an A while your competitors figure out what GEO means.';
  if (g === 'B') return 'Close. A handful of missing signals separate you from the sites AI engines can actually read. The Fix Pack writes them.';
  if (g === 'C') return 'The bones are there, the signals are not. Structured data and llms.txt are the difference between findable and invisible.';
  if (g === 'D') return 'AI engines are answering your customers right now without you in the conversation. Every missing signal below is installable this week.';
  return 'Blunt diagnosis: to AI search, this site barely exists. The good news: the fix is mechanical, and the pack writes every piece for you.';
}

export default function GeoDesk() {
  const [last, setLast] = useState<LastAudit | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mms_last_audit');
      if (saved) setLast(JSON.parse(saved) as LastAudit);
      if (new URLSearchParams(window.location.search).get('geo') === 'welcome') setWelcome(true);
    } catch { /* fresh */ }
    const onDone = (e: Event) => {
      const detail = (e as CustomEvent).detail as LastAudit;
      if (detail?.url && detail?.grade) {
        setLast(detail);
        trackEvent('geo_verdict_shown', { grade: detail.grade });
      }
    };
    window.addEventListener('mms-audit-done', onDone);
    return () => window.removeEventListener('mms-audit-done', onDone);
  }, []);

  const activeUrl = last?.url || urlInput;

  return (
    <section id="geo-desk" className="py-16 md:py-24 border-t-2 border-[#161616] bg-[#FBF6EA]">
      <div className="max-w-5xl mx-auto px-5">
        {welcome && (
          <div className="max-w-2xl mx-auto mb-10 rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-6 text-center shadow-[5px_5px_0_0_#161616]">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#161616] font-bold mb-1.5">[ ORDER CONFIRMED ]</p>
            <p className="font-display text-xl font-black text-[#161616]">The desk has your site.</p>
            <p className="font-body text-sm text-[#161616]/75 mt-2">Your receipt and next steps are in your inbox. Watch subscribers: the baseline re-grade lands within a day. White glove: Sarah emails within one business day.</p>
          </div>
        )}
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">{GEO.wordmark}</p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
          Be the answer AI gives.
        </h2>
        <p className="font-body text-[#161616]/65 max-w-2xl mx-auto mt-4 text-center leading-relaxed">
          {GEO.promise}
        </p>

        {/* The examiner's verdict */}
        <div className="max-w-2xl mx-auto mt-10">
          {last ? (
            <div className="relative rounded-2xl border-[3px] border-[#161616] bg-white p-6 sm:p-7 shadow-[8px_8px_0_0_#161616]">
              {/* flex-wrap: the stamp drops to its own row on narrow screens
                  instead of pushing the viewport (ship-gate 375px blocker). */}
              <div className="flex flex-wrap items-start gap-4 sm:gap-5">
                <Image src="/brand/mascot.png" alt="Mr. Mustard, examiner" width={56} height={56} className="rounded-full border-2 border-[#161616] bg-[#F5B700] shrink-0" />
                <div className="flex-1 min-w-[11rem]">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold break-words">The examiner&apos;s verdict · {last.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
                  <p className="font-body text-[15px] text-[#161616]/80 leading-relaxed mt-2">{prescription(last.grade)}</p>
                </div>
                <div className="shrink-0 -rotate-6 rounded-lg border-[3px] border-[#E0301E] px-4 py-2 text-center mx-auto sm:mx-0" aria-label={`Grade ${last.grade}`}>
                  <span className="font-display text-4xl font-black text-[#E0301E] leading-none">{last.grade}</span>
                  <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[#E0301E]/80 mt-0.5">{last.score}/100</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-[#161616]/35 bg-white/60 p-6 text-center">
              <p className="font-body text-sm text-[#161616]/65">
                Run the free audit above and the examiner grades your site right here. Or type your address to skip straight to the desk:
              </p>
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="yourbusiness.com"
                className="mt-3 w-full max-w-sm mx-auto block rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
            </div>
          )}
        </div>

        {/* The tiers */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-12">
          {geoTiers.filter((t) => !t.dark && t.cadence === 'once').map((tier) => (
            <GeoTierCard key={tier.slug} tier={tier} url={activeUrl} />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mt-6">
          {geoTiers.filter((t) => !t.dark && t.cadence === 'monthly').map((tier) => (
            <GeoTierCard key={tier.slug} tier={tier} url={activeUrl} />
          ))}
        </div>

        <p className="text-center mt-8 font-body text-sm text-[#161616]/60 max-w-xl mx-auto">
          The honest fine print: nobody can promise what ChatGPT will recommend, and we never will. We install the signals it reads and prove they exist with re-grades. While you are fixing the website, the phones deserve the same:{' '}
          <Link href="/sidekick" className="text-[#1E50C8] font-semibold underline underline-offset-2">forge your free AI receptionist demo</Link>.
        </p>
      </div>
    </section>
  );
}

function GeoTierCard({ tier, url }: { tier: (typeof geoTiers)[number]; url: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    trackEvent('geo_checkout_click', { tier: tier.slug });
    try {
      const res = await fetch('/api/geo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.slug, url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setMsg(data?.message || 'Checkout hiccuped. Try again or email sarah@modernmustardseed.com.');
        setBusy(false);
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setMsg('Checkout hiccuped. Try again or email sarah@modernmustardseed.com.');
      setBusy(false);
    }
  };

  return (
    <div className={`relative rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] flex flex-col ${tier.featured ? 'md:-translate-y-1' : ''}`}>
      {tier.featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#E0301E] border-2 border-[#161616] px-4 py-1 text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-white whitespace-nowrap">
          Start here
        </span>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">{tier.chip}</p>
      <h3 className="font-display text-2xl font-black text-[#161616] mt-1.5">{tier.name}</h3>
      <p className="mt-3">
        <span className="font-display text-4xl font-black text-[#161616]">${tier.priceUsd}</span>
        <span className="font-body text-sm text-[#161616]/60">{tier.cadence === 'monthly' ? '/mo' : ' one time'}</span>
      </p>
      <p className="font-body text-sm text-[#161616]/70 mt-2 leading-relaxed">{tier.pitch}</p>
      <ul className="mt-5 space-y-2.5 flex-1">
        {tier.includes.map((line) => (
          <li key={line} className="flex gap-2.5 font-body text-[13.5px] text-[#161616]/80 leading-snug">
            <span className="text-[#F5B700] font-black mt-[1px]" aria-hidden="true">✓</span>
            {line}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className={`mt-6 w-full rounded-full border-2 border-[#161616] px-6 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] disabled:opacity-60 ${
          tier.featured ? 'bg-[#F5B700] text-[#161616]' : 'bg-white text-[#161616]'
        }`}
      >
        {busy ? 'Opening the desk…' : tier.cta}
      </button>
      {msg && <p className="mt-3 text-[#E0301E] text-xs font-body font-semibold">{msg}</p>}
    </div>
  );
}
