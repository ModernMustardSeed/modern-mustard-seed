'use client';

/**
 * THE SIDEKICK FORGE. The signature moment of /sidekick.
 *
 * intake  -> a terminal card where you tell Mr. Mustard about your business
 * forging -> the training montage: personalized log lines type out while the
 *            hero's mustard dots get pulled into the forge (the persona is
 *            genuinely being built server-side during this beat)
 * ready   -> the stamped nameplate badge + the live mic orb ("say hello"),
 *            plus the encore: he calls your cell, once
 * after the call -> the KEEP HIM panel is right there, warm iron, ready to strike
 *
 * The in-browser call is the guaranteed beat (no carrier spam filter between
 * the visitor and the wow). The phone ring is the opt-in encore.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type Vapi from '@vapi-ai/web';
import { trackEvent } from '@/lib/analytics';
import { SIDEKICK, sidekickVerticals, sidekickTiers, getVertical, forgeScript, sidekickUsd } from '@/data/sidekick';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type Stage = 'intake' | 'forging' | 'ready';
type CallState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

type ForgedCall = {
  firstMessage: string;
  model: Record<string, unknown>;
  maxDurationSeconds: number;
  metadata: Record<string, unknown>;
};

type ForgeResponse = { runId: string; call: ForgedCall; phoneLine: string };

const FIELD =
  'w-full rounded-lg border-2 border-[#161616] bg-white px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700] focus:border-[#161616]';
const LABEL = 'block text-[10px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5';

export default function ForgeExperience() {
  const [stage, setStage] = useState<Stage>('intake');
  const [form, setForm] = useState({ business: '', vertical: 'home-services', city: '', ownerName: '', services: '', hours: '', email: '' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forged, setForged] = useState<ForgeResponse | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [badgeStamped, setBadgeStamped] = useState(false);

  // live call
  const [callState, setCallState] = useState<CallState>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);

  // encore ring
  const [cell, setCell] = useState('');
  const [ringState, setRingState] = useState<'idle' | 'ringing' | 'rang' | 'error'>('idle');
  const [ringMsg, setRingMsg] = useState<string | null>(null);

  const forgeApiDone = useRef(false);
  const montageDone = useRef(false);

  useEffect(() => () => { vapiRef.current?.stop(); }, []);

  // Restore a prior forge so a returning visitor keeps their badge + context.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mms_sidekick_forge');
      if (saved) {
        const parsed = JSON.parse(saved) as { forged: ForgeResponse; form: typeof form };
        if (parsed?.forged?.runId && parsed?.forged?.call) {
          setForged(parsed.forged);
          setForm(parsed.form);
          setStage('ready');
          setBadgeStamped(true);
        }
      }
    } catch { /* fresh visitor */ }
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  /** Both jobs finished (theatre + API) -> stamp the badge. */
  const maybeReady = useCallback(() => {
    if (forgeApiDone.current && montageDone.current) {
      setStage('ready');
      window.setTimeout(() => setBadgeStamped(true), 120);
    }
  }, []);

  const runMontage = useCallback(() => {
    const v = getVertical(form.vertical);
    const lines = forgeScript.map((l) =>
      l
        .replace('{business}', form.business.trim())
        .replace('{services}', form.services.trim().slice(0, 70) + (form.services.trim().length > 70 ? '…' : ''))
        .replace('{drill}', v.drill)
        .replace('{city}', form.city.trim())
    );
    setLogLines([]);
    // Deterministic schedule: each line gets its own timer (no shared index),
    // with an extra beat before the graduation stamp.
    let at = 400;
    lines.forEach((line, idx) => {
      if (idx === lines.length - 1) at += 500;
      window.setTimeout(() => setLogLines((prev) => [...prev, line]), at);
      at += 1150;
    });
    window.setTimeout(() => { montageDone.current = true; maybeReady(); }, at + 700);
  }, [form, maybeReady]);

  const forge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const f = form;
    if (f.business.trim().length < 2 || f.ownerName.trim().length < 2 || f.city.trim().length < 2) {
      setError('He needs your business name, your name, and your town before training starts.');
      return;
    }
    if (f.services.trim().length < 10) {
      setError('Give him a little more to learn: what you do, what you charge, what customers ask.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) {
      setError('A real email unlocks the forge (your call summary lands there too).');
      return;
    }
    setSubmitting(true);
    setStage('forging');
    trackEvent('sidekick_forge_start', { vertical: f.vertical });
    forgeApiDone.current = false;
    montageDone.current = false;
    runMontage();

    try {
      const hp = (document.getElementById('sk-website') as HTMLInputElement | null)?.value || '';
      const res = await fetch('/api/sidekick/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'web', ...f, website: hp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          data?.message ||
          (data?.error === 'rate_limited'
            ? 'Easy there. The forge takes a breather between runs. Try again in a bit.'
            : 'The forge sputtered. Give it another try in a minute.');
        setStage('intake');
        setSubmitting(false);
        setError(msg);
        return;
      }
      if (!data?.runId || !data?.call?.firstMessage) {
        // Honeypot decoy or malformed payload: end gracefully, never render a broken stage.
        setStage('intake');
        setSubmitting(false);
        setError('The forge sputtered. Give it another try in a minute.');
        return;
      }
      setForged(data as ForgeResponse);
      try { localStorage.setItem('mms_sidekick_forge', JSON.stringify({ forged: data, form: f })); } catch { /* fine */ }
      trackEvent('sidekick_forged', { vertical: f.vertical });
      forgeApiDone.current = true;
      maybeReady();
    } catch {
      setStage('intake');
      setSubmitting(false);
      setError('The forge lost its connection. Check your network and try again.');
    }
  };

  const startCall = async () => {
    if (!forged || !PUBLIC_KEY || !ASSISTANT_ID) return;
    if (callState === 'connecting' || callState === 'live') return;
    setCallError(null);
    setCallState('connecting');
    trackEvent('sidekick_call_web_start', { business: form.business });
    try {
      if (!vapiRef.current) {
        const { default: VapiClient } = await import('@vapi-ai/web');
        const { hardenMicPath } = await import('@/lib/vapi-web');
        const vapi = new VapiClient(PUBLIC_KEY);
        vapi.on('call-start', () => {
          setCallState('live');
          hardenMicPath(vapi);
        });
        vapi.on('call-end', () => {
          setCallState('ended');
          setSpeaking(false);
          setVolume(0);
          trackEvent('sidekick_call_web_end', { business: form.business });
          document.getElementById('keep')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        vapi.on('speech-start', () => setSpeaking(true));
        vapi.on('speech-end', () => setSpeaking(false));
        vapi.on('volume-level', (v: number) => setVolume(v));
        vapi.on('error', (e: unknown) => {
          console.error('sidekick vapi error', e);
          setCallState('error');
          setCallError('The line dropped. Mind trying again?');
        });
        vapiRef.current = vapi;
      }
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessage: forged.call.firstMessage,
        model: forged.call.model,
        maxDurationSeconds: forged.call.maxDurationSeconds,
        metadata: forged.call.metadata,
      } as never);
    } catch (err) {
      console.error('sidekick call start failed', err);
      setCallState('error');
      setCallError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Your mic is blocked. Allow microphone access and tap again.'
          : 'Could not start the call. Try again in a moment, or use the phone option below.'
      );
    }
  };

  const stopCall = () => { vapiRef.current?.stop(); setCallState('ended'); };

  const ring = async () => {
    if (!forged || ringState === 'ringing') return;
    setRingMsg(null);
    const digits = cell.replace(/[^\d]/g, '');
    if (digits.length < 10) { setRingMsg('He needs a full US number, area code first.'); return; }
    setRingState('ringing');
    trackEvent('sidekick_ring_request', { business: form.business });
    try {
      const res = await fetch('/api/sidekick/forge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'phone', runId: forged.runId, phone: cell }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRingState('error');
        setRingMsg(data?.message || 'The call could not go out. The browser demo above still works.');
        return;
      }
      setRingState('rang');
    } catch {
      setRingState('error');
      setRingMsg('The call could not go out. The browser demo above still works.');
    }
  };

  const isLive = callState === 'live';
  const isConnecting = callState === 'connecting';
  const forgeEnabled = Boolean(PUBLIC_KEY && ASSISTANT_ID);

  return (
    <div className="relative">
      <style>{`
        @keyframes sk-stamp { 0% { transform: scale(1.6) rotate(-7deg); opacity: 0; } 60% { transform: scale(0.96) rotate(-2deg); opacity: 1; } 100% { transform: scale(1) rotate(-2deg); opacity: 1; } }
        @keyframes sk-rise { from { transform: translateY(14px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes sk-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .sk-stamp { animation: sk-stamp 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) both; }
        .sk-rise { animation: sk-rise 0.5s ease-out both; }
        .sk-caret { animation: sk-blink 1s step-start infinite; }
        @media (prefers-reduced-motion: reduce) { .sk-stamp, .sk-rise { animation: none; opacity: 1; transform: rotate(-2deg); } }
      `}</style>

      {/* ─── INTAKE ─── */}
      {stage === 'intake' && (
        <form onSubmit={forge} className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-8 shadow-[6px_6px_0_0_#161616]">
          <div className="flex items-center gap-3 mb-5 border-b-2 border-[#161616] pb-4">
            <Image src="/brand/mascot.png" alt="Mr. Mustard" width={46} height={46} className="rounded-full border-2 border-[#161616] bg-[#F5B700]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">Intake · The Forge</p>
              <p className="font-display text-lg font-black text-[#161616] leading-tight">Tell Mr. Mustard about your business.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sk-business" className={LABEL}>Business name</label>
              <input id="sk-business" className={FIELD} value={form.business} onChange={set('business')} placeholder="Trenton Plumbing" maxLength={80} required />
            </div>
            <div>
              <label htmlFor="sk-vertical" className={LABEL}>What kind of business</label>
              <select id="sk-vertical" className={FIELD} value={form.vertical} onChange={set('vertical')}>
                {sidekickVerticals.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sk-owner" className={LABEL}>Your first name</label>
              <input id="sk-owner" className={FIELD} value={form.ownerName} onChange={set('ownerName')} placeholder="Sam" maxLength={60} required />
            </div>
            <div>
              <label htmlFor="sk-city" className={LABEL}>Town</label>
              <input id="sk-city" className={FIELD} value={form.city} onChange={set('city')} placeholder="Kalispell, MT" maxLength={60} required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sk-services" className={LABEL}>What should he know? (services, prices, what customers ask)</label>
              <textarea id="sk-services" className={`${FIELD} min-h-[88px] resize-y`} value={form.services} onChange={set('services')} maxLength={400}
                placeholder="Emergency plumbing and water heaters. Service call is $89. We cover the whole valley. People always ask if we do weekends (we do)." required />
            </div>
            <div>
              <label htmlFor="sk-hours" className={LABEL}>Hours (optional)</label>
              <input id="sk-hours" className={FIELD} value={form.hours} onChange={set('hours')} placeholder="Mon-Sat 8-6" maxLength={120} />
            </div>
            <div>
              <label htmlFor="sk-email" className={LABEL}>Your email (unlocks the forge)</label>
              <input id="sk-email" type="email" className={FIELD} value={form.email} onChange={set('email')} placeholder="you@yourbusiness.com" required />
            </div>
          </div>

          {/* Honeypot: humans never see or fill this. */}
          <input id="sk-website" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />

          {error && <p className="mt-4 text-[#E0301E] text-sm font-body font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !forgeEnabled}
            className="mt-6 w-full rounded-full bg-[#F5B700] border-2 border-[#161616] px-8 py-4 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {forgeEnabled ? 'Forge my Sidekick (free, 60 seconds)' : 'The forge is warming up. Check back shortly.'}
          </button>
          <p className="mt-3 text-center text-[11px] font-mono text-[#161616]/50">
            One free forge per business. No card. He talks to you live when he graduates.
          </p>
        </form>
      )}

      {/* ─── FORGING: the training montage ─── */}
      {stage === 'forging' && (
        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] p-6 md:p-8 shadow-[6px_6px_0_0_#F5B700] min-h-[380px]">
          <div className="flex items-center gap-3 mb-5">
            <Image src="/brand/mascot.png" alt="Mr. Mustard training your Sidekick" width={46} height={46} className="rounded-full border-2 border-[#F5B700] bg-[#F5B700] animate-pulse" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">Training in progress</p>
              <p className="font-display text-lg font-black text-[#FBF6EA] leading-tight">Mr. Mustard is forging {form.business.trim()}&apos;s front desk.</p>
            </div>
          </div>
          <div className="font-mono text-[13px] md:text-sm leading-7 text-[#FBF6EA]/90">
            {logLines.filter((l): l is string => typeof l === 'string').map((line, i) => (
              <p key={i} className={`sk-rise ${line.startsWith('[') ? 'text-[#F5B700] font-bold' : ''}`}>{line}</p>
            ))}
            <span className="sk-caret inline-block w-2.5 h-4 bg-[#F5B700] align-middle ml-0.5" />
          </div>
        </div>
      )}

      {/* ─── READY: badge + live call + encore ─── */}
      {stage === 'ready' && forged && (
        <div className="space-y-6">
          {/* The stamped nameplate */}
          {badgeStamped && (
            <div className="sk-stamp mx-auto max-w-md rounded-2xl border-[3px] border-[#161616] bg-white shadow-[8px_8px_0_0_#161616] overflow-hidden">
              <div className="bg-[#F5B700] border-b-[3px] border-[#161616] px-5 py-2 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#161616]">Front desk · Certified</span>
                <Image src="/brand/mascot.png" alt="" width={26} height={26} className="rounded-full border-2 border-[#161616]" />
              </div>
              <div className="px-5 py-4 text-center">
                <p className="font-display text-2xl md:text-3xl font-black text-[#161616] leading-tight">{form.business.trim()}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#161616]/55 mt-1.5">
                  Trained by Mr. Mustard · Class of one · {form.city.trim()}
                </p>
              </div>
            </div>
          )}

          {/* The live call */}
          <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-7 md:p-9 shadow-[6px_6px_0_0_#F5B700]">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative flex-shrink-0">
                {isLive && (
                  <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[#F5B700] opacity-30 animate-ping" style={{ animationDuration: '1.6s' }} />
                )}
                <button
                  type="button"
                  onClick={isLive ? stopCall : startCall}
                  disabled={isConnecting}
                  aria-label={isLive ? 'End the call' : `Talk to ${form.business}'s new front desk`}
                  className={`relative w-24 h-24 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 ${
                    isLive
                      ? 'bg-[#E0301E] border-white shadow-[0_0_40px_rgba(224,48,30,0.45)]'
                      : 'bg-[#F5B700] border-[#161616] shadow-[3px_3px_0_0_#FBF6EA] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#FBF6EA]'
                  } ${isConnecting ? 'opacity-60 cursor-wait' : ''}`}
                  style={isLive ? { transform: `scale(${1 + Math.min(volume, 1) * 0.12})` } : undefined}
                >
                  {isLive ? (
                    <span className="block w-7 h-7 rounded-[4px] bg-white" />
                  ) : (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <rect x="9" y="3" width="6" height="11" rx="3" fill="#161616" />
                      <path d="M5 11a7 7 0 0 0 14 0" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                      <path d="M12 18v3" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <span className="text-[10px] uppercase tracking-[0.35em] text-[#F5B700] font-mono font-bold block mb-1.5">
                  {isLive ? (speaking ? 'Your Sidekick is talking' : 'Listening to you') : isConnecting ? 'Connecting…' : callState === 'ended' ? 'Call ended' : 'He graduated. Say hello.'}
                </span>
                <p className="font-display text-xl md:text-2xl font-black tracking-tight leading-snug mb-1.5">
                  {isLive
                    ? `You are live with ${form.business.trim()}'s front desk.`
                    : callState === 'ended'
                      ? 'So. Want to keep him?'
                      : `${form.business.trim()}'s new front desk is on the line.`}
                </p>
                <p className="text-[#FBF6EA]/65 text-sm font-body leading-relaxed max-w-md">
                  {isLive
                    ? 'Pretend you are a customer. Ask about prices, book something, throw him a curveball. He can also book 15 minutes with Sarah without hanging up.'
                    : callState === 'ended'
                      ? 'That was a demo trained in sixty seconds. Imagine him after Sarah hand-tunes him on your real call flows.'
                      : 'Tap the mic. He answers as YOUR business, knows what you taught him, and takes the rest like a pro.'}
                </p>
                {callError && <p className="text-[#FF8550] text-xs font-mono mt-2">{callError}</p>}
              </div>
              {isLive && (
                <button
                  type="button"
                  onClick={stopCall}
                  className="px-5 py-2.5 rounded-full border-2 border-[#E0301E] bg-[#E0301E] text-white text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold hover:bg-[#c22717] transition-all"
                >
                  End call
                </button>
              )}
            </div>
          </div>

          {/* The encore: he calls your cell */}
          <div className="rounded-2xl border-2 border-[#161616] bg-white p-6 md:p-7 shadow-[6px_6px_0_0_#161616]">
            {ringState === 'rang' ? (
              <div className="text-center py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold mb-2">Pick up. It&apos;s him.</p>
                <p className="font-display text-2xl font-black text-[#161616]">Your phone is about to ring from {forged.phoneLine}.</p>
                <p className="font-body text-sm text-[#161616]/65 mt-2">That number is Mr. Mustard&apos;s own line. Save it. If you miss the call, he does not call twice (he is polite like that).</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
                <div className="flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold mb-1.5">The full effect</p>
                  <p className="font-display text-lg md:text-xl font-black text-[#161616] leading-snug mb-3">
                    Want to feel what your customers will feel? He&apos;ll call your cell. Right now.
                  </p>
                  <label htmlFor="sk-cell" className={LABEL}>Your cell (US)</label>
                  <input id="sk-cell" type="tel" className={FIELD} value={cell} onChange={(e) => setCell(e.target.value)} placeholder="(406) 555-0123" />
                </div>
                <button
                  type="button"
                  onClick={ring}
                  disabled={ringState === 'ringing'}
                  className="rounded-full bg-[#161616] border-2 border-[#161616] px-7 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5 disabled:opacity-50 whitespace-nowrap"
                >
                  {ringState === 'ringing' ? 'Dialing…' : 'Call me'}
                </button>
              </div>
            )}
            {ringMsg && <p className="mt-3 text-[#E0301E] text-sm font-body font-semibold">{ringMsg}</p>}
            {ringState !== 'rang' && (
              <p className="mt-3 text-[11px] font-mono text-[#161616]/45">
                One demo call per number, ever. He calls from {forged.phoneLine} and the whole thing is capped at four minutes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── KEEP HIM (always present below the forge) ─── */}
      {/* Breaks out of the intake column so the pricing row gets full width. */}
      <div id="keep" className="pt-14 md:pt-20 md:relative md:left-1/2 md:-translate-x-1/2 md:w-[min(100vw-2.5rem,56rem)]">
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ Keep him ]</p>
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
            He already knows your business.<br className="hidden md:block" /> Put him on the phones.
          </h2>
          <p className="font-body text-[#161616]/65 max-w-xl mx-auto mt-4">
            Sarah hand-installs your Sidekick on a real line within 7 days. Hard-capped minutes, month to month, {SIDEKICK.creditNote.charAt(0).toLowerCase() + SIDEKICK.creditNote.slice(1)}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {sidekickTiers.map((tier) => (
            <PricingCard key={tier.slug} tier={tier} business={form.business.trim() || undefined} runId={forged?.runId} />
          ))}
        </div>
        <p className="text-center mt-6 font-body text-sm text-[#161616]/60">
          Phones ring more than 600 minutes a month? You want the full custom concierge.{' '}
          <a href="/voice-agents" className="text-[#1E50C8] font-semibold underline underline-offset-2">Start here</a> or book Sarah from the demo call.
        </p>
      </div>
    </div>
  );
}

function PricingCard({ tier, business, runId }: { tier: (typeof sidekickTiers)[number]; business?: string; runId?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    trackEvent('sidekick_checkout_click', { tier: tier.slug });
    try {
      const res = await fetch('/api/sidekick/checkout', {
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
          Most kept
        </span>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold">{tier.chip}</p>
      <h3 className="font-display text-2xl font-black text-[#161616] mt-1.5">{tier.name}</h3>
      <p className="mt-3">
        <span className="font-display text-4xl font-black text-[#161616]">${sidekickUsd(tier.monthlyCents)}</span>
        <span className="font-body text-sm text-[#161616]/60">/mo + ${sidekickUsd(tier.setupCents)} setup</span>
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
        {busy ? 'Opening checkout…' : tier.cta}
      </button>
      {msg && <p className="mt-3 text-[#E0301E] text-xs font-body font-semibold">{msg}</p>}
    </div>
  );
}
