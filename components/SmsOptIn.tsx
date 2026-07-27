'use client';

import { useState } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics';

/**
 * THE TEXT LINE opt-in form. This is the canonical, always-visible consent
 * surface for our A2P 10DLC campaign: carriers and TCR reviewers open
 * /sms directly and must find (a) a real opt-in mechanism, (b) the express
 * consent disclosure sitting next to the button, and (c) links to the privacy
 * policy and terms. It therefore renders IDENTICALLY whether or not Twilio is
 * armed. Never hide this behind an env gate: the campaign's message flow names
 * this URL, and a reviewer who lands on a page that does not match the
 * described flow fails the campaign (errors 30882 + 30908, learned 2026-07-27).
 *
 * Signature moment: the phone on the right renders the EXACT first message the
 * visitor will receive, live as they type. It doubles as the campaign's
 * message-sample disclosure, so the compliance requirement is the delight.
 */

const CARD = 'bg-white border-[3px] border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#1E50C8]';
const FIELD =
  'w-full rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-3.5 py-2.5 font-body text-[15px] text-[#161616] placeholder:text-[#161616]/45 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
const CTA =
  'mt-5 w-full bg-[#F5B700] text-[#161616] border-2 border-[#161616] rounded-xl px-6 py-3.5 font-sans font-bold uppercase tracking-[0.1em] text-[14px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:hover:translate-y-0';

/** The exact opener our system sends. Kept in sync with /api/textback. */
export function previewBody(name: string, need: string): string {
  const first = name.trim().split(/\s+/)[0];
  return (
    `Hey${first ? ` ${first}` : ''}! Sarah's team at Modern Mustard Seed here. ` +
    `You asked for a text from our site${need.trim() ? ` about: "${need.trim()}"` : ''}. ` +
    `What are you working on? Reply here and a human answers. Reply STOP to opt out.`
  );
}

