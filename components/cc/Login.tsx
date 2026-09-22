'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, cx, inputCls } from '@/components/cc/ui';

/**
 * THE DOOR. Email, then a six digit code. No password to forget, nothing to
 * share. One sign-in: it opens the Command Center and the project portal both,
 * and a portal link opens this too, so nobody is asked twice.
 */

export default function Login() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'code') setTimeout(() => codeRef.current?.focus(), 30);
  }, [step]);

  const askForCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/cc/request-code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setError(j.error ?? 'That did not go through.');
        return;
      }
      setStep('code');
    } catch {
      setError('That did not go through.');
    } finally {
      setBusy(false);
    }
  };

  const signIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/cc/verify-code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, code }) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setError(j.error ?? 'That code did not work.');
        return;
      }
      window.location.href = '/cc';
    } catch {
      setError('That code did not work.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="min-h-screen grid lg:grid-cols-2 bg-[#F6F7F9] text-[#12151b]"
      style={{ ['--cc-ink' as string]: '#12151b', ['--cc-line' as string]: '#E4E7EC', ['--cc-muted' as string]: '#5B6472', ['--cc-accent' as string]: '#1E50C8', ['--cc-card' as string]: '#fff' }}
    >
      <section className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[380px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#5B6472]">Command Center</p>
          <h1 className="mt-2 font-display text-[30px] leading-tight">Sign in</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[#5B6472]">
            {step === 'email' ? 'Your business email. We send a six digit code, good for fifteen minutes.' : `We sent a code to ${email}. It works once.`}
          </p>

          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void (step === 'email' ? askForCode() : signIn());
            }}
          >
            {step === 'email' ? (
              <input
                className={inputCls}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourbusiness.com"
                aria-label="Email address"
              />
            ) : (
              <input
                ref={codeRef}
                className={cx(inputCls, 'text-center text-[26px] font-semibold tracking-[0.34em]')}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                aria-label="Six digit code"
              />
            )}

            {error && <p className="text-[13px] text-[#B42318]">{error}</p>}

            <Button kind="primary" type="submit" full disabled={busy || (step === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : code.length !== 6)}>
              {busy ? 'One moment' : step === 'email' ? 'Send my code' : 'Open the Command Center'}
            </Button>

            {step === 'code' && (
              <div className="flex items-center justify-between pt-1">
                <button type="button" className="text-[12.5px] text-[#5B6472] underline" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
                  Use a different address
                </button>
                <button type="button" className="text-[12.5px] text-[#5B6472] underline" onClick={askForCode} disabled={busy}>
                  Send another code
                </button>
              </div>
            )}
          </form>

          <p className="mt-8 text-[12.5px] leading-relaxed text-[#5B6472]">
            This is not your project portal. If you are looking for your build, your files and your invoices, that is{' '}
            <a href="/portal" className="underline">
              the portal
            </a>
            .
          </p>
        </div>
      </section>

      <section className="hidden lg:flex flex-col justify-center bg-[#0F1218] px-14 py-14 text-white">
        <div className="max-w-[520px]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">What is behind this door</p>
          <h2 className="mt-3 font-display text-[32px] leading-[1.15]">The whole business, on one board.</h2>
        </div>
        <ul className="mt-8 max-w-[520px] space-y-4 text-[14.5px] leading-relaxed text-white/75">
          {[
            ['Leads', 'Every person who reached out, the door they used, and who is still waiting on a call.'],
            ['Inbox', 'Your mail read twice an hour, sorted, with a reply drafted in your voice. Nothing sends itself.'],
            ['Conversations', 'What people asked your website at eleven at night, in their own words.'],
            ['Reviews', 'The ask that goes out the day a job closes, and the record so nobody is asked twice.'],
            ['Marketing', 'What goes out this week, and one box to say something in your own words.'],
            ['Operator', 'Ask it anything about your business. It can draft, ask, mark and make, and it shows receipts.'],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[#F5B700]" />
              <span>
                <span className="font-semibold text-white">{t}. </span>
                {d}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-[520px] text-[12px] text-white/40">
          Built and run by{' '}
          <a href="https://modernmustardseed.com" className="text-[#F5B700] hover:underline">
            Modern Mustard Seed
          </a>
          .
        </p>
      </section>
    </main>
  );
}
