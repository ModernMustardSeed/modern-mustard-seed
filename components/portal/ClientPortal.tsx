'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import Link from 'next/link';

/**
 * The client workspace. One screen scoped to the signed-in client: their
 * project status and milestones, files and deliverables, playbook downloads,
 * upcoming calls, and an AI guide that gives a tour and helps with anything.
 */

type Milestone = { title: string; detail?: string; done?: boolean; due?: string };
type Project = { id: string; name: string; status: string; summary: string | null; progress: number; milestones: Milestone[]; launchTarget: string | null };
type PortalData = {
  email: string;
  client: { name: string | null; company: string | null; tier: string; welcomeNote: string | null } | null;
  projects: Project[];
  files: Array<{ label: string; url: string; kind: string }>;
  orders: Array<{ sessionId: string; productName: string; createdAt: string }>;
  bookings: Array<{ whenIso: string; display: string }>;
  audience: 'client' | 'buyer' | 'both' | 'guest';
};

const STATUS_LABEL: Record<string, string> = {
  discovery: 'Discovery', building: 'In build', review: 'In review', launched: 'Launched', paused: 'Paused',
};
const STATUS_COLOR: Record<string, string> = {
  discovery: 'bg-blue-500/15 text-blue-200 border-blue-500/30',
  building: 'bg-mustard-500/15 text-mustard-200 border-mustard-500/30',
  review: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  launched: 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40',
  paused: 'bg-white/5 text-white/40 border-white/10',
};

type Msg = { role: 'assistant' | 'user'; text: string };