export default function SmsOptIn() {
  const [name, setName] = useState('');
  const [need, setNeed] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [honey, setHoney] = useState('');
  const [phase, setPhase] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [note, setNote] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'sending' || phase === 'sent') return;
    setPhase('sending');
    setNote('');
    track('sms_optin_submit');
    try {
      const res = await fetch('/api/textback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          need,
          company_url: honey,
          consent: true,
          consent_text: CONSENT_TEXT,
          source_url: typeof window !== 'undefined' ? window.location.href : '/sms',
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message || 'That did not go through. Call (406) 312-1223 instead.');
      track('sms_optin_sent');
      setNote(json.message || '');
      setPhase('sent');
    } catch (err) {
      setPhase('error');
      setNote(err instanceof Error ? err.message : 'That did not go through. Call (406) 312-1223 instead.');
    }
  }

  return (
    <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      {/* ── the form ── */}
      <div className="lg:col-span-7">
        {phase === 'sent' ? (
          <div className="bg-[#161616] border-[3px] border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-8 text-center">
            <span className="inline-block text-4xl animate-[soBuzz_.5s_ease-in-out_3]" aria-hidden>
              📱
            </span>
            <style>{`@keyframes soBuzz{0%,100%{transform:rotate(0)}25%{transform:rotate(-9deg)}75%{transform:rotate(9deg)}}`}</style>
            <h2 className="font-display font-extrabold text-3xl text-[#FBF6EA] mt-3">You are on the line.</h2>
            <p className="font-body text-[15px] text-[#FBF6EA]/75 mt-3 max-w-md mx-auto leading-relaxed">
              {note || 'Check your phone. Reply to that text and a human picks up the thread.'}
            </p>
            <p className="font-body text-[12.5px] text-[#FBF6EA]/55 mt-4">
              Changed your mind? Reply STOP to any message and we stop immediately.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className={`${CARD} p-6 sm:p-8`}>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] font-bold text-[#C4160B]">Step one of one</p>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#161616] mt-2 leading-[1.05]">
              Give us your <em className="italic text-[#8f6600]">number</em>.
            </h2>
            <p className="font-body text-[15px] text-[#3d382e] mt-3 leading-relaxed">
              We text you first, so the thread is already open. Reply whenever. A human answers, never a bot.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-[#161616]/70">Mobile number</span>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(406) 555-0123"
                  className={`${FIELD} mt-1.5`}
                />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-[#161616]/70">First name (optional)</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan"
                  className={`${FIELD} mt-1.5`}
                />
              </label>
            </div>

            <label className="block mt-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-[#161616]/70">What do you need? (optional)</span>
              <input
                type="text"
                maxLength={200}
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                placeholder="Missed calls are costing us jobs"
                className={`${FIELD} mt-1.5 text-[14px]`}
              />
            </label>

            {/* Honeypot: humans never see it. */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honey}
              onChange={(e) => setHoney(e.target.value)}
              className="hidden"
              aria-hidden
            />

            {/* Express written consent. Unchecked by default, on purpose. */}
            <label className="flex gap-3 mt-6 cursor-pointer rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] p-4 hover:border-[#161616]/35 transition-colors">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#F5B700] border-2 border-[#161616]"
              />
              <span className="font-body text-[13px] text-[#161616]/80 leading-relaxed">{CONSENT_TEXT_JSX}</span>
            </label>

            <button type="submit" disabled={phase === 'sending'} className={CTA}>
              {phase === 'sending' ? 'Opening the thread…' : 'Text me back →'}
            </button>

            {phase === 'error' && note ? (
              <p role="alert" className="font-body text-[13px] text-[#C4160B] text-center mt-3">
                {note}
              </p>
            ) : null}

            <p className="font-body text-[12px] text-[#161616]/70 mt-4 text-center leading-relaxed">
              Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.
            </p>
          </form>
        )}
      </div>

      {/* ── signature moment: the live phone ── */}
      <div className="lg:col-span-5">
        <PhonePreview name={name} need={need} />
      </div>
    </div>
  );
}

const CONSENT_TEXT =
  'By checking this box and tapping Text me back, I agree to receive text messages from Modern Mustard Seed at the mobile number I provided, including messages sent by an automated system. Consent is not a condition of any purchase. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.';

const CONSENT_TEXT_JSX = (
  <>
    By checking this box and tapping <strong className="font-bold text-[#161616]">Text me back</strong>, I agree to receive text
    messages from Modern Mustard Seed at the mobile number I provided, including messages sent by an automated system.{' '}
    <strong className="font-bold text-[#161616]">Consent is not a condition of any purchase.</strong> Message frequency varies.
    Message and data rates may apply. Reply STOP to opt out, HELP for help. See our{' '}
    <Link href="/privacy" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
      Privacy Policy
    </Link>{' '}
    and{' '}
    <Link href="/terms" className="font-bold text-[#1E50C8] underline decoration-2 underline-offset-2 hover:text-[#C4160B]">
      Terms of Service
    </Link>
    .
  </>
);

/** The phone that shows the real first message, live as you type. */
function PhonePreview({ name, need }: { name: string; need: string }) {
  const body = previewBody(name, need);
  return (
    <div className="relative lg:sticky lg:top-28">
      <div className="mx-auto w-full max-w-[300px] rotate-[1.5deg]">
        <div className="rounded-[2.25rem] border-[3px] border-[#161616] bg-[#161616] p-2.5 shadow-[10px_10px_0_0_#F5B700]">
          <div className="rounded-[1.65rem] bg-[#FBF6EA] overflow-hidden">
            {/* status bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <span className="font-mono text-[9px] font-bold text-[#161616]/60">9:41</span>
              <span className="h-1.5 w-14 rounded-full bg-[#161616]/20" aria-hidden />
              <span className="font-mono text-[9px] font-bold text-[#161616]/60">▮▮▮</span>
            </div>
            {/* thread header */}
            <div className="border-y-2 border-[#161616]/10 px-4 py-2.5 text-center">
              <p className="font-sans font-bold text-[12px] text-[#161616]">Modern Mustard Seed</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#161616]/50">(406) 407-9405</p>
            </div>
            {/* the message */}
            <div className="px-3 py-4 min-h-[230px] flex flex-col justify-end gap-2">
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border-2 border-[#161616] bg-white px-3.5 py-2.5 shadow-[3px_3px_0_0_#1E50C8]">
                <p className="font-body text-[12.5px] leading-[1.45] text-[#161616]">{body}</p>
              </div>
              <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-[#161616]/40 pl-1">Delivered</p>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#8f6600]">
        ↑ The actual text you will get
      </p>
      <p className="mt-2 text-center font-body text-[12.5px] text-[#161616]/70 max-w-[290px] mx-auto leading-relaxed">
        No mystery, no bait. This updates as you type, because you should see the message before you agree to it.
      </p>
    </div>
  );
}
