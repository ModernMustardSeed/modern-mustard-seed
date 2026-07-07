'use client';

/**
 * THE PRESS RUN. The signature moment of /press.
 *
 * intake  -> paste your price list, messy is fine
 * pressing-> the job log types out while Claude sets the type for real
 * proof   -> the actual typeset page appears (iframe of the same renderer the
 *            PDF mirrors), with FIX THE TYPE (the buyer's pre-checkout review
 *            table: every price editable, nothing final until they approve)
 * below   -> the tiers; THE PIECE lifts the watermark instantly
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import { PRESS, pressTiers, pressRunScript } from '@/data/press';

type Stage = 'intake' | 'pressing' | 'proof';

type Catalog = {
  sections: { title: string; items: { name: string; detail: string | null; price: string; note: string | null }[] }[];
  footnotes: string[];
};

type PressResult = {
  runId: string;
  profile: { business: string; tagline: string; city: string; ownerName: string };
  catalog: Catalog;
  proofHtml: string;
};

const FIELD =
  'w-full rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:border-[#161616]';
const LABEL = 'block text-[10px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5';

export default function PressRunExperience() {
  const [stage, setStage] = useState<Stage>('intake');
  const [form, setForm] = useState({ business: '', tagline: '', city: '', ownerName: '', email: '', priceList: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PressResult | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Catalog | null>(null);
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(0.6);

  const apiDone = useRef(false);
  const logDone = useRef(false);
  const pendingResult = useRef<PressResult | null>(null);
  const runSeq = useRef(0);
  const proofWrap = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mms_press_run');
      if (saved) {
        const parsed = JSON.parse(saved) as { result: PressResult; form: typeof form };
        if (parsed?.result?.runId && parsed?.result?.proofHtml) {
          setResult(parsed.result);
          setForm(parsed.form);
          setStage('proof');
        }
      }
    } catch { /* fresh visitor */ }
  }, []);

  // Scale the letter-size proof to its container.
  useEffect(() => {
    const el = proofWrap.current;
    if (!el || stage !== 'proof') return;
    const measure = () => setScale(Math.min(1, el.clientWidth / 816));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stage]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const maybeReveal = useCallback(() => {
    if (apiDone.current && logDone.current && pendingResult.current) {
      setStage('proof');
      trackEvent('press_proof_revealed', {});
    }
  }, []);

  const runLog = useCallback(() => {
    const myRun = ++runSeq.current;
    const job = String((form.business.length * 37 + form.city.length * 11) % 900 + 100);
    const lines = pressRunScript.map((l) => l.replace('{business}', form.business.trim()).replace('{job}', job));
    setLogLines([]);
    let at = 400;
    lines.forEach((line, idx) => {
      if (idx === lines.length - 1) at += 500;
      window.setTimeout(() => { if (runSeq.current === myRun) setLogLines((prev) => [...prev, line]); }, at);
      at += 1100;
    });
    window.setTimeout(() => {
      if (runSeq.current !== myRun) return;
      logDone.current = true;
      maybeReveal();
    }, at + 500);
  }, [form.business, form.city, maybeReveal]);

  const press = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const f = form;
    if (f.business.trim().length < 2 || f.ownerName.trim().length < 2 || f.city.trim().length < 2) {
      setError('The pressman needs your business name, your name, and your town on the job ticket.');
      return;
    }
    if (f.priceList.trim().length < 20) {
      setError('Paste your actual price list, menu, or rate sheet. Messy is fine, that is the point.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setError('A real email starts the press (your proof PDF gets delivered there too).');
      return;
    }
    setSubmitting(true);
    setStage('pressing');
    trackEvent('press_run_start', {});
    apiDone.current = false;
    logDone.current = false;
    pendingResult.current = null;
    runLog();

    try {
      const hp = (document.getElementById('pr-website') as HTMLInputElement | null)?.value || '';
      const res = await fetch('/api/press/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'create', ...f, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.runId || !data?.proofHtml) {
        const msg =
          data?.message ||
          (data?.error === 'rate_limited'
            ? 'Easy there. The press cools between runs. Try again in a bit.'
            : 'The press jammed. Give it another pull in a minute.');
        runSeq.current += 1;
        setStage('intake');
        setSubmitting(false);
        setError(msg);
        return;
      }
      const r = data as PressResult;
      setResult(r);
      pendingResult.current = r;
      try { localStorage.setItem('mms_press_run', JSON.stringify({ result: r, form: f })); } catch { /* fine */ }
      trackEvent('press_proof_done', {});
      apiDone.current = true;
      maybeReveal();
    } catch {
      runSeq.current += 1;
      setStage('intake');
      setSubmitting(false);
      setError('The press lost power mid-run. Check your network and try again.');
    }
  };

  const openEditor = () => {
    if (!result) return;
    setDraft(JSON.parse(JSON.stringify(result.catalog)) as Catalog);
    setEditing(true);
    trackEvent('press_edit_open', {});
  };

  const saveEdits = async () => {
    if (!result || !draft || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/press/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'update', runId: result.runId, catalog: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.proofHtml) {
        setError(data?.message || 'That edit did not take. Try once more.');
        setSaving(false);
        return;
      }
      const next = { ...result, catalog: data.catalog as Catalog, proofHtml: data.proofHtml as string };
      setResult(next);
      try { localStorage.setItem('mms_press_run', JSON.stringify({ result: next, form })); } catch { /* fine */ }
      setEditing(false);
      setError(null);
      trackEvent('press_edit_saved', {});
    } catch {
      setError('That edit did not take. Try once more.');
    }
    setSaving(false);
  };

  return (
    <div className="relative">
      <style>{`
        @keyframes pr-rise { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pr-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pr-press { 0% { transform: translateY(-14px); opacity: 0; } 55% { transform: translateY(3px); opacity: 1; } 100% { transform: translateY(0); opacity: 1; } }
        .pr-rise { animation: pr-rise 0.45s ease-out both; }
        .pr-caret { animation: pr-blink 1s step-start infinite; }
        .pr-press { animation: pr-press 0.6s cubic-bezier(0.2, 1.2, 0.4, 1) both; }
        @media (prefers-reduced-motion: reduce) { .pr-rise, .pr-press { animation: none; opacity: 1; } }
      `}</style>

      {/* ─── INTAKE ─── */}
      {stage === 'intake' && (
        <form onSubmit={press} className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-8 shadow-[6px_6px_0_0_#161616]">
          <div className="flex items-center gap-3 mb-5 border-b-2 border-[#161616] pb-4">
            <Image src="/brand/mascot.png" alt="Mr. Mustard, pressman" width={46} height={46} className="rounded-full border-2 border-[#161616] bg-[#F5B700]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Job ticket · The Press Run</p>
              <p className="font-display text-lg font-black text-[#161616] leading-tight">Hand the pressman your price list.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pr-business" className={LABEL}>Business name</label>
              <input id="pr-business" className={FIELD} value={form.business} onChange={set('business')} placeholder="Two Forks Diner" maxLength={80} required />
            </div>
            <div>
              <label htmlFor="pr-tagline" className={LABEL}>Tagline (optional)</label>
              <input id="pr-tagline" className={FIELD} value={form.tagline} onChange={set('tagline')} placeholder="Since the flood of 96" maxLength={80} />
            </div>
            <div>
              <label htmlFor="pr-owner" className={LABEL}>Your first name</label>
              <input id="pr-owner" className={FIELD} value={form.ownerName} onChange={set('ownerName')} placeholder="Sam" maxLength={60} required />
            </div>
            <div>
              <label htmlFor="pr-city" className={LABEL}>Town</label>
              <input id="pr-city" className={FIELD} value={form.city} onChange={set('city')} placeholder="Kalispell, MT" maxLength={60} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pr-list" className={LABEL}>Your price list, menu, or rate sheet (paste it exactly as it is)</label>
              <textarea id="pr-list" className={`${FIELD} min-h-[150px] resize-y font-mono text-[13px]`} value={form.priceList} onChange={set('priceList')} maxLength={4000}
                placeholder={'BREAKFAST (all day!!)\nhuckleberry pancakes - short stack 9.5 / full 13\nbiscuits & gravy 11\ncoffee bottomless 3\n\nkids grilled cheese 6 - includes juice\nNO substitutions on weekends. cash discount 3%'} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="pr-email" className={LABEL}>Your email (the proof PDF gets delivered there)</label>
              <input id="pr-email" type="email" className={FIELD} value={form.email} onChange={set('email')} placeholder="you@yourbusiness.com" required />
            </div>
          </div>

          {/* Honeypot: humans never see or fill this. */}
          <input id="pr-website" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

          {error && <p className="mt-4 text-[#E0301E] text-sm font-body font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-[#F5B700] border-2 border-[#161616] px-8 py-4 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] disabled:opacity-50"
          >
            Run my proof (free, 60 seconds)
          </button>
          <p className="mt-3 text-center text-[11px] font-mono text-[#161616]/50">
            One free proof per business. No card. Every price set exactly as you wrote it.
          </p>
        </form>
      )}

      {/* ─── PRESSING: the job log ─── */}
      {stage === 'pressing' && (
        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] p-6 md:p-8 shadow-[6px_6px_0_0_#F5B700] min-h-[340px]">
          <div className="flex items-center gap-3 mb-5">
            <Image src="/brand/mascot.png" alt="Mr. Mustard at the press" width={46} height={46} className="rounded-full border-2 border-[#F5B700] bg-[#F5B700] animate-pulse" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Press running</p>
              <p className="font-display text-lg font-black text-[#FBF6EA] leading-tight">Setting the type for {form.business.trim()}.</p>
            </div>
          </div>
          <div className="font-mono text-[13px] md:text-sm leading-7 text-[#FBF6EA]/90">
            {logLines.filter((l): l is string => typeof l === 'string').map((line, i) => (
              <p key={i} className={`pr-rise ${line.startsWith('[') ? 'text-[#F5B700] font-bold' : ''}`}>{line}</p>
            ))}
            <span className="pr-caret inline-block w-2.5 h-4 bg-[#F5B700] align-middle ml-0.5" />
          </div>
        </div>
      )}

      {/* ─── THE PROOF ─── */}
      {stage === 'proof' && result && (
        <div className="space-y-6">
          <div ref={proofWrap} className="pr-press rounded-xl border-[3px] border-[#161616] bg-white shadow-[10px_10px_0_0_#161616] overflow-hidden" style={{ height: `${Math.round(1056 * scale) + 2}px` }}>
            <iframe
              title={`The proof for ${result.profile.business}`}
              srcDoc={result.proofHtml}
              style={{ width: '816px', height: '1056px', border: '0', transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
              sandbox=""
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`/api/press/pdf?runId=${encodeURIComponent(result.runId)}`}
              onClick={() => trackEvent('press_proof_download', {})}
              className="text-center rounded-full bg-white border-2 border-[#161616] px-7 py-3.5 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
            >
              Download the proof (PDF)
            </a>
            <button
              type="button"
              onClick={openEditor}
              className="rounded-full bg-[#161616] border-2 border-[#161616] px-7 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5"
            >
              Fix the type (edit items + prices)
            </button>
          </div>
          <p className="text-center text-[11px] font-mono text-[#161616]/50">
            Check every price before you buy. What you approve here is exactly what prints.
          </p>

          {/* FIX THE TYPE: the pre-checkout review table */}
          {editing && draft && (
            <div className="rounded-2xl border-2 border-[#161616] bg-white p-5 md:p-7 shadow-[6px_6px_0_0_#161616]">
              <div className="flex items-center justify-between border-b-2 border-[#161616] pb-3 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Fix the type</p>
                <button type="button" onClick={() => setEditing(false)} className="font-mono text-xs font-bold text-[#161616]/60 hover:text-[#161616]">close ✕</button>
              </div>
              <div className="space-y-6 max-h-[480px] overflow-y-auto pr-2">
                {draft.sections.map((sec, si) => (
                  <div key={si}>
                    <input
                      className={`${FIELD} font-mono uppercase tracking-widest text-xs font-bold mb-2`}
                      value={sec.title}
                      maxLength={40}
                      onChange={(e) => setDraft((d) => { if (!d) return d; const n = structuredClone(d); n.sections[si].title = e.target.value; return n; })}
                    />
                    {sec.items.map((it, ii) => (
                      <div key={ii} className="grid grid-cols-[1fr_110px_34px] gap-2 mb-2 items-center">
                        <input className={FIELD} value={it.name} maxLength={80} placeholder="Item"
                          onChange={(e) => setDraft((d) => { if (!d) return d; const n = structuredClone(d); n.sections[si].items[ii].name = e.target.value; return n; })} />
                        <input className={`${FIELD} text-right`} value={it.price} maxLength={60} placeholder="$0"
                          onChange={(e) => setDraft((d) => { if (!d) return d; const n = structuredClone(d); n.sections[si].items[ii].price = e.target.value; return n; })} />
                        <button type="button" aria-label={`Remove ${it.name}`} className="h-9 rounded-lg border-2 border-[#161616]/30 text-[#E0301E] font-black hover:border-[#E0301E]"
                          onClick={() => setDraft((d) => { if (!d) return d; const n = structuredClone(d); n.sections[si].items.splice(ii, 1); return n; })}>✕</button>
                      </div>
                    ))}
                    <button type="button" className="font-mono text-[11px] font-bold text-[#1E50C8] underline underline-offset-2"
                      onClick={() => setDraft((d) => { if (!d) return d; const n = structuredClone(d); n.sections[si].items.push({ name: '', detail: null, price: '', note: null }); return n; })}>
                      + add an item
                    </button>
                  </div>
                ))}
              </div>
              {error && <p className="mt-3 text-[#E0301E] text-sm font-body font-semibold">{error}</p>}
              <button
                type="button"
                onClick={saveEdits}
                disabled={saving}
                className="mt-5 w-full rounded-full bg-[#F5B700] border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {saving ? 'Re-setting the type…' : 'Re-set the type'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── THE TIERS ─── */}
      <div id="roll" className="pt-14 md:pt-20">
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ Off the press ]</p>
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            The proof is free.<br className="hidden md:block" /> The clean file is one click.
          </h2>
          <p className="font-body text-[#161616]/65 max-w-xl mx-auto mt-4">
            Approve your prices above, then lift the watermark. Full commercial rights on everything, forever.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pressTiers.map((tier) => (
            <PressTierCard key={tier.slug} tier={tier} business={form.business.trim() || undefined} runId={result?.runId} />
          ))}
        </div>
        <p className="text-center mt-6 font-body text-sm text-[#161616]/60">
          Prices change every season? The real fix is a website that updates itself.{' '}
          <a href="/work-with-us" className="text-[#1E50C8] font-semibold underline underline-offset-2">Talk to the studio</a>.
        </p>
      </div>
    </div>
  );
}

function PressTierCard({ tier, business, runId }: { tier: (typeof pressTiers)[number]; business?: string; runId?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    trackEvent('press_checkout_click', { tier: tier.slug });
    try {
      const res = await fetch('/api/press/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.slug, business, runId }),
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
    <div className={`relative rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] flex flex-col ${tier.featured ? 'md:-translate-y-2' : ''}`}>
      {tier.featured && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#E0301E] border-2 border-[#161616] px-4 py-1 text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-white whitespace-nowrap">
          Most pressed
        </span>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">{tier.chip}</p>
      <h3 className="font-display text-2xl font-black text-[#161616] mt-1.5">{tier.name}</h3>
      <p className="mt-3">
        <span className="font-display text-4xl font-black text-[#161616]">${tier.priceUsd}</span>
        <span className="font-body text-sm text-[#161616]/60"> one time</span>
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
        {busy ? 'Inking up…' : tier.cta}
      </button>
      {msg && <p className="mt-3 text-[#E0301E] text-xs font-body font-semibold">{msg}</p>}
    </div>
  );
}
