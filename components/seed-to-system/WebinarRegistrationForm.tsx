'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';

type Props = {
  compact?: boolean;
};

export default function WebinarRegistrationForm({ compact = false }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idea, setIdea] = useState('');
  const [company, setCompany] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/one-person-business/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, idea, company }),
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error || 'Registration failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div
        className="rounded-lg border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]"
        role="status"
      >
        <CheckCircle2 className="h-8 w-8 text-[#167D56]" aria-hidden="true" />
        <h3 className="mt-4 font-display text-2xl font-black text-[#161616]">
          Your seat is on the list.
        </h3>
        <p className="mt-3 font-body text-sm leading-relaxed text-[#3A3733]">
          Check your inbox for Sarah&apos;s confirmation. The live date, private room link, and one-page Engine Map
          will come by email.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-lg border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] ${
        compact ? 'p-5 md:p-6' : 'p-6 md:p-8'
      }`}
    >
      <div className="mb-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#B62618]">
          Free live class
        </p>
        <h2 className="mt-2 font-display text-2xl font-black text-[#161616] md:text-3xl">
          Save my seat
        </h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-[#5C554A]">
          The first live date and private room link go to this list first.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">First name</span>
          <input
            type="text"
            required
            autoComplete="given-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="First name"
            className="w-full rounded-lg border-2 border-[#161616] bg-[#FFFDF6] px-4 py-3 font-body text-[#161616] outline-none placeholder:text-[#161616]/35 focus:ring-2 focus:ring-[#F5B700]"
          />
        </label>
        <label className="block">
          <span className="sr-only">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full rounded-lg border-2 border-[#161616] bg-[#FFFDF6] px-4 py-3 font-body text-[#161616] outline-none placeholder:text-[#161616]/35 focus:ring-2 focus:ring-[#F5B700]"
          />
        </label>
        <label className="block">
          <span className="sr-only">The idea you are carrying</span>
          <textarea
            rows={compact ? 2 : 3}
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="What are you trying to build? (optional)"
            className="w-full resize-none rounded-lg border-2 border-[#161616] bg-[#FFFDF6] px-4 py-3 font-body text-[#161616] outline-none placeholder:text-[#161616]/35 focus:ring-2 focus:ring-[#F5B700]"
          />
        </label>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {error ? <p className="mt-3 font-body text-sm text-[#B62618]">{error}</p> : null}

      <button
        type="submit"
        disabled={sending || !name.trim() || !email.trim()}
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#161616] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Saving your seat
          </>
        ) : (
          <>
            Save my seat
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </>
        )}
      </button>

      <p className="mt-3 text-center font-body text-[11px] leading-relaxed text-[#5C554A]">
        Free. No card. Useful emails from Sarah. Unsubscribe any time.
      </p>
    </form>
  );
}
