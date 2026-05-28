'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

type Msg = { from: 'seed' | 'you'; text: string };

const GREETING: Msg = {
  from: 'seed',
  text: "Hi. I'm Mustard Seed. What is your pain point? Let's fix it.",
};

export default function MustardSeedChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'pain' | 'identify' | 'done'>('pain');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const submitPain = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((m) => [...m, { from: 'you', text: input.trim() }]);
    const painText = input.trim();
    setInput('');
    setMessages((m) => [
      ...m,
      {
        from: 'seed',
        text: "Got it. Tell me your name and email and Sarah will personally reply within 24 hours. (Or skip and just send the pain point.)",
      },
    ]);
    setStep('identify');
    // Stash painText in input cleared, will use email/name + reuse painText on identify submit
    (window as unknown as { __seedPain: string }).__seedPain = painText;
  };

  const submitIdentify = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const painText = (window as unknown as { __seedPain?: string }).__seedPain || '';
    try {
      const res = await fetch('/api/mustard-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: painText, email, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Send failed');
      const summary = [name && `${name}`, email].filter(Boolean).join(' · ');
      if (summary) {
        setMessages((m) => [...m, { from: 'you', text: summary }]);
      }
      setMessages((m) => [...m, { from: 'seed', text: data.reply || 'Sarah will reply soon.' }]);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([GREETING]);
    setInput('');
    setEmail('');
    setName('');
    setStep('pain');
    setError(null);
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close Mustard Seed chat' : 'Open Mustard Seed chat'}
        className="fixed bottom-6 right-6 z-[80] group"
      >
        <div className="relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-brass campfire-glow border border-gold-light/40 hover:shadow-[0_0_50px_rgba(255,107,53,0.5)] transition-all">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cream-50 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cream-50" />
          </span>
          <span className="font-display italic text-base md:text-lg text-cream-50 font-medium tracking-tight pr-1">
            Mustard Seed
          </span>
        </div>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Mustard Seed chat"
          className="fixed bottom-24 right-6 z-[81] w-[calc(100vw-3rem)] sm:w-[400px] max-h-[72vh] flex flex-col rounded-2xl border border-gold-light/30 bg-midnight-700/95 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden"
        >
          {/* Header */}
          <div className="relative px-5 py-4 border-b border-gold-light/15 bg-midnight-800/80">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-light/60 to-transparent" />
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-[9px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-bold">
                  Modern Mustard Seed
                </span>
                <span className="block font-display italic text-xl text-cream-50 font-medium tracking-tight mt-1">
                  Mustard Seed
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-8 h-8 rounded-full border border-cream-100/15 text-cream-100/60 hover:text-cream-50 hover:border-cream-100/35 transition-colors flex items-center justify-center text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === 'you' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-body leading-relaxed ${
                    m.from === 'seed'
                      ? 'bg-midnight-600/70 border border-gold-light/15 text-cream-100/95 rounded-bl-md'
                      : 'bg-brass text-cream-50 rounded-br-md'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-cream-100/[0.06] px-4 py-4 bg-midnight-800/40">
            {step === 'pain' && (
              <form onSubmit={submitPain} className="flex flex-col gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="What is the thing slowing your business down?"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg bg-midnight-900/70 border border-cream-100/10 text-cream-100 placeholder:text-cream-100/35 font-body text-sm resize-none focus:outline-none focus:border-gold-light/50"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="self-end px-5 py-2 rounded-full bg-brass text-cream-50 text-[10px] uppercase tracking-[0.2em] font-sans font-bold disabled:opacity-40 hover:shadow-[0_0_20px_rgba(255,107,53,0.5)] transition-all"
                >
                  Send →
                </button>
              </form>
            )}

            {step === 'identify' && (
              <form onSubmit={submitIdentify} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full px-3 py-2.5 rounded-lg bg-midnight-900/70 border border-cream-100/10 text-cream-100 placeholder:text-cream-100/35 font-body text-sm focus:outline-none focus:border-gold-light/50"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email"
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-midnight-900/70 border border-cream-100/10 text-cream-100 placeholder:text-cream-100/35 font-body text-sm focus:outline-none focus:border-gold-light/50"
                  autoFocus
                />
                {error && (
                  <p className="text-rust-light text-xs font-mono">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={sending || !email.trim()}
                  className="self-end px-5 py-2 rounded-full bg-brass text-cream-50 text-[10px] uppercase tracking-[0.2em] font-sans font-bold disabled:opacity-40 hover:shadow-[0_0_20px_rgba(255,107,53,0.5)] transition-all"
                >
                  {sending ? 'Sending…' : 'Send →'}
                </button>
              </form>
            )}

            {step === 'done' && (
              <button
                type="button"
                onClick={reset}
                className="w-full px-4 py-2.5 rounded-full border border-cream-100/20 text-cream-100/75 hover:text-cream-50 hover:border-cream-100/40 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
