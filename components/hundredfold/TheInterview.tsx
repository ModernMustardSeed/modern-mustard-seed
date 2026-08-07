'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import type Vapi from '@vapi-ai/web';
import { hardenMicPath, teardownVapi } from '@/lib/vapi-web';
import { ARCS, QUESTIONS, type Turn } from '@/lib/hundredfold-interview';

/**
 * THE INTERVIEW.
 *
 * The moment HUNDREDFOLD is actually sold. An owner clicks a button and a coach
 * starts asking them about their money, out loud, and does not accept a vague
 * answer. Nobody expects that from a website.
 *
 * Three channels, one record. Voice runs on Vapi with the interview brief
 * merged into the live assistant's model; typed runs turn by turn through our
 * own route. Both write to the same interview row, so the plan is identical
 * either way and a dropped call can be finished by typing.
 */

type Stage = 'intro' | 'choose' | 'voice' | 'typed' | 'done';
type VoiceState = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

type StartResponse = {
  ok: true;
  interviewId: string;
  memberId: string | null;
  systemPrompt: string;
  call: Record<string, unknown> | null;
  voiceReady: boolean;
  firstName: string | null;
  businessName: string | null;
};

export default function TheInterview({
  roadmapSlug,
  businessName,
  host,
  url,
}: {
  roadmapSlug?: string | null;
  businessName?: string | null;
  host?: string | null;
  url?: string | null;
}) {
  const [stage, setStage] = useState<Stage>('intro');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [biz, setBiz] = useState(businessName ?? '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [session, setSession] = useState<StartResponse | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [covered, setCovered] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [reply, setReply] = useState('');

  const [voice, setVoice] = useState<VoiceState>('idle');
  const vapiRef = useRef<Vapi | null>(null);
  const startedAt = useRef<number>(0);
  const liveTurns = useRef<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, thinking]);

  // A live call must not survive the component. Leaving the page mid-interview
  // otherwise leaves Mr. Mustard talking to an empty room and burning minutes.
  useEffect(() => {
    return () => {
      if (vapiRef.current) void teardownVapi(vapiRef.current);
    };
  }, []);

  const progress = Math.min(covered.length, QUESTIONS.length);

  /* ── start ─────────────────────────────────────────────────────────────── */
  const start = async (channel: 'web' | 'typed') => {
    if (starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/hundredfold/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          business_name: biz.trim(),
          phone: phone.trim(),
          url,
          roadmap_slug: roadmapSlug ?? undefined,
          channel,
        }),
      });
      const data = (await res.json()) as StartResponse | { error: string };
      if (!res.ok || 'error' in data) throw new Error('error' in data ? data.error : 'Could not start');
      setSession(data);
      if (channel === 'web' && data.voiceReady && PUBLIC_KEY && ASSISTANT_ID) {
        setStage('voice');
        await startVoice(data);
      } else {
        setStage('typed');
        await typedTurn('', data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the interview.');
    } finally {
      setStarting(false);
    }
  };

  /* ── voice ─────────────────────────────────────────────────────────────── */
  const startVoice = async (s: StartResponse) => {
    setVoice('connecting');
    liveTurns.current = [];
    try {
      const { default: VapiCtor } = await import('@vapi-ai/web');
      // A FRESH instance per call, and the old one fully destroyed first. Daily
      // allows one call object per page and a redial race produces a call with
      // no mic or no audio out.
      await teardownVapi(vapiRef.current);
      const vapi = new VapiCtor(PUBLIC_KEY!);
      vapiRef.current = vapi;

      vapi.on('call-start', () => {
        setVoice('live');
        startedAt.current = Date.now();
        // The SDK turns Krisp on during its own start sequence, and on some
        // machines that processor eats the mic entirely: he talks, hears
        // silence, and hangs up. Turn it off once the call has joined.
        hardenMicPath(vapi);
      });
      vapi.on('message', (msg: unknown) => {
        const m = msg as { type?: string; role?: string; transcriptType?: string; transcript?: string };
        if (m.type !== 'transcript' || m.transcriptType !== 'final' || !m.transcript) return;
        const turn: Turn = {
          role: m.role === 'assistant' ? 'coach' : 'owner',
          text: m.transcript,
          at: new Date().toISOString(),
        };
        liveTurns.current = [...liveTurns.current, turn];
        setTurns(liveTurns.current);
        if (turn.role === 'coach') markCovered(turn.text);
      });
      vapi.on('call-end', () => {
        setVoice('ended');
        void finish(s, liveTurns.current);
      });
      vapi.on('error', () => {
        setVoice('error');
        setError('The call dropped. You can pick it up by typing instead, and nothing is lost.');
      });

      await vapi.start(ASSISTANT_ID!, s.call as never);
    } catch (err) {
      setVoice('error');
      setError(
        err instanceof Error && /denied|permission/i.test(err.message)
          ? 'Your mic is blocked. Allow microphone access and try again, or answer by typing.'
          : 'Could not start the call. You can answer by typing instead.'
      );
    }
  };

  const hangUp = () => {
    try {
      vapiRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setVoice('ended');
  };

  /** Rough progress from what he has asked so far. Honest, not a fake bar. */
  const markCovered = (coachText: string) => {
    const t = coachText.toLowerCase();
    setCovered((prev) => {
      const next = new Set(prev);
      for (const q of QUESTIONS) {
        const stem = q.ask.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 4).join(' ');
        if (stem && t.includes(stem)) next.add(q.key);
      }
      return [...next];
    });
  };

  /* ── typed ─────────────────────────────────────────────────────────────── */
  const typedTurn = async (answer: string, s?: StartResponse) => {
    const sess = s ?? session;
    if (!sess || thinking) return;
    setThinking(true);
    setError(null);
    if (answer) {
      setTurns((t) => [...t, { role: 'owner', text: answer, at: new Date().toISOString() }]);
    }
    try {
      const res = await fetch(`/api/hundredfold/interview/${sess.interviewId}/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, systemPrompt: sess.systemPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Lost the thread');
      setTurns(data.turns ?? []);
      if (data.questionKey) setCovered((prev) => (prev.includes(data.questionKey) ? prev : [...prev, data.questionKey]));
      if (data.done) await finish(sess, data.turns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Send that again.');
    } finally {
      setThinking(false);
    }
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    const a = reply.trim();
    if (!a) return;
    setReply('');
    void typedTurn(a);
  };

  /* ── finish ────────────────────────────────────────────────────────────── */
  const finish = async (s: StartResponse, finalTurns: Turn[]) => {
    try {
      await fetch(`/api/hundredfold/interview/${s.interviewId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalTurns,
          durationSeconds: startedAt.current ? (Date.now() - startedAt.current) / 1000 : undefined,
        }),
      });
    } catch {
      /* the row is already saved turn by turn; a failed close is not their problem */
    }
    setStage('done');
  };

  /* ── render ────────────────────────────────────────────────────────────── */
  const canStart = email.trim().includes('@') && name.trim().length > 1;

  if (stage === 'intro' || stage === 'choose') {
    return (
      <div className="pop-card p-7 md:p-10 max-w-2xl mx-auto">
        <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-4">
          The Interview
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-tight">
          Mr. Mustard has about thirty questions for you
        </h2>
        <p className="mt-4 text-[#3a3733] font-body text-base leading-relaxed">
          Twenty minutes. Some of them are uncomfortable. Everything you say turns into your plan and your
          offer, so a straight answer is worth more than a polished one. You can talk to him out loud or
          type, and you can stop and pick it up later.
        </p>

        <div className="mt-7 grid sm:grid-cols-2 gap-3">
          <label>
            <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
              Your name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dana Whitaker"
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            />
          </label>
          <label>
            <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            />
          </label>
          <label>
            <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
              Business
            </span>
            <input
              value={biz}
              onChange={(e) => setBiz(e.target.value)}
              placeholder={host ?? 'Whitaker Med Spa'}
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            />
          </label>
          <label>
            <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/60 mb-1.5">
              Phone (optional)
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(406) 555 0142"
              className="w-full bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none focus:shadow-[3px_3px_0_0_#161616] transition-shadow"
            />
          </label>
        </div>

        <div className="mt-7 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={!canStart || starting}
            onClick={() => start('web')}
            className="flex-1 px-6 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-xl border-2 border-[#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-all"
          >
            {starting ? 'One moment…' : 'Talk to him now'}
          </button>
          <button
            type="button"
            disabled={!canStart || starting}
            onClick={() => start('typed')}
            className="flex-1 px-6 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-xl border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] disabled:opacity-40 hover:-translate-y-0.5 transition-all"
          >
            I would rather type
          </button>
        </div>
        <p className="mt-4 text-[#161616]/55 text-xs font-body">
          Talking takes about twenty minutes. Typing takes longer but you can do it in pieces.
        </p>
        {error && <p className="mt-4 text-[#C4160B] text-sm font-body font-bold">{error}</p>}
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="pop-card-yellow p-8 md:p-12 max-w-2xl mx-auto text-center">
        <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#161616] mb-4">
          That is the interview
        </span>
        <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight leading-tight">
          Now the work starts on our side
        </h2>
        <p className="mt-4 text-[#161616]/80 font-body text-base leading-relaxed">
          Sarah reads every word of this herself. Your roadmap and your offer get built from your answers,
          not from a template, and she will bring them to you along with what it would take to run the
          whole thing together. Check your email.
        </p>
        <p className="mt-6 text-[#161616]/60 text-xs font-mono uppercase tracking-[0.25em]">
          {turns.filter((t) => t.role === 'owner').length} answers on the record
        </p>
      </div>
    );
  }

  /* Voice and typed share the transcript shell. */
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress by arc, honest rather than a fake bar */}
      <div className="mb-4 flex items-center gap-1.5">
        {ARCS.map((arc) => {
          const keys = QUESTIONS.filter((q) => q.arc === arc.key).map((q) => q.key);
          const hit = keys.filter((k) => covered.includes(k)).length;
          const pct = keys.length ? hit / keys.length : 0;
          return (
            <div key={arc.key} className="flex-1" title={arc.label}>
              <div className="h-1.5 rounded-full bg-[#161616]/12 overflow-hidden border border-[#161616]/15">
                <div className="h-full bg-[#F5B700] transition-all duration-500" style={{ width: `${pct * 100}%` }} />
              </div>
              <span className="mt-1.5 block text-[7px] sm:text-[8px] uppercase tracking-[0.1em] font-mono text-[#161616]/45 truncate">
                {arc.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="pop-card overflow-hidden">
        {/* Header */}
        <div className="bg-[#161616] px-5 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                stage === 'voice'
                  ? voice === 'live'
                    ? 'bg-[#F5B700] animate-pulse'
                    : voice === 'connecting'
                      ? 'bg-white/50 animate-pulse'
                      : 'bg-white/25'
                  : 'bg-[#F5B700]'
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#FBF6EA] truncate">
              {stage === 'voice'
                ? voice === 'connecting'
                  ? 'Connecting'
                  : voice === 'live'
                    ? 'Mr. Mustard is listening'
                    : 'Call ended'
                : 'Mr. Mustard'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#FBF6EA]/50 shrink-0">
            {progress}/{QUESTIONS.length}
          </span>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} className="max-h-[52vh] overflow-y-auto px-5 py-5 space-y-4 bg-[#FFFDF6]">
          {turns.length === 0 && (
            <p className="text-[#161616]/45 font-body text-sm italic py-8 text-center">
              {stage === 'voice' ? 'Say hello when he starts talking.' : 'He is thinking of where to start…'}
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={t.role === 'coach' ? '' : 'flex justify-end'}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl border-2 border-[#161616] font-body text-sm leading-relaxed ${
                  t.role === 'coach'
                    ? 'bg-white text-[#161616] rounded-tl-sm'
                    : 'bg-[#F5B700] text-[#161616] rounded-tr-sm ml-auto'
                }`}
              >
                {t.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-sm border-2 border-[#161616] bg-white">
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

        {/* Controls */}
        <div className="border-t-2 border-[#161616] p-4 bg-white">
          {stage === 'voice' ? (
            <div className="flex flex-wrap items-center gap-3">
              {voice === 'live' || voice === 'connecting' ? (
                <button
                  type="button"
                  onClick={hangUp}
                  className="px-6 py-3 text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#C4160B] rounded-lg border-2 border-[#161616]"
                >
                  End the interview
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => session && finish(session, turns)}
                  className="px-6 py-3 text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616]"
                >
                  Send it to Sarah
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  hangUp();
                  setStage('typed');
                  void typedTurn('');
                }}
                className="text-[10px] uppercase tracking-[0.22em] font-mono font-bold text-[#161616]/55 hover:text-[#161616]"
              >
                Finish by typing instead
              </button>
            </div>
          ) : (
            <form onSubmit={submitTyped} className="flex gap-2">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={thinking}
                placeholder="Answer him straight…"
                autoFocus
                className="flex-1 bg-white border-2 border-[#161616] rounded-lg px-4 py-3 font-body text-sm focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={thinking || !reply.trim()}
                className="px-5 py-3 text-[10px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-lg border-2 border-[#161616] disabled:opacity-40"
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-[#C4160B] text-sm font-body font-bold text-center">{error}</p>}
    </div>
  );
}
