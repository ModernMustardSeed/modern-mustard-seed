'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next') || '/admin';
  const linkError = params.get('e') === 'link';

  const [email, setEmail] = useState(params.get('email') || '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password fallback (env owner), hidden by default.
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else setError('Something went wrong. Try again.');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const signInPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(nextPath);
        router.refresh();
      } else setError(data.error ?? 'Login failed');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#FBF6EA] halftone-bg">
      <div className="w-full max-w-sm bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 md:p-10">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-medium block mb-3">Modern Mustard Seed</span>
          <h1 className="font-sans text-2xl font-semibold text-[#161616] tracking-tight">Command Center</h1>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[#F5B700]/20 border border-[#161616]/25 flex items-center justify-center mx-auto mb-5">
              <span className="text-[#161616] text-xl">✉️</span>
            </div>
            <h2 className="font-sans text-lg font-semibold text-[#161616] mb-2">Check your email</h2>
            <p className="text-[#3A3733] font-body text-sm leading-relaxed">
              If <strong>{email}</strong> is on the team, a one-tap sign-in link is on its way. It expires in 20 minutes.
            </p>
            <button onClick={() => setSent(false)} className="mt-6 text-[12px] font-mono uppercase tracking-[0.15em] text-[#1E50C8] hover:text-[#161616]">
              Use a different email
            </button>
          </div>
        ) : usePassword ? (
          <form onSubmit={signInPassword} className="space-y-5">
            <Field label="Email">
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@modernmustardseed.com" />
            </Field>
            <Field label="Password">
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Password" />
            </Field>
            {error && <p className="text-[#E0301E] text-sm font-body text-center">{error}</p>}
            <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Signing in...' : 'Sign in'}</button>
            <button type="button" onClick={() => { setUsePassword(false); setError(''); }} className="w-full text-[12px] font-mono uppercase tracking-[0.15em] text-[#1E50C8] hover:text-[#161616]">
              Email me a link instead
            </button>
          </form>
        ) : (
          <form onSubmit={sendLink} className="space-y-5">
            {linkError && <p className="text-[#E0301E] text-sm font-body text-center">That link expired or was invalid. Enter your email for a fresh one.</p>}
            <Field label="Email">
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@modernmustardseed.com" />
            </Field>
            {error && <p className="text-[#E0301E] text-sm font-body text-center">{error}</p>}
            <button type="submit" disabled={loading} className={btnCls}>{loading ? 'Sending...' : 'Email me a sign-in link'}</button>
            <p className="text-center text-[#161616]/45 font-body text-[12px]">No password. We email you a one-tap link.</p>
            <button type="button" onClick={() => { setUsePassword(true); setError(''); }} className="w-full text-[11px] font-mono uppercase tracking-[0.15em] text-[#161616]/40 hover:text-[#161616]">
              Use a password instead
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]';
const btnCls =
  'w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-50 transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-2">{label}</label>
      {children}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
