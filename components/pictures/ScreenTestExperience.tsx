'use client';

/**
 * THE SCREEN TEST. The signature moment of /pictures.
 *
 * intake  -> tell the director about your business
 * rolling -> the production log types out while Claude writes the treatment
 *            and the darkroom paints the hero frame (real work, real theatre)
 * reveal  -> the hero frame develops (blur -> sharp) and the storyboard types
 *            onto a script page, taglines and all
 * below   -> ROLL FILM: the three tiers, warm iron, ready to strike
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { trackEvent } from '@/lib/analytics';
import { PICTURES, picturesVerticals, picturesTiers, screenTestScript } from '@/data/pictures';

type Stage = 'intake' | 'rolling' | 'reveal';

type TestResult = { runId: string; storyboard: string; frameUrl: string | null; darkroom: boolean };

const FIELD =
  'w-full rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:border-[#161616]';
const LABEL = 'block text-[10px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5';

export default function ScreenTestExperience() {
  const [stage, setStage] = useState<Stage>('intake');
  const [form, setForm] = useState({ business: '', vertical: 'home-services', city: '', ownerName: '', story: '', email: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [boardLines, setBoardLines] = useState<string[]>([]);
  const [frameLoaded, setFrameLoaded] = useState(false);

  const apiDone = useRef(false);
  const logDone = useRef(false);
  const pendingResult = useRef<TestResult | null>(null);
  // Run token: a failed submit leaves ~10s of pending log timers; bumping this
  // makes every stale callback a no-op so a quick retry never interleaves.
  const runSeq = useRef(0);

  // Restore a prior screen test for returning visitors.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mms_pictures_test');
      if (saved) {
        const parsed = JSON.parse(saved) as { result: TestResult; form: typeof form };
        if (parsed?.result?.runId && parsed?.result?.storyboard) {
          setResult(parsed.result);
          setForm(parsed.form);
          setStage('reveal');
          setBoardLines(parsed.result.storyboard.split('\n'));
        }
      }
    } catch { /* fresh visitor */ }
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const revealBoard = useCallback((r: TestResult) => {
    setStage('reveal');
    const lines = r.storyboard.split('\n');
    setBoardLines([]);
    let at = 300;
    lines.forEach((line) => {
      window.setTimeout(() => setBoardLines((prev) => [...prev, line]), at);
      at += line.trim() === '' ? 60 : 170;
    });
  }, []);

  const maybeReveal = useCallback(() => {
    if (apiDone.current && logDone.current && pendingResult.current) {
      revealBoard(pendingResult.current);
    }
  }, [revealBoard]);

  const runLog = useCallback(() => {
    const myRun = ++runSeq.current;
    const lines = screenTestScript.map((l) => l.replace('{business}', form.business.trim()));
    setLogLines([]);
    let at = 400;
    lines.forEach((line, idx) => {
      if (idx === lines.length - 1) at += 500;
      window.setTimeout(() => { if (runSeq.current === myRun) setLogLines((prev) => [...prev, line]); }, at);
      at += 1150;
    });
    window.setTimeout(() => {
      if (runSeq.current !== myRun) return;
      logDone.current = true;
      maybeReveal();
    }, at + 600);
  }, [form.business, maybeReveal]);

  const roll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const f = form;
    if (f.business.trim().length < 2 || f.ownerName.trim().length < 2 || f.city.trim().length < 2) {
      setError('The director needs your business name, your name, and your town before he can scout.');
      return;
    }
    if (f.story.trim().length < 15) {
      setError('Give him a little more story: what you do, and what you are proud of.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setError('A real email unlocks the screen test (your treatment gets delivered there too).');
      return;
    }
    setSubmitting(true);
    setStage('rolling');
    trackEvent('pictures_test_start', { vertical: f.vertical });
    apiDone.current = false;
    logDone.current = false;
    pendingResult.current = null;
    runLog();

    try {
      const hp = (document.getElementById('px-website') as HTMLInputElement | null)?.value || '';
      const res = await fetch('/api/pictures/screen-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.runId || !data?.storyboard) {
        const msg =
          data?.message ||
          (data?.error === 'rate_limited'
            ? 'Easy there. The studio takes a breather between takes. Try again in a bit.'
            : 'The studio lights flickered. Give it another try in a minute.');
        runSeq.current += 1; // cancel this run's pending log timers
        setStage('intake');
        setSubmitting(false);
        setError(msg);
        return;
      }
      const r = data as TestResult;
      setResult(r);
      pendingResult.current = r;
      try { localStorage.setItem('mms_pictures_test', JSON.stringify({ result: r, form: f })); } catch { /* fine */ }
      trackEvent('pictures_test_done', { vertical: f.vertical, darkroom: r.darkroom });
      apiDone.current = true;
      maybeReveal();
    } catch {
      runSeq.current += 1; // cancel this run's pending log timers
      setStage('intake');
      setSubmitting(false);
      setError('The studio lost its connection. Check your network and try again.');
    }
  };

  return (
    <div className="relative">
      <style>{`
        @keyframes px-rise { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes px-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes px-develop { from { filter: blur(18px) saturate(0.4); opacity: 0.4; } to { filter: blur(0) saturate(1); opacity: 1; } }
        .px-rise { animation: px-rise 0.45s ease-out both; }
        .px-caret { animation: px-blink 1s step-start infinite; }
        .px-develop { animation: px-develop 1.8s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .px-rise, .px-develop { animation: none; opacity: 1; filter: none; } }
      `}</style>

      {/* ─── INTAKE ─── */}
      {stage === 'intake' && (
        <form onSubmit={roll} className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-8 shadow-[6px_6px_0_0_#161616]">
          <div className="flex items-center gap-3 mb-5 border-b-2 border-[#161616] pb-4">
            <Image src="/brand/mascot.png" alt="Mr. Mustard, director" width={46} height={46} className="rounded-full border-2 border-[#161616] bg-[#F5B700]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Casting · The Screen Test</p>
              <p className="font-display text-lg font-black text-[#161616] leading-tight">Tell the director about your business.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="px-business" className={LABEL}>Business name</label>
              <input id="px-business" className={FIELD} value={form.business} onChange={set('business')} placeholder="Glacier Peak Coffee" maxLength={80} required />
            </div>
            <div>
              <label htmlFor="px-vertical" className={LABEL}>What kind of business</label>
              <select id="px-vertical" className={FIELD} value={form.vertical} onChange={set('vertical')}>
                {picturesVerticals.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="px-owner" className={LABEL}>Your first name</label>
              <input id="px-owner" className={FIELD} value={form.ownerName} onChange={set('ownerName')} placeholder="Sam" maxLength={60} required />
            </div>
            <div>
              <label htmlFor="px-city" className={LABEL}>Town</label>
              <input id="px-city" className={FIELD} value={form.city} onChange={set('city')} placeholder="Whitefish, MT" maxLength={60} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="px-story" className={LABEL}>Your story (what you do, and what you&apos;re proud of)</label>
              <textarea id="px-story" className={`${FIELD} min-h-[88px] resize-y`} value={form.story} onChange={set('story')} maxLength={500}
                placeholder="Third-generation plumbing shop. We answer at 2am when nobody else will. Customers say we leave the place cleaner than we found it." required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="px-email" className={LABEL}>Your email (the treatment gets delivered there)</label>
              <input id="px-email" type="email" className={FIELD} value={form.email} onChange={set('email')} placeholder="you@yourbusiness.com" required />
            </div>
          </div>

          {/* Honeypot: humans never see or fill this. */}
          <input id="px-website" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

          {error && <p className="mt-4 text-[#E0301E] text-sm font-body font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-[#F5B700] border-2 border-[#161616] px-8 py-4 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] disabled:opacity-50"
          >
            Take my screen test (free, 60 seconds)
          </button>
          <p className="mt-3 text-center text-[11px] font-mono text-[#161616]/50">
            One screen test per business. No card. The treatment is yours to keep either way.
          </p>
        </form>
      )}

      {/* ─── ROLLING: the production log ─── */}
      {stage === 'rolling' && (
        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] p-6 md:p-8 shadow-[6px_6px_0_0_#F5B700] min-h-[360px]">
          <div className="flex items-center gap-3 mb-5">
            <Image src="/brand/mascot.png" alt="Mr. Mustard directing" width={46} height={46} className="rounded-full border-2 border-[#F5B700] bg-[#F5B700] animate-pulse" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Now shooting</p>
              <p className="font-display text-lg font-black text-[#FBF6EA] leading-tight">Mr. Mustard is directing {form.business.trim()}&apos;s screen test.</p>
            </div>
          </div>
          <div className="font-mono text-[13px] md:text-sm leading-7 text-[#FBF6EA]/90">
            {logLines.filter((l): l is string => typeof l === 'string').map((line, i) => (
              <p key={i} className={`px-rise ${line.startsWith('[') ? 'text-[#F5B700] font-bold' : ''}`}>{line}</p>
            ))}
            <span className="px-caret inline-block w-2.5 h-4 bg-[#F5B700] align-middle ml-0.5" />
          </div>
        </div>
      )}

      {/* ─── REVEAL: the frame develops, the board types on ─── */}
      {stage === 'reveal' && result && (
        <div className="space-y-6">
          {result.frameUrl ? (
            <div className="px-develop rounded-2xl border-[3px] border-[#161616] overflow-hidden shadow-[8px_8px_0_0_#161616] bg-[#161616]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.frameUrl}
                alt={`The hero frame of ${form.business.trim()}'s commercial`}
                className="w-full block"
                onLoad={() => setFrameLoaded(true)}
              />
              <div className="bg-[#161616] px-5 py-2.5 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Hero frame · {form.business.trim()}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#FBF6EA]/50">{frameLoaded ? 'Developed' : 'Developing…'}</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-[#161616]/40 bg-white/60 p-6 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold mb-1.5">The darkroom is backed up tonight</p>
              <p className="font-body text-sm text-[#161616]/70">Your hero frame is still developing. It lands in your inbox the moment it dries.</p>
            </div>
          )}

          <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-9 shadow-[6px_6px_0_0_#161616]">
            <div className="flex items-center justify-between border-b-2 border-[#161616] pb-3 mb-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">The treatment · directed by Mr. Mustard</p>
              <Image src="/brand/mascot.png" alt="" width={30} height={30} className="rounded-full border-2 border-[#161616]" />
            </div>
            <div className="font-serif text-[15.5px] md:text-base leading-8 text-[#161616] whitespace-pre-wrap">
              {boardLines.filter((l): l is string => typeof l === 'string').map((line, i) => (
                <p key={i} className={`px-rise ${/^(LOGLINE|THE BOARD|TAGLINES|DIRECTOR)/.test(line) ? 'font-mono text-[12px] uppercase tracking-[0.24em] font-bold text-[#161616]/60 mt-4' : ''}`}>{line || ' '}</p>
              ))}
            </div>
            <p className="mt-6 pt-4 border-t border-[#161616]/15 text-[12px] font-mono text-[#161616]/50">
              A copy is on its way to your inbox. It&apos;s yours to keep, filmed or not.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-6 text-center shadow-[6px_6px_0_0_#161616]">
            <p className="font-display text-xl md:text-2xl font-black text-[#161616]">Love the treatment? Let&apos;s film it.</p>
            <a href="#roll" className="inline-block mt-3 rounded-full bg-[#161616] border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5">
              Roll film ↓
            </a>
          </div>
        </div>
      )}

      {/* ─── ROLL FILM: the tiers ─── */}
      <div id="roll" className="pt-14 md:pt-20">
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ Roll film ]</p>
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            From treatment to finished film.
          </h2>
          <p className="font-body text-[#161616]/65 max-w-xl mx-auto mt-4">
            Every spot is generated for your business and hand-reviewed by Sarah before it ships. Full commercial rights, files yours forever.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {picturesTiers.map((tier) => (
            <TierCard key={tier.slug} tier={tier} business={form.business.trim() || undefined} runId={result?.runId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TierCard({ tier, business, runId }: { tier: (typeof picturesTiers)[number]; business?: string; runId?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    trackEvent('pictures_checkout_click', { tier: tier.slug });
    try {
      const res = await fetch('/api/pictures/checkout', {
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
          Most booked
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
        {busy ? 'Opening the box office…' : tier.cta}
      </button>
      {msg && <p className="mt-3 text-[#E0301E] text-xs font-body font-semibold">{msg}</p>}
    </div>
  );
}
