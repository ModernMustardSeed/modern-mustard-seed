'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

type Msg = { role: 'assistant' | 'user'; text: string };

const GREETING: Msg = {
  role: 'assistant',
  text: "Hi. I'm Mustard Seed. What is the pain point in your business right now? Let's name it.",
};

export default function MustardSeedChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const next: Msg[] = [...messages, { role: 'user', text }];
    setMessages(next);
    setInput('');
    setSending(true);
    setError(null);

    try {
      // Skip the static greeting (it's UI only, not part of the model history).
      const payload = next
        .slice(1)
        .map((m) => ({ role: m.role, content: m.text }));

      const res = await fetch('/api/mustard-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Send failed');

      setMessages((m) => [...m, { role: 'assistant', text: data.reply || 'Tell me more.' }]);
      if (data.leadCaptured) setCaptured(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([GREETING]);
    setInput('');
    setError(null);
    setCaptured(false);
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
          className="fixed bottom-24 right-6 z-[81] w-[calc(100vw-3rem)] sm:w-[420px] max-h-[72vh] flex flex-col rounded-2xl border border-gold-light/30 bg-midnight-700/95 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.55)] overflow-hidden"
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
            {captured && (
              <p className="mt-3 text-[10px] tracking-[0.25em] uppercase text-gold-light/85 font-mono font-medium">
                ● Lead captured. Sarah is on it.
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap ${
                    m.role === 'assistant'
                      ? 'bg-midnight-600/70 border border-gold-light/15 text-cream-100/95 rounded-bl-md'
                      : 'bg-brass text-cream-50 rounded-br-md'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-midnight-600/70 border border-gold-light/15">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-light/85 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-light/85 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-light/85 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-cream-100/[0.06] px-4 py-4 bg-midnight-800/40">
            {!captured ? (
              <form onSubmit={send} className="flex flex-col gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send(e as unknown as FormEvent);
                    }
                  }}
                  placeholder={sending ? 'Mustard Seed is thinking…' : 'Type your pain point. Enter to send.'}
                  disabled={sending}
                  rows={2}
                  maxLength={1500}
                  className="w-full px-3 py-2.5 rounded-lg bg-midnight-900/70 border border-cream-100/10 text-cream-100 placeholder:text-cream-100/35 font-body text-sm resize-none focus:outline-none focus:border-gold-light/50 disabled:opacity-50"
                />
                {error && (
                  <p className="text-rust-light text-xs font-mono">{error}</p>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[10px] uppercase tracking-[0.2em] text-cream-100/45 hover:text-cream-100/85 font-mono transition-colors"
                  >
                    Start over
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="px-5 py-2 rounded-full bg-brass text-cream-50 text-[10px] uppercase tracking-[0.2em] font-sans font-bold disabled:opacity-40 hover:shadow-[0_0_20px_rgba(255,107,53,0.5)] transition-all"
                  >
                    {sending ? '…' : 'Send →'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-cream-100/75 text-xs font-body leading-relaxed">
                  Want to keep talking, or start fresh?
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full px-4 py-2.5 rounded-full border border-cream-100/20 text-cream-100/75 hover:text-cream-50 hover:border-cream-100/40 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold transition-all"
                >
                  Start a new conversation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
