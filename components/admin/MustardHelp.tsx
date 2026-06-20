'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'What do we actually sell?',
  'How do I take a sales call?',
  'What does each admin tab do?',
  'How does my affiliate link work?',
];

const GREETING =
  "Hi Polly, I'm Mr. Mustard. Ask me anything about how we work, what we sell, how to use this admin, taking calls, or finding clients. No question is too small. What's on your mind?";

/**
 * The internal Mr. Mustard: a floating helper on every admin page so the team
 * (Polly) can ask how anything works while they learn. Talks to
 * /api/admin/mustard-help, which is versed on all our procedures and services.
 */
export default function MustardHelp() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname() || '';

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [open, messages, busy]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...messages, { role: 'user' as const, content: q }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/admin/mustard-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const json = await res.json().catch(() => ({}));
      setMessages((m) => [...m, { role: 'assistant', content: res.ok ? json.reply : json.error || 'Something went wrong. Try again?' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'I could not reach the server. Check your connection and try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  // Not on the sign-in screen (the team is not authenticated there yet).
  if (pathname.startsWith('/admin/login')) return null;

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 pl-2.5 pr-5 py-2.5 bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          aria-label="Ask Mr. Mustard"
        >
          <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-7 w-auto" />
          <span className="text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616]">Ask Mr. Mustard</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(400px,calc(100vw-2.5rem))] h-[min(620px,calc(100vh-2.5rem))] flex flex-col bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-[#161616] shrink-0">
            <div className="flex items-center gap-2.5">
              <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-8 w-auto" />
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-[#F5B700] font-mono font-bold leading-none">Your in-house guide</p>
                <p className="font-sans text-[15px] font-bold text-[#FBF6EA] leading-tight mt-1">Mr. Mustard</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#FBF6EA]/70 hover:text-[#FBF6EA] text-2xl leading-none px-2" aria-label="Close">×</button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            <Bubble role="assistant" text={GREETING} />
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left text-xs font-body text-[#161616] bg-white border-2 border-[#161616] rounded-full px-3 py-1.5 hover:bg-[#FFF8E6] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} text={m.content} />
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-[#161616]/50 font-body text-sm italic">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F5B700] animate-pulse" />
                Mr. Mustard is thinking...
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t-2 border-[#161616] p-3 bg-[#FBF6EA] shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Ask me anything..."
                className="flex-1 resize-none bg-white border-2 border-[#161616] rounded-xl px-3 py-2 text-sm text-[#161616] placeholder-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700] max-h-28"
              />
              <button
                onClick={() => send(input)}
                disabled={busy || !input.trim()}
                className="px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-xl shadow-[2px_2px_0_0_#161616] hover:shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
              >
                Send
              </button>
            </div>
            <p className="text-[10px] text-[#161616]/40 font-body mt-1.5 text-center">Mr. Mustard knows our playbook. For anything he is unsure of, ask Sarah.</p>
          </div>
        </div>
      )}
    </>
  );
}

function Bubble({ role, text }: { role: 'user' | 'assistant'; text: string }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 font-body text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'bg-[#161616] text-[#FBF6EA]' : 'bg-white border-2 border-[#161616] text-[#161616]'
        }`}
      >
        {text}
      </div>
    </div>
  );
}
