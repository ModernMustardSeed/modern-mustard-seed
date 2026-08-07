'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';

/**
 * Mr. Mustard, in the member's Command Center.
 *
 * The thing that replaced the weekly call. He has read their whole plan, so the
 * opener is a real question about their actual gate rather than "how can I help
 * you today", and when the answer is something that has to be built he files it
 * while they watch.
 */

type Turn = { role: 'user' | 'assistant'; text: string };
type Filed = { name: string; kind: string; approval: boolean; studio: boolean };

export default function CoachPanel({
  firstName,
  windowTitle,
  gateLabel,
  onFiled,
}: {
  firstName?: string | null;
  windowTitle?: string | null;
  gateLabel?: string | null;
  onFiled?: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filed, setFiled] = useState<Filed[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError(null);
    const next = [...turns, { role: 'user' as const, text: message }];
    setTurns(next);
    setInput('');
    try {
      const res = await fetch('/api/portal/hundredfold/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history: turns }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'He lost the thread.');
      setTurns([...next, { role: 'assistant', text: data.say as string }]);
      if (Array.isArray(data.filed) && data.filed.length) {
        setFiled((f) => [...f, ...(data.filed as Filed[])]);
        onFiled?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  // Openers written against where they actually are, so the first click is
  // never "what do I even ask it".
  const openers = [
    gateLabel ? `What is stopping me clearing "${gateLabel.slice(0, 60)}"?` : 'What should I do first this week?',
    'Write me the follow-up sequence for the people who never booked.',
    'What do I say when they tell me they need to think about it?',
    'Build me a page for the offer.',
  ];

  return (
    <div className="pop-card overflow-hidden">
      <div className="bg-[#161616] px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700] shrink-0" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#FBF6EA] truncate">
            Mr. Mustard · your coach
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#FBF6EA]/45 shrink-0 hidden sm:block">
          {windowTitle ? windowTitle.slice(0, 32) : 'Any hour'}
        </span>
      </div>

      <div ref={scrollRef} className="max-h-[46vh] min-h-[240px] overflow-y-auto px-5 py-5 space-y-4 bg-[#FFFDF6]">
        {turns.length === 0 && (
          <div className="py-4">
            <p className="font-body text-[#161616] text-sm md:text-base leading-relaxed">
              {firstName ? `${firstName}, I` : 'I'} have read your whole plan, so you do not have to catch me
              up. Ask me anything about your business, or tell me what is stuck. If the answer is something
              that needs building, I will file it and it will show up in your arsenal.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {openers.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => void send(o)}
                  className="px-3 py-2 rounded-lg border-2 border-[#161616]/25 bg-white text-[#161616] font-body text-xs hover:border-[#161616] transition-colors text-left"
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className={t.role === 'assistant' ? '' : 'flex justify-end'}>
            <div
              className={`max-w-[88%] px-4 py-3 rounded-2xl border-2 border-[#161616] font-body text-sm leading-relaxed whitespace-pre-line ${
                t.role === 'assistant'
                  ? 'bg-white text-[#161616] rounded-tl-sm'
                  : 'bg-[#F5B700] text-[#161616] rounded-tr-sm ml-auto'
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}

        {busy && (
          <div className="max-w-[88%] px-4 py-3 rounded-2xl rounded-tl-sm border-2 border-[#161616] bg-white">
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((d) => (
                <span
                  key={d}
                  className="w-1.5 h-1.5 rounded-full bg-[#161616]/40 animate-bounce"
                  style={{ animationDelay: `${d * 120}ms` }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {filed.length > 0 && (
        <div className="border-t-2 border-[#161616] px-5 py-3.5 bg-[#FFF8E6]">
          <span className="block text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#8f6600] mb-2">
            Filed in this conversation
          </span>
          <ul className="space-y-1">
            {filed.map((f, i) => (
              <li key={i} className="font-body text-xs text-[#161616]">
                <span className="font-extrabold">{f.name}</span>{' '}
                <span className="text-[#161616]/60">
                  {f.approval ? '· waiting on your yes, it spends money' : f.studio ? '· queued with the studio' : '· queued, yours to deploy'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={submit} className="border-t-2 border-[#161616] p-4 bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask him anything, or tell him what is stuck…"
          className="flex-1 bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-5 py-3 text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616] disabled:opacity-40"
        >
          Send
        </button>
      </form>

      {error && <p className="px-5 pb-4 text-[#C4160B] text-sm font-body font-bold">{error}</p>}
    </div>
  );
}
