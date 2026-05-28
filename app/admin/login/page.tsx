'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next') || '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
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
      } else {
        setError(data.error ?? 'Login failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#1A1140]">
      <form onSubmit={submit} className="w-full max-w-sm glass-card p-8 md:p-10">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium block mb-3">
            Modern Mustard Seed
          </span>
          <h1 className="font-sans text-2xl font-semibold text-white tracking-tight">
            Admin
          </h1>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30"
              placeholder="sarah@modernmustardseed.com"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-mono font-bold block mb-2">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3 text-sm text-white font-body placeholder-white/15 focus:outline-none focus:border-mustard-500/30"
              placeholder="Password"
            />
          </div>
          {error && <p className="text-red-400 text-sm font-body text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white bg-gradient-to-r from-mustard-600 via-mustard-500 to-mustard-400 rounded-lg disabled:opacity-50 hover:shadow-[0_0_30px_rgba(78,205,196,0.25)] transition-all"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
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