export default function ClientPortal() {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/portal/data');
        if (res.status === 401) { window.location.href = '/portal/login'; return; }
        const json = await res.json();
        if (res.ok) setData(json);
        else setError(json.error ?? 'Could not load your portal');
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const logout = async () => {
    await fetch('/api/portal/logout', { method: 'POST' });
    window.location.href = '/portal/login';
  };

  const firstName = data?.client?.name?.split(' ')[0] || data?.email?.split('@')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#080c16] text-white">
      <header className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#080c16]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.4em] text-mustard-500/70 font-mono font-medium block">Modern Mustard Seed</span>
            <h1 className="font-sans text-xl font-semibold text-white tracking-tight mt-1">Your Portal</h1>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/?book=1" className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 hover:text-mustard-300 px-4 py-2">Book a call</Link>
            <button onClick={logout} className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-white/40 hover:text-white/70 px-4 py-2">Sign out</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-center text-white/40 py-20 font-body italic">Opening your workspace...</p>
        ) : error ? (
          <div className="glass-card p-6 border-red-500/30"><p className="text-red-300 text-sm font-body">{error}</p></div>
        ) : data ? (
          <>
            {/* Welcome */}
            <div className="mb-8">
              <h2 className="font-display text-3xl md:text-4xl font-semibold text-cream-50 tracking-tight">
                Welcome back, {firstName}.
              </h2>
              <p className="text-white/55 font-body mt-2">
                {data.client?.welcomeNote
                  || (data.audience === 'buyer'
                    ? 'Your playbooks and a personal AI helper are below.'
                    : data.audience === 'guest'
                      ? 'This is your home base with Modern Mustard Seed. The guide below can help with anything.'
                      : 'Here is where your build stands and everything you need in one place.')}
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Main column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Projects */}
                {data.projects.map((p) => (
                  <div key={p.id} className="glass-card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-[0.3em] text-white/40 font-mono font-medium">Project</span>
                        <h3 className="font-sans text-lg font-semibold text-white mt-1">{p.name}</h3>
                      </div>
                      <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-semibold px-2.5 py-1 rounded border ${STATUS_COLOR[p.status] ?? STATUS_COLOR.building}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>
                    {p.summary && <p className="text-white/60 font-body text-sm leading-relaxed mb-4">{p.summary}</p>}
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono">Progress</span>
                      <span className="text-white/70 font-mono text-xs font-semibold">{p.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.07] overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-mustard-600 to-mustard-400" style={{ width: `${Math.min(100, p.progress)}%` }} />
                    </div>
                    {p.launchTarget && <p className="text-white/35 font-mono text-[11px] mb-5">Launch target: {p.launchTarget}</p>}

                    {p.milestones.length > 0 && (
                      <div className="space-y-2.5 mt-5">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono block mb-1">Milestones</span>
                        {p.milestones.map((m, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className={`mt-0.5 h-4 w-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] ${m.done ? 'bg-emerald-500/80 text-white' : 'border border-white/20 text-transparent'}`}>✓</span>
                            <div className="flex-1">
                              <p className={`font-body text-sm ${m.done ? 'text-white/45 line-through' : 'text-white/85'}`}>{m.title}</p>
                              {m.detail && <p className="text-white/35 font-body text-xs mt-0.5">{m.detail}</p>}
                            </div>
                            {m.due && <span className="text-white/30 font-mono text-[10px]">{m.due}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Downloads (PDF buyers) */}
                {data.orders.length > 0 && (
                  <div className="glass-card p-6">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-4">Your playbooks</span>
                    <div className="space-y-2">
                      {data.orders.map((o) => (
                        <DownloadRow key={o.sessionId} sessionId={o.sessionId} productName={o.productName} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {data.files.length > 0 && (
                  <div className="glass-card p-6">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold block mb-4">Files and deliverables</span>
                    <div className="space-y-1.5">
                      {data.files.map((f, i) => (
                        <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-colors group">
                          <span className="text-white/80 font-body text-sm group-hover:text-white">{f.label}</span>
                          <span className="text-[9px] uppercase tracking-[0.2em] text-mustard-400/70 font-mono">{f.kind} ↗</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Calls */}
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-mono font-bold">Calls</span>
                    <Link href="/?book=1" className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 hover:text-mustard-300">Book a call →</Link>
                  </div>
                  {data.bookings.length === 0 ? (
                    <p className="text-white/40 font-body text-sm italic">No upcoming calls. Book one any time, Wed or Thu.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.bookings.map((b, i) => (
                        <div key={i} className="border-l-2 border-emerald-500/40 pl-3">
                          <p className="text-emerald-300/90 font-mono text-sm">{b.display}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {data.audience === 'guest' && data.projects.length === 0 && data.orders.length === 0 && (
                  <div className="glass-card p-6 text-center">
                    <p className="text-white/60 font-body text-sm mb-4">Nothing here yet. When Sarah starts your build or you grab a playbook, it shows up here automatically.</p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/store" className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-cream-100 border border-cream-100/25 rounded-full hover:border-cream-100/50">Browse playbooks</Link>
                      <Link href="/?book=1" className="px-5 py-2.5 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-cream-50 bg-brass rounded-full">Book a call</Link>
                    </div>
                  </div>
                )}
              </div>

              {/* AI guide */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24">
                  <PortalAssistant firstName={firstName} audience={data.audience} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

/* Download row: fetches a fresh signed link from the existing store endpoint. */
function DownloadRow({ sessionId, productName }: { sessionId: string; productName: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const get = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch(`/api/store/download/${sessionId}`);
      const json = await res.json();
      if (res.ok && json.downloads?.length) {
        for (const d of json.downloads) {
          if (d.url) window.open(d.url, '_blank', 'noopener');
        }
      } else {
        setErr('Link unavailable. Email Sarah.');
      }
    } catch {
      setErr('Could not fetch. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
      <span className="text-white/85 font-body text-sm">{productName}</span>
      <div className="flex items-center gap-3">
        {err && <span className="text-red-300/80 font-body text-[11px]">{err}</span>}
        <button onClick={get} disabled={busy} className="text-[10px] uppercase tracking-[0.2em] font-sans font-semibold text-mustard-400 hover:text-mustard-300 disabled:opacity-50">
          {busy ? '...' : 'Download'}
        </button>
      </div>
    </div>
  );
}

/* In-portal AI guide with a one-tap guided tour. */
function PortalAssistant({ firstName, audience }: { firstName: string; audience: string }) {
  const greeting: Msg = {
    role: 'assistant',
    text: `Hi ${firstName}. I am your Mustard Seed guide. I can walk you through your portal, explain where your project stands, or help with anything Sarah built. Want the quick tour?`,
  };
  const [messages, setMessages] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const next: Msg[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await fetch('/api/portal/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next.slice(1).map((m) => ({ role: m.role, content: m.text })) }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: 'assistant', text: json.reply || 'Tell me a bit more.' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'I hit a snag. Try again in a moment.' }]);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void send(input); };

  const quick = audience === 'buyer'
    ? ['Give me the tour', 'Help me use my playbook', 'What should I do first?']
    : ['Give me the tour', "What's my project status?", 'How do I book a call?'];

  return (
    <div className="glass-card flex flex-col h-[560px] overflow-hidden border-mustard-500/20">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold-light opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-light" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light/90 font-mono font-bold">Your guide</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed whitespace-pre-wrap ${m.role === 'assistant' ? 'bg-white/[0.04] border border-white/[0.06] text-white/90 rounded-bl-md' : 'bg-brass text-cream-50 rounded-br-md'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {quick.map((q) => (
              <button key={q} onClick={() => void send(q)} className="text-left px-3 py-1.5 rounded-lg text-[12px] font-body bg-white/[0.03] border border-white/[0.08] text-white/80 hover:border-mustard-500/40 hover:text-white transition-all">
                {q}
              </button>
            ))}
          </div>
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.04] border border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-light/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-light/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-gold-light/80 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-white/[0.06] p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sending ? 'Thinking...' : 'Ask me anything...'}
          disabled={sending}
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-full px-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-mustard-500/40 disabled:opacity-50"
        />
        <button type="submit" disabled={sending || !input.trim()} className="px-4 py-2 rounded-full bg-brass text-cream-50 text-[10px] uppercase tracking-[0.15em] font-sans font-bold disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  );
}
