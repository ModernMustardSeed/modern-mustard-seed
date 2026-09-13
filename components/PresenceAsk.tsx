'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * THE ASK AT THE FOOT OF A PRESENCE AUDIT.
 *
 * What it replaced: "So we already built it. A website for you, a voice agent,
 * and a plan. All free to look at, all yours, no card and no meeting." That is
 * eager, and eager reads as cheap. It also spends the most interesting thing we
 * have before the owner has asked for it, and it makes the work look like
 * something that falls out of a machine rather than something a person does.
 *
 * What it says instead: here is what we can make you, tell us which of it you
 * want, and we will walk you through it together. The build happens because they
 * asked, and the call happens because there is something to look at. Same
 * generosity, none of the desperation.
 *
 * TWO DOORS, and both of them end at the same place:
 *
 *   1. Pick what you want built, then book the call to go through it.
 *   2. Skip the build. Just book the call and talk about this page.
 *
 * The second door exists because an owner who is interested but not ready to be
 * built something should not have to pretend otherwise to get a conversation.
 *
 * The AI integration plan is on the list and free either way, which is true and
 * is the least demanding thing on it: a document he keeps whether or not he ever
 * calls back.
 *
 * NOT ON THE LIST: the Business Command Center. It sells on its own page at its
 * own price and is never suggested, bundled or stamped free.
 */

const WANTS = [
  {
    key: 'website',
    label: 'A website',
    detail: 'Built the way this audit says it should be, on your own domain, in your own account.',
  },
  {
    key: 'voice',
    label: 'A voice agent that answers your phone',
    detail: 'It picks up while you are on a job, answers questions, and books the work.',
  },
  {
    key: 'plan',
    label: 'An AI integration plan',
    detail: 'Written for your business, step by step, honest enough that you could do it yourself. Free, and yours to keep.',
  },
];

export default function PresenceAsk({
  business,
  leadId,
  score,
}: {
  business: string;
  leadId: string;
  score: number;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(['website']);
  const [sending, setSending] = useState(false);

  const toggle = (key: string) =>
    setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]));

  /** Both doors land on /book. The difference is whether we build first. */
  const goToBooking = (focus: string) => {
    const q = new URLSearchParams({ business, focus });
    router.push(`/book?${q.toString()}`);
  };

  const requestAndBook = async () => {
    if (!picked.length) return;
    setSending(true);
    const labels = WANTS.filter((w) => picked.includes(w.key)).map((w) => w.label.toLowerCase());
    try {
      // Recorded before the redirect, so the request survives even if they close
      // the booking page without finishing it. A person asked; that is worth
      // knowing whether or not they pick a time.
      await fetch('/api/audit-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, want: picked, business }),
      });
    } catch {
      /* The booking is the product. A failed log never blocks it. */
    }
    goToBooking(
      `Scored ${score} on the presence audit. Would like us to build: ${labels.join(', ')}. `
      + 'Booking the call to go through it.',
    );
  };

  return (
    <section className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-6 sm:p-9 shadow-[5px_5px_0_0_#F5B700]">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#F5B700]">
        What we would do about it
      </span>
      <h2 className="font-display text-2xl sm:text-3xl font-black mt-2 leading-tight">
        We can take {business} to an <span className="text-[#F5B700]">A+</span>.
      </h2>
      <p className="font-body text-[15px] leading-relaxed text-[#FBF6EA]/85 mt-3 max-w-2xl">
        Tell us what you would like us to make, and we will build it and walk you through it on a call.
        Or skip the build and just book the call to talk about what is on this page. Either way you are
        not committing to anything, and the plan is yours to keep.
      </p>

      <fieldset className="mt-6">
        <legend className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#FBF6EA]/55 mb-3">
          What would you like us to build?
        </legend>
        <div className="grid gap-2.5">
          {WANTS.map((w) => {
            const on = picked.includes(w.key);
            return (
              <label
                key={w.key}
                className={`flex gap-3 items-start cursor-pointer rounded-xl border-2 p-3.5 transition-colors ${
                  on ? 'border-[#F5B700] bg-[#F5B700]/10' : 'border-[#FBF6EA]/25 hover:border-[#FBF6EA]/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(w.key)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`mt-0.5 grid place-items-center h-5 w-5 shrink-0 rounded-md border-2 font-mono text-[11px] font-bold ${
                    on ? 'border-[#F5B700] bg-[#F5B700] text-[#161616]' : 'border-[#FBF6EA]/45 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block font-sans text-[15px] font-bold">{w.label}</span>
                  <span className="block font-body text-[13.5px] leading-relaxed text-[#FBF6EA]/70 mt-0.5">
                    {w.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={requestAndBook}
          disabled={sending || picked.length === 0}
          className="inline-block bg-[#F5B700] text-[#161616] border-2 border-[#F5B700] rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {sending ? 'One moment' : 'Build these and book the call'}
        </button>
        <button
          type="button"
          onClick={() =>
            goToBooking(`Scored ${score} on the presence audit. Booking a call to talk through what is on it.`)
          }
          className="inline-block border-2 border-[#FBF6EA]/40 rounded-xl px-6 py-3 font-sans font-bold uppercase tracking-[0.1em] text-sm text-[#FBF6EA] hover:border-[#FBF6EA]"
        >
          Just book a call
        </button>
      </div>

      <p className="font-body text-[13.5px] leading-relaxed text-[#FBF6EA]/60 mt-5">
        Would rather talk now? Call Mr. Mustard, our own AI, on{' '}
        <a href="tel:+14063121223" className="font-mono font-bold text-[#F5B700] underline decoration-2 underline-offset-4">
          (406) 312-1223
        </a>{' '}
        and he will book it while you are on the line.
      </p>
    </section>
  );
}
