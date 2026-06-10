'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, FormEvent } from 'react';

type Msg = { role: 'assistant' | 'user'; text: string };

const GREETING: Msg = {
  role: 'assistant',
  text: "Hi. I'm Mr. Mustard. What is the pain point in your business right now? Let's name it.",
};

// Quick-start prompts the visitor can click instead of typing from scratch.
// Cover the main funnels: service biz, founders, ecommerce, automation, AI add-on, dreamers.
const STARTERS = [
  'I miss too many calls and lose leads',
  'I have an idea but no technical co-founder',
  'My website does not bring me business',
  'I need to automate my client onboarding',
  'I want to add AI to my existing business',
  'Help me figure out what to build',
];

export default function MustardSeedChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState(false);
  // First-visit teaser bubble above the launcher. Shows once per visitor.
  const [showGreet, setShowGreet] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const GREET_KEY = 'mrmustard_greeted_v1';
  const dismissGreet = () => {
    setShowGreet(false);
    try {
      window.localStorage.setItem(GREET_KEY, '1');
    } catch {
      // localStorage blocked (private mode); fine, just hide for this session.
    }
  };

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, sending]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Once the visitor opens the chat (any way), retire the teaser for good.
  useEffect(() => {
    if (open) dismissGreet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // First-visit auto-greet: pop the teaser ~4s in, only if they have not been
  // greeted before and are not deep-linking straight into booking.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let greeted = false;
    try {
      greeted = window.localStorage.getItem(GREET_KEY) === '1';
    } catch {
      greeted = false;
    }
    if (greeted) return;
    const wantsBooking =
      /[?&]book=1\b/.test(window.location.search) || window.location.hash === '#book';
    if (wantsBooking) return;
    const t = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(GREET_KEY) === '1') return;
      } catch {
        // ignore
      }
      setShowGreet(true);
    }, 4000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open straight into booking when a "Book a call" CTA anywhere on the site
  // (or in an email) links to ?book=1 / #book, or dispatches `mustardseed:book`.
  const bookingKickedRef = useRef(false);
  const startBooking = () => {
    setOpen(true);
    if (bookingKickedRef.current || sending) return;
    bookingKickedRef.current = true;
    void sendText('I would like to book a discovery call with Sarah.');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wantsBooking =
      /[?&]book=1\b/.test(window.location.search) || window.location.hash === '#book';
    if (wantsBooking) startBooking();
    const handler = () => startBooking();
    // Plain open (no booking kick) for "chat with Mr. Mustard" CTAs anywhere.
    const openHandler = () => setOpen(true);
    window.addEventListener('mustardseed:book', handler);
    window.addEventListener('mustardseed:open', openHandler);
    return () => {
      window.removeEventListener('mustardseed:book', handler);
      window.removeEventListener('mustardseed:open', openHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const next: Msg[] = [...messages, { role: 'user', text: trimmed }];
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

  const send = (e: FormEvent) => {
    e.preventDefault();
    void sendText(input);
  };

  // Has the visitor sent anything yet? Used to decide whether to show starter chips.
  const showStarters = messages.length === 1 && !sending;

  const reset = () => {
    setMessages([GREETING]);
    setInput('');
    setError(null);
    setCaptured(false);
  };

  return (
    <>
      {/* First-visit teaser bubble. Sits above the launcher, leads with the
          free-playbook value-add, dismissible, shown once per visitor. */}
      {showGreet && !open && (
        <div className="fixed bottom-28 right-6 z-[79] w-[262px] sm:w-[296px] animate-fade-in-up">
          <div className="relative rounded-2xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] px-4 py-3.5">
            <button
              type="button"
              onClick={dismissGreet}
              aria-label="Dismiss Mr. Mustard"
              className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#161616] text-white text-sm leading-none flex items-center justify-center border-2 border-white hover:scale-110 transition-transform"
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="block w-full text-left"
            >
              <p className="font-display font-black text-[#161616] text-[15px] leading-snug mb-1">
                Not sure where to start?
              </p>
              <p className="font-body text-[13px] text-[#3a3733] leading-snug">
                Tell me your biggest bottleneck. I&apos;ll map you a free 5-step playbook in 60 seconds.
              </p>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] font-mono font-bold text-[#E0301E]">
                Ask Mr. Mustard &rarr;
              </span>
            </button>
            {/* Speech-bubble tail pointing down toward the launcher */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[7px] right-10 w-3 h-3 bg-white border-r-2 border-b-2 border-[#161616] rotate-45"
            />
          </div>
        </div>
      )}

      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close Mr. Mustard chat' : 'Talk to Mr. Mustard'}
        className="fixed bottom-6 right-6 z-[80] group"
      >
        <div className="relative flex items-center gap-2 pl-2 pr-4 py-2 rounded-full bg-[#F5B700] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] group-hover:shadow-[6px_6px_0_0_#161616] group-hover:-translate-y-0.5 transition-all">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white border-2 border-[#161616] overflow-hidden">
            <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-9 w-auto" />
          </span>
          <span className="font-sans text-sm md:text-base text-[#161616] font-extrabold tracking-tight">
            Talk to Mr. Mustard now
          </span>
        </div>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Mr. Mustard chat"
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
                  Mr. Mustard
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

            {/* Quick-start prompt chips. Click to send. Hide once the conversation starts. */}
            {showStarters && (
              <div className="pt-2 pb-1">
                {/* Primary CTA: book a 30-min call with Sarah, guided in-chat */}
                <button
                  type="button"
                  onClick={startBooking}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-brass campfire-glow border border-gold-light/40 text-cream-50 hover:shadow-[0_0_30px_rgba(255,107,53,0.5)] transition-all mb-4"
                >
                  <span className="flex flex-col text-left leading-tight">
                    <span className="font-display italic text-base font-medium tracking-tight">Book a call with Sarah</span>
                    <span className="text-[10px] uppercase tracking-[0.22em] font-mono font-semibold text-cream-50/80 mt-0.5">30 min · Wed &amp; Thu · pick a time here</span>
                  </span>
                  <span className="text-lg leading-none">&rarr;</span>
                </button>
                <span className="block text-[9px] uppercase tracking-[0.35em] text-cream-100/45 font-mono font-medium mb-2.5">
                  Or start with
                </span>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void sendText(s)}
                      className="text-left px-3 py-2 rounded-xl text-[12px] font-body leading-snug bg-midnight-900/55 border border-gold-light/15 text-cream-100/85 hover:bg-midnight-900/80 hover:border-gold-light/40 hover:text-cream-50 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  placeholder={sending ? 'Mr. Mustard is thinking…' : 'Type your pain point. Enter to send.'}
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
