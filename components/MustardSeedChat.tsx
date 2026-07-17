'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect, FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import type Vapi from '@vapi-ai/web';
import { trackLead, trackBooking, trackEvent } from '@/lib/analytics';

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

// Same Vapi assistant the hero card uses. If the env is missing, the voice
// door gracefully links to /voice-agents instead of a dead control.
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const VAPI_ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type Mode = 'choose' | 'voice' | 'chat';
type CallState = 'idle' | 'connecting' | 'live' | 'error';

export default function MustardSeedChat() {
  // The marketing chat is for visitors. Hide it inside the logged-in app shell
  // (admin, client portal, partner HQ) where it would only cover real content.
  const pathname = usePathname() || '';
  const isAppShell =
    pathname.startsWith('/admin') || pathname.startsWith('/portal') || pathname.endsWith('/hq') ||
    // The Sidekick Forge IS a live voice surface; a second Mustard would compete with the demo.
    pathname.startsWith('/sidekick') ||
    // The Screen Test is a theater; the launcher would cover the reveal and tiers.
    pathname.startsWith('/pictures') ||
    // The Press Run's proof and review table own the lower-right corner too.
    pathname.startsWith('/press') ||
    // Forged demo websites are the PROSPECT's site; their own receptionist owns the corner.
    pathname.startsWith('/demo/') ||
    // Hatchery reveal pages belong to the mascot; Huck owns his own corner.
    pathname.startsWith('/hatchery/') ||
    // The Mustard Seed World is a full-screen claymation scroll experience.
    pathname.startsWith('/world');

  const [open, setOpen] = useState(false);
  // Visitor picks their door each time they open the launcher: voice or chat.
  const [mode, setMode] = useState<Mode>('choose');
  const [callState, setCallState] = useState<CallState>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const vapiRef = useRef<Vapi | null>(null);
  const canCall = Boolean(VAPI_PUBLIC_KEY && VAPI_ASSISTANT_ID);
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
    if (open && mode === 'chat') inputRef.current?.focus();
  }, [open, mode]);

  // Kill any live call if the widget unmounts.
  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const startCall = async () => {
    if (!canCall || callState === 'connecting' || callState === 'live') return;
    trackEvent('mustard_talk_live', { location: 'widget' });
    setCallError(null);
    setCallState('connecting');
    try {
      if (!vapiRef.current) {
        const { default: VapiClient } = await import('@vapi-ai/web');
        const { hardenMicPath } = await import('@/lib/vapi-web');
        const vapi = new VapiClient(VAPI_PUBLIC_KEY as string);
        vapi.on('call-start', () => {
          setCallState('live');
          hardenMicPath(vapi);
        });
        vapi.on('call-end', () => {
          setCallState('idle');
          setSpeaking(false);
        });
        vapi.on('speech-start', () => setSpeaking(true));
        vapi.on('speech-end', () => setSpeaking(false));
        vapi.on('error', (e: unknown) => {
          console.error('vapi error', e);
          setCallState('error');
          setCallError('Call dropped. Try again?');
        });
        vapiRef.current = vapi;
      }
      await vapiRef.current.start(VAPI_ASSISTANT_ID as string);
    } catch (err) {
      console.error('vapi start failed', err);
      setCallState('error');
      setCallError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Mic blocked. Allow it and try again.'
          : 'Could not start the call. Try again.'
      );
    }
  };

  const endCall = () => {
    vapiRef.current?.stop();
    setCallState('idle');
    setSpeaking(false);
  };

  const chooseVoice = () => {
    setMode('voice');
    void startCall();
  };

  const chooseChat = () => {
    trackEvent('mustard_chat_open', { location: 'widget' });
    setMode('chat');
  };

  // Launcher toggle. Closing hangs up any live call; reopening lands on the
  // chooser unless a chat conversation is already going.
  const toggleOpen = () => {
    setOpen((o) => {
      if (o) {
        endCall();
        if (mode === 'voice') setMode('choose');
        return false;
      }
      if (mode !== 'chat' || messages.length === 1) setMode('choose');
      return true;
    });
  };

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
    // MUSTARD MODE's hero terminal IS the greeting, and the homepage Front Desk
    // terminal is its own front desk. Never cover either with the teaser.
    if (window.location.pathname.startsWith('/mustard-mode')) return;
    // The Sidekick Forge has its own live voice agent on stage. No teaser.
    if (window.location.pathname.startsWith('/sidekick')) return;
    // The Screen Test is a theater; no teaser bubble over the reveal.
    if (window.location.pathname.startsWith('/pictures')) return;
    if (window.location.pathname === '/') return;
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
    setMode('chat');
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
    const openHandler = () => {
      setOpen(true);
      setMode('chat');
    };
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
      // Fire conversion tracking once, the moment the chat reports it.
      if (data.booked && !captured) {
        trackBooking({ source: 'mr-mustard-chat' });
      } else if (data.leadCaptured && !captured) {
        trackLead({ source: 'mr-mustard-chat' });
      }
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

  if (isAppShell) return null;

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
                Talk to me live or type it out. I&apos;ll find your bottleneck and map you a free 5-step playbook in 60 seconds.
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
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={open ? 'Close Mr. Mustard' : 'Talk to Mr. Mustard'}
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

      {/* Door chooser: live voice or chat, their pick */}
      {open && mode === 'choose' && (
        <div
          role="dialog"
          aria-label="Talk to Mr. Mustard"
          className="fixed bottom-24 right-6 z-[81] w-[calc(100vw-3rem)] sm:w-[340px] rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] overflow-hidden opacity-0 animate-pop-in"
        >
          {/* Halftone header band */}
          <div className="relative bg-[#FBF6EA] border-b-2 border-[#161616] px-5 pt-4 pb-4 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(245,183,0,0.35) 1.2px, transparent 1.3px)',
                backgroundSize: '14px 14px',
              }}
            />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white border-2 border-[#161616] overflow-hidden shrink-0">
                  <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-9 w-auto" />
                </span>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold mb-0.5">
                    Your AI right hand
                  </span>
                  <p className="font-display font-black text-[#161616] text-lg leading-tight">
                    How do you want to talk?
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleOpen}
                aria-label="Close"
                className="w-7 h-7 -mt-1 -mr-1 rounded-full text-[#161616]/50 hover:text-[#161616] hover:rotate-90 transition-all duration-200 flex items-center justify-center text-xl leading-none shrink-0"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 px-5 pt-5 pb-3">
            {canCall ? (
              <button
                type="button"
                onClick={chooseVoice}
                className="group flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] active:translate-y-0 active:shadow-[2px_2px_0_0_#161616] transition-all text-left"
              >
                <span className="flex flex-col leading-tight">
                  <span className="font-sans font-extrabold text-[#161616] text-sm">Talk live</span>
                  <span className="font-body text-[11px] text-[#161616]/70 mt-0.5">A real voice call, right here</span>
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="#161616" />
                  <path d="M5 11a7 7 0 0 0 14 0" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                  <path d="M12 18v3" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            ) : (
              <Link
                href="/voice-agents"
                className="group flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] transition-all text-left"
              >
                <span className="flex flex-col leading-tight">
                  <span className="font-sans font-extrabold text-[#161616] text-sm">Talk live</span>
                  <span className="font-body text-[11px] text-[#161616]/70 mt-0.5">Hear the voice agent in action</span>
                </span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                  <rect x="9" y="3" width="6" height="11" rx="3" fill="#161616" />
                  <path d="M5 11a7 7 0 0 0 14 0" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" fill="none" />
                  <path d="M12 18v3" stroke="#161616" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </Link>
            )}
            <button
              type="button"
              onClick={chooseChat}
              className="group flex items-center justify-between gap-3 px-5 py-3.5 rounded-xl bg-white border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] hover:bg-[#FBF6EA] active:translate-y-0 active:shadow-[2px_2px_0_0_#161616] transition-all text-left"
            >
              <span className="flex flex-col leading-tight">
                <span className="font-sans font-extrabold text-[#161616] text-sm">Chat</span>
                <span className="font-body text-[11px] text-[#161616]/70 mt-0.5">Type it out, get a 5-step playbook</span>
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6">
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.6A.7.7 0 0 1 3.6 19V5.5z" fill="none" stroke="#161616" strokeWidth="2" strokeLinejoin="round" transform="translate(0.4 0.5)" />
              </svg>
            </button>
          </div>

          <p className="px-5 pb-4 text-center text-[9px] uppercase tracking-[0.25em] text-[#161616]/40 font-mono font-medium">
            Free &middot; No signup &middot; He books real calls
          </p>
        </div>
      )}

      {/* Live voice panel */}
      {open && mode === 'voice' && (
        <div
          role="dialog"
          aria-label="Mr. Mustard live call"
          className="fixed bottom-24 right-6 z-[81] w-[calc(100vw-3rem)] sm:w-[340px] rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] overflow-hidden opacity-0 animate-pop-in"
        >
          {/* Status band */}
          <div className="relative bg-[#FBF6EA] border-b-2 border-[#161616] px-5 py-3 overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(245,183,0,0.35) 1.2px, transparent 1.3px)',
                backgroundSize: '14px 14px',
              }}
            />
            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.35em] font-mono font-bold text-[#161616]">
                {callState === 'live' ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E0301E] opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E0301E]" />
                    </span>
                    <span className="text-[#E0301E]">Live call</span>
                  </>
                ) : callState === 'connecting' ? (
                  <span className="text-[#161616]/60">Connecting&hellip;</span>
                ) : (
                  <span className="text-[#161616]/60">Call over</span>
                )}
              </span>
              <button
                type="button"
                onClick={toggleOpen}
                aria-label="Close"
                className="w-7 h-7 -mr-1 rounded-full text-[#161616]/50 hover:text-[#161616] hover:rotate-90 transition-all duration-200 flex items-center justify-center text-xl leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {/* Mascot + comic voice meter */}
          <div className="px-5 pt-6 pb-2 text-center">
            <div className="relative inline-block">
              {callState === 'live' && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#F5B700] opacity-40 animate-ping"
                  style={{ animationDuration: '1.6s' }}
                />
              )}
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border-2 border-[#161616] overflow-hidden mx-auto">
                <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-12 w-auto" />
              </span>
            </div>

            {/* The voice meter: dances when he talks, breathes while he listens */}
            <div className="flex items-end justify-center gap-[5px] h-9 mt-4" aria-hidden="true">
              {[14, 24, 32, 36, 30, 20, 12].map((h, i) => (
                <span
                  key={i}
                  className={`w-1.5 rounded-full origin-bottom transition-colors duration-300 ${
                    callState === 'live'
                      ? `animate-eq ${speaking ? 'bg-[#F5B700]' : 'bg-[#161616]/25'}`
                      : 'bg-[#161616]/15 scale-y-[0.3]'
                  }`}
                  style={{
                    height: h,
                    animationDelay: `${i * 110}ms`,
                    animationDuration: speaking ? '0.65s' : '2.2s',
                  }}
                />
              ))}
            </div>

            <p className="font-display font-black text-[#161616] text-xl leading-tight mt-3">
              {callState === 'live'
                ? speaking
                  ? 'Mr. Mustard is talking…'
                  : 'He is listening. Go ahead.'
                : callState === 'connecting'
                  ? 'Waking him up…'
                  : 'Good talk.'}
            </p>
            <p className="font-body text-xs text-[#3a3733] leading-snug mt-1 max-w-[260px] mx-auto">
              {callState === 'live'
                ? 'Ask anything. He can book your call with Sarah.'
                : callState === 'connecting'
                  ? 'Allow the mic if your browser asks.'
                  : 'Want to go again, or switch to chat?'}
            </p>
            {callError && <p className="text-[#E0301E] text-[11px] font-mono mt-2">{callError}</p>}
          </div>

          <div className="flex gap-2.5 px-5 py-5">
            {callState === 'live' || callState === 'connecting' ? (
              <button
                type="button"
                onClick={() => {
                  endCall();
                  setMode('choose');
                }}
                className="flex-1 px-5 py-3 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-white bg-[#E0301E] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] transition-all"
              >
                End call
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startCall()}
                className="flex-1 px-5 py-3 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] transition-all"
              >
                Call again
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                endCall();
                chooseChat();
              }}
              className="flex-1 px-5 py-3 text-[10px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#161616] transition-all"
            >
              Chat instead
            </button>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {open && mode === 'chat' && (
        <div
          role="dialog"
          aria-label="Mr. Mustard chat"
          className="fixed bottom-24 right-6 z-[81] w-[calc(100vw-3rem)] sm:w-[420px] max-h-[72vh] flex flex-col rounded-2xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#161616] overflow-hidden opacity-0 animate-pop-in"
        >
          {/* Header */}
          <div className="relative px-5 py-3.5 border-b-2 border-[#161616] bg-[#FBF6EA] overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(245,183,0,0.35) 1.2px, transparent 1.3px)',
                backgroundSize: '14px 14px',
              }}
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-[#161616] overflow-hidden shrink-0">
                  <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-8 w-auto" />
                </span>
                <div>
                  <span className="block text-[8px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold">
                    Modern Mustard Seed
                  </span>
                  <span className="block font-display font-black text-lg text-[#161616] tracking-tight leading-tight">
                    Mr. Mustard
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-8 h-8 rounded-full text-[#161616]/50 hover:text-[#161616] hover:rotate-90 transition-all duration-200 flex items-center justify-center text-xl leading-none"
              >
                ×
              </button>
            </div>
            {captured && (
              <p className="relative mt-2 text-[9px] tracking-[0.25em] uppercase text-[#E0301E] font-mono font-bold">
                ● Lead captured. Sarah is on it.
              </p>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-white">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] px-4 py-3 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap border-2 border-[#161616] text-[#161616] ${
                    m.role === 'assistant'
                      ? 'bg-[#FBF6EA] rounded-bl-md'
                      : 'bg-[#F5B700] rounded-br-md'
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
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-[#F5B700] border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] transition-all mb-4"
                >
                  <span className="flex flex-col text-left leading-tight">
                    <span className="font-display font-black text-base text-[#161616] tracking-tight">Book a call with Sarah</span>
                    <span className="text-[9px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/65 mt-0.5">30 min · Wed &amp; Thu · pick a time here</span>
                  </span>
                  <span className="text-lg leading-none text-[#161616]">&rarr;</span>
                </button>
                <span className="block text-[9px] uppercase tracking-[0.35em] text-[#161616]/45 font-mono font-bold mb-2.5">
                  Or start with
                </span>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => void sendText(s)}
                      className="text-left px-3 py-2 rounded-xl text-[12px] font-body leading-snug bg-white border-2 border-[#161616]/20 text-[#161616]/80 hover:border-[#161616] hover:bg-[#FBF6EA] hover:text-[#161616] transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sending && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[#FBF6EA] border-2 border-[#161616]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#161616]/70 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#161616]/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#161616]/70 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input area */}
          <div className="border-t-2 border-[#161616] px-4 py-4 bg-[#FBF6EA]">
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
                  className="w-full px-3 py-2.5 rounded-lg bg-white border-2 border-[#161616]/15 text-[#161616] placeholder:text-[#161616]/35 font-body text-sm resize-none focus:outline-none focus:border-[#F5B700] disabled:opacity-50 transition-colors"
                />
                {error && (
                  <p className="text-[#E0301E] text-xs font-mono">{error}</p>
                )}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[10px] uppercase tracking-[0.2em] text-[#161616]/45 hover:text-[#161616] font-mono font-bold transition-colors"
                  >
                    Start over
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="px-5 py-2 rounded-full bg-[#F5B700] border-2 border-[#161616] text-[#161616] text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold shadow-[2px_2px_0_0_#161616] disabled:opacity-40 disabled:shadow-none hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#161616] transition-all"
                  >
                    {sending ? '…' : 'Send →'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[#161616]/75 text-xs font-body leading-relaxed">
                  Want to keep talking, or start fresh?
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full px-4 py-2.5 rounded-full bg-white border-2 border-[#161616] text-[#161616] hover:bg-[#FBF6EA] text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#161616] transition-all"
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
