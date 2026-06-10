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
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#FBF6EA] halftone-bg">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 md:p-10">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-medium block mb-3">
            Modern Mustard Seed
          </span>
          <h1 className="font-sans text-2xl font-semibold text-[#161616] tracking-tight">
            Admin
          </h1>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-2">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              placeholder="sarah@modernmustardseed.com"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase tracking-[0.3em] text-[#161616]/50 font-mono font-bold block mb-2">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 text-sm text-[#161616] font-body placeholder-[#161616]/30 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              placeholder="Password"
            />
          </div>
          {error && <p className="text-[#E0301E] text-sm font-body text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 disabled:opacity-50 transition-all"
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
