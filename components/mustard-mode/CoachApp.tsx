'use client';

/**
 * MUSTARD MODE HQ. The coach app: progress HUD, Mr. Mustard live coach,
 * the four tracks with missions, the prompt library, and the Builder vault.
 * Progress lives in localStorage and syncs to the server (last write wins).
 */

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@vercel/analytics';
import { tracks, totalXp, type Mission, type Track } from '@/data/mustard-mode/curriculum';
import { promptCards, promptCategories, type PromptCard } from '@/data/mustard-mode/prompts';
import { blueprints, type Blueprint } from '@/data/mustard-mode/templates';

type Tier = 'player' | 'builder' | 'cabinet';
type Tab = 'hud' | 'coach' | 'tracks' | 'prompts' | 'vault';
type Progress = {
  xp: number;
  completed: Record<string, string>; // missionId -> ISO date
  updatedAt: string;
};
type ChatMsg = { role: 'user' | 'assistant'; content: string };

const STORAGE_KEY = 'mustard-mode-progress-v1';
const CHAT_KEY = 'mustard-mode-chat-v1';

const RANKS: { at: number; name: string }[] = [
  { at: 0, name: 'SEED' },
  { at: 400, name: 'SPROUT' },
  { at: 1000, name: 'SAPLING' },
  { at: 1800, name: 'GROWER' },
  { at: 2800, name: 'MULTIPLIER' },
  { at: 3800, name: 'HUNDREDFOLD' },
];

function rankFor(xp: number) {
  let current = RANKS[0];
  let next: { at: number; name: string } | null = null;
  for (const r of RANKS) {
    if (xp >= r.at) current = r;
    else { next = r; break; }
  }
  return { current, next };
}

function loadLocal(): Progress {
  if (typeof window === 'undefined') return { xp: 0, completed: {}, updatedAt: new Date(0).toISOString() };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Progress;
  } catch { /* fresh */ }
  return { xp: 0, completed: {}, updatedAt: new Date(0).toISOString() };
}

/** Tiny markdown renderer for vault blueprints (headings, lists, code, bold). */
function MarkdownLite({ body }: { body: string }) {
  const blocks = useMemo(() => body.split('\n'), [body]);
  const out: React.ReactNode[] = [];
  let inCode = false;
  let code: string[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (list.length) {
      out.push(
        <ul key={`ul-${key}`} className="list-none space-y-1.5 my-3">
          {list.map((li, i) => (
            <li key={i} className="font-sans text-sm text-[#161616]/85 flex gap-2">
              <span className="text-[#F5B700] font-mono text-[10px] mt-1.5">■</span>
              <span dangerouslySetInnerHTML={{ __html: inlineMd(li) }} />
            </li>
          ))}
        </ul>
      );
      list = [];
    }
  };
  const inlineMd = (s: string) =>
    s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="font-mono text-[12px] bg-[#FBF6EA] border border-[#161616]/20 px-1">$1</code>');

  blocks.forEach((line, i) => {
    const key = String(i);
    if (line.trim().startsWith('```')) {
      if (inCode) {
        out.push(
          <pre key={`code-${key}`} className="bg-[#080C16] text-[#d7dbe6] font-mono text-[12px] p-4 my-3 overflow-x-auto border-2 border-[#161616]">
            {code.join('\n')}
          </pre>
        );
        code = [];
        inCode = false;
      } else {
        flushList(key);
        inCode = true;
      }
      return;
    }
    if (inCode) { code.push(line); return; }
    if (line.startsWith('- ') || line.startsWith('* ')) { list.push(line.slice(2)); return; }
    flushList(key);
    if (line.startsWith('### ')) out.push(<h5 key={key} className="font-display font-extrabold text-base text-[#161616] mt-5 mb-1">{line.slice(4)}</h5>);
    else if (line.startsWith('## ')) out.push(<h4 key={key} className="font-display font-extrabold text-lg text-[#161616] mt-6 mb-1">{line.slice(3)}</h4>);
    else if (line.startsWith('# ')) out.push(<h3 key={key} className="font-display italic font-extrabold text-xl text-[#161616] mt-6 mb-2">{line.slice(2)}</h3>);
    else if (line.trim() === '') out.push(<div key={key} className="h-2" />);
    else out.push(<p key={key} className="font-sans text-sm text-[#161616]/85 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineMd(line) }} />);
  });
  flushList('end');
  return <div>{out}</div>;
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="font-mono font-bold text-[10px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-2.5 py-1.5 hover:translate-y-[1px] transition-transform shrink-0"
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

export default function CoachApp({ tier, email, savedRun }: { tier: Tier; email: string; savedRun: string | null }) {
  const [tab, setTab] = useState<Tab>('hud');
  // Start empty and load localStorage post-mount: reading it in the initializer
  // makes returning players' first client render disagree with the server HTML.
  const [progress, setProgress] = useState<Progress>({ xp: 0, completed: {}, updatedAt: new Date(0).toISOString() });
  useEffect(() => {
    const local = loadLocal();
    if (local.updatedAt > new Date(0).toISOString()) setProgress(local);
  }, []);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [welcome, setWelcome] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Welcome banner after checkout.
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('welcome') === '1') {
      setWelcome(true);
    }
  }, []);

  // Server sync: newest updatedAt wins.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/mustard-mode/progress');
        if (!res.ok) return;
        const data = (await res.json()) as { progress: Progress | null };
        if (data.progress && data.progress.updatedAt > loadLocal().updatedAt) {
          setProgress(data.progress);
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.progress));
        }
      } catch { /* offline fine */ }
    })();
  }, []);

  const persist = useCallback((p: Progress) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch('/api/mustard-mode/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: p }),
      }).catch(() => undefined);
    }, 1200);
  }, []);

  const completeMission = useCallback((m: Mission) => {
    setProgress((prev) => {
      if (prev.completed[m.id]) return prev;
      const p: Progress = {
        xp: prev.xp + m.xp,
        completed: { ...prev.completed, [m.id]: new Date().toISOString() },
        updatedAt: new Date().toISOString(),
      };
      persist(p);
      track('mustard_mission_shipped', { mission: m.id });
      return p;
    });
  }, [persist]);

  const { current: rank, next: nextRank } = rankFor(progress.xp);
  const completedCount = Object.keys(progress.completed).length;
  const totalMissions = tracks.reduce((n, t) => n + t.missions.length, 0);

  const nextMission = useMemo(() => {
    for (const t of tracks) {
      for (const m of t.missions) {
        if (!progress.completed[m.id]) return { track: t, mission: m };
      }
    }
    return null;
  }, [progress.completed]);

  const openMission = (t: Track, m: Mission) => {
    setActiveTrack(t);
    setActiveMission(m);
    setTab('tracks');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'hud', label: 'HUD' },
    { key: 'coach', label: 'Coach' },
    { key: 'tracks', label: 'Tracks' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'vault', label: 'Vault' },
  ];

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-[#080C16] border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-9 h-9 shrink-0">
              <Image src="/brand/mascot.png" alt="Mr. Mustard" fill sizes="36px" className="object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-mono font-bold text-[11px] md:text-xs text-[#FFDD55] tracking-wider truncate">[ MUSTARD MODE: ON ]</p>
              <p className="font-mono text-[9px] text-white/40 truncate">{email}{tier !== 'player' ? ` // ${tier.toUpperCase()}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 font-mono font-bold text-[10px] md:text-[11px]">
            <span className="text-[#F5B700] whitespace-nowrap">{progress.xp} XP</span>
            <span className="text-white/30">·</span>
            <span className="text-white whitespace-nowrap">{rank.name}</span>
          </div>
        </div>
        {/* Tabs */}
        <nav className="max-w-6xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key !== 'tracks') { setActiveMission(null); } }}
              className={`font-mono font-bold text-[11px] uppercase tracking-wider px-4 py-2.5 border-t-2 border-x-2 whitespace-nowrap ${
                tab === t.key
                  ? 'bg-[#FBF6EA] text-[#161616] border-[#161616] translate-y-[2px]'
                  : 'bg-transparent text-white/50 border-transparent hover:text-white'
              }`}
            >
              {t.label}
              {t.key === 'vault' && tier === 'player' && <span className="text-[#E0301E] ml-1">▲</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
        {welcome && (
          <div className="pop-card-yellow rounded-none p-5 mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono font-bold text-[11px] uppercase tracking-wider text-[#161616]">Player registered // Welcome to the cabinet</p>
              <p className="font-sans text-sm text-[#161616]/85 mt-1">
                {savedRun
                  ? `Your free-play run is loaded ("${savedRun.slice(0, 80)}"). Mr. Mustard remembers. Open the Coach tab and pick it up, or start Mission 01.`
                  : 'Your coach is live and your first mission is ready. Start on the HUD, or say hi in the Coach tab.'}
              </p>
            </div>
            <button onClick={() => setWelcome(false)} className="font-mono font-bold text-[#161616] text-sm shrink-0">✕</button>
          </div>
        )}

        {tab === 'hud' && (
          <HudTab
            progress={progress}
            rank={rank.name}
            nextRank={nextRank}
            completedCount={completedCount}
            totalMissions={totalMissions}
            nextMission={nextMission}
            tier={tier}
            onOpenMission={openMission}
            onCoach={() => setTab('coach')}
          />
        )}
        {tab === 'coach' && <CoachTab savedRun={savedRun} activeTrack={activeTrack} activeMission={activeMission} />}
        {tab === 'tracks' && (
          <TracksTab
            progress={progress}
            activeTrack={activeTrack}
            activeMission={activeMission}
            setActiveTrack={setActiveTrack}
            setActiveMission={setActiveMission}
            completeMission={completeMission}
            askCoach={() => setTab('coach')}
          />
        )}
        {tab === 'prompts' && <PromptsTab />}
        {tab === 'vault' && <VaultTab tier={tier} />}
      </main>
    </div>
  );
}

// ── HUD ────────────────────────────────────────────────────────────────
function HudTab({
  progress, rank, nextRank, completedCount, totalMissions, nextMission, tier, onOpenMission, onCoach,
}: {
  progress: Progress;
  rank: string;
  nextRank: { at: number; name: string } | null;
  completedCount: number;
  totalMissions: number;
  nextMission: { track: Track; mission: Mission } | null;
  tier: Tier;
  onOpenMission: (t: Track, m: Mission) => void;
  onCoach: () => void;
}) {
  const pct = nextRank ? Math.min(100, Math.round(((progress.xp) / nextRank.at) * 100)) : 100;
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6">
        {/* Rank card */}
        <div className="pop-card rounded-none p-6 md:col-span-2">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">Player HUD</p>
          <div className="flex items-end justify-between mt-3 gap-4 flex-wrap">
            <div>
              <span className="font-mono font-bold text-5xl text-[#F5B700]" style={{ textShadow: '2px 2px 0 #161616' }}>{progress.xp}</span>
              <span className="font-mono font-bold text-lg text-[#161616] ml-2">XP</span>
            </div>
            <div className="text-right">
              <p className="font-display italic font-extrabold text-2xl text-[#161616]">{rank}</p>
              {nextRank && <p className="font-mono text-[10px] text-[#161616]/60">{nextRank.at - progress.xp} XP TO {nextRank.name}</p>}
            </div>
          </div>
          <div className="mt-4 h-4 border-2 border-[#161616] bg-[#FBF6EA]">
            <div className="h-full bg-[#F5B700] transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="font-mono text-[11px] text-[#161616]/60 mt-3">
            {completedCount}/{totalMissions} MISSIONS SHIPPED · {totalXp} XP IN THE GAME
            {tier !== 'player' && <span className="text-[#1E50C8]"> · FOUNDING {tier.toUpperCase()}</span>}
          </p>
        </div>

        {/* Next mission */}
        <div className="bg-[#080C16] border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] p-6 flex flex-col">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">Next mission</p>
          {nextMission ? (
            <>
              <p className="font-mono text-[10px] mt-3" style={{ color: nextMission.track.color }}>
                {nextMission.track.name.toUpperCase()}
              </p>
              <h3 className="font-display font-extrabold text-xl text-white mt-1 flex-1">{nextMission.mission.title}</h3>
              <p className="font-mono text-[10px] text-white/50 mt-2">
                ~{nextMission.mission.minutes} MIN · +{nextMission.mission.xp} XP
              </p>
              <button
                onClick={() => onOpenMission(nextMission.track, nextMission.mission)}
                className="mt-4 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-5 py-2.5 text-sm hover:translate-y-[1px] transition-transform"
              >
                Start mission →
              </button>
            </>
          ) : (
            <>
              <h3 className="font-display font-extrabold text-xl text-white mt-3 flex-1">All 28 missions shipped. Hundredfold.</h3>
              <button onClick={onCoach} className="mt-4 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-5 py-2.5 text-sm">
                Tell the coach →
              </button>
            </>
          )}
        </div>
      </div>

      {/* Track progress */}
      <div className="grid md:grid-cols-4 gap-4 mt-6">
        {tracks.map((t) => {
          const done = t.missions.filter((m) => progress.completed[m.id]).length;
          return (
            <div key={t.slug} className="border-2 border-[#161616] bg-white p-4">
              <p className="font-mono font-bold text-[10px] tracking-wider" style={{ color: t.color === '#F5B700' ? '#8A6A00' : t.color }}>{t.name.toUpperCase()}</p>
              <div className="mt-2 h-2.5 border border-[#161616] bg-[#FBF6EA]">
                <div className="h-full" style={{ width: `${(done / t.missions.length) * 100}%`, background: t.color }} />
              </div>
              <p className="font-mono text-[10px] text-[#161616]/60 mt-1.5">{done}/{t.missions.length}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Coach ──────────────────────────────────────────────────────────────
function CoachTab({ savedRun, activeTrack, activeMission }: { savedRun: string | null; activeTrack: Track | null; activeMission: Mission | null }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_KEY);
      if (raw) setMessages(JSON.parse(raw) as ChatMsg[]);
    } catch { /* fresh */ }
    setChatLoaded(true);
  }, []);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatLoaded) return;
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-40)));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatLoaded]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setErr(null);
    setInput('');
    const next: ChatMsg[] = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setBusy(true);
    track('mustard_coach_message');
    try {
      const res = await fetch('/api/mustard-mode/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-12),
          trackName: activeTrack?.name,
          missionTitle: activeMission?.title,
        }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (res.ok && data.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply! }]);
      } else {
        setErr('The coach dropped his headset. Try again in a few seconds.');
      }
    } catch {
      setErr('The coach dropped his headset. Try again in a few seconds.');
    } finally {
      setBusy(false);
    }
  };

  const starters = [
    savedRun ? `Let's work on what I came here for: ${savedRun.slice(0, 120)}` : "What should I build first?",
    activeMission ? `Coach me through the mission "${activeMission.title}"` : 'Which track should I start with?',
    'Review something I just shipped',
  ];

  return (
    <div className="max-w-3xl">
      <div className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#161616]">
        <div className="flex items-center gap-2 bg-[#0F1422] px-4 py-2.5 border-b border-white/10">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E0301E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#F5B700]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#3fbf6b]" />
          <span className="font-mono text-[10px] text-[#5C7188] ml-2">
            mr-mustard — live coach{activeMission ? ` — ${activeMission.title}` : ''}
          </span>
        </div>
        <div className="p-5 h-[52vh] overflow-y-auto font-mono text-[13px] leading-relaxed">
          {messages.length === 0 && (
            <div className="text-[#d7dbe6]">
              <span className="text-[#FFDD55] font-bold">MR.MUSTARD: </span>
              {savedRun
                ? `There you are. Last time you told me you want to build ${savedRun.slice(0, 100)}. I have not stopped thinking about it. Ready to make it real?`
                : 'Coach is on. Tell me what you want to build, or ask me anything about your current mission.'}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="mt-4 text-[#d7dbe6]">
              <span className={`font-bold ${m.role === 'user' ? 'text-[#7aa2ff]' : 'text-[#FFDD55]'}`}>
                {m.role === 'user' ? 'YOU: ' : 'MR.MUSTARD: '}
              </span>
              <span className="whitespace-pre-wrap">{m.content}</span>
            </div>
          ))}
          {busy && <p className="mt-4 text-[#5C7188] animate-pulse">MR.MUSTARD is thinking…</p>}
          {err && <p className="mt-4 text-[#ff6b5e]">{err}</p>}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex items-center gap-2 border-t border-white/10 p-3"
          onSubmit={(e) => { e.preventDefault(); void send(); }}
        >
          <span className="font-mono text-[#5C7188]">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to your coach…"
            aria-label="Message Mr. Mustard"
            className="flex-1 bg-transparent outline-none font-mono text-[13px] text-white placeholder:text-[#5C7188]/70 caret-[#F5B700]"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="font-mono font-bold text-[11px] uppercase tracking-wider bg-[#F5B700] text-[#161616] border border-[#161616] px-3 py-1.5 disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {starters.map((s) => (
          <button
            key={s}
            onClick={() => void send(s)}
            disabled={busy}
            className="font-mono text-[11px] font-bold border-2 border-[#161616] bg-white px-3 py-1.5 hover:bg-[#F5B700] transition-colors disabled:opacity-40 text-left"
          >
            {s.length > 64 ? `${s.slice(0, 64)}…` : s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tracks ─────────────────────────────────────────────────────────────
function TracksTab({
  progress, activeTrack, activeMission, setActiveTrack, setActiveMission, completeMission, askCoach,
}: {
  progress: Progress;
  activeTrack: Track | null;
  activeMission: Mission | null;
  setActiveTrack: (t: Track | null) => void;
  setActiveMission: (m: Mission | null) => void;
  completeMission: (m: Mission) => void;
  askCoach: () => void;
}) {
  if (activeTrack && activeMission) {
    const done = Boolean(progress.completed[activeMission.id]);
    const idx = activeTrack.missions.findIndex((m) => m.id === activeMission.id);
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => setActiveMission(null)}
          className="font-mono font-bold text-[11px] text-[#1E50C8] uppercase tracking-wider"
        >
          ← {activeTrack.name} missions
        </button>
        <div className="pop-card rounded-none p-7 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono font-bold text-[11px] tracking-wider" style={{ color: activeTrack.color }}>
              [ MISSION {String(idx + 1).padStart(2, '0')}/{String(activeTrack.missions.length).padStart(2, '0')} ]
            </span>
            <span className="font-mono text-[11px] font-bold text-[#161616]/60">~{activeMission.minutes} MIN · +{activeMission.xp} XP</span>
          </div>
          <h2 className="font-display italic font-extrabold text-3xl text-[#161616] mt-3">{activeMission.title}</h2>

          <div className="mt-4 bg-[#FBF6EA] border-2 border-[#161616] p-4 flex gap-3 items-start">
            <div className="relative w-10 h-10 shrink-0">
              <Image src="/brand/mascot.png" alt="" fill sizes="40px" className="object-contain" />
            </div>
            <p className="font-sans text-sm font-medium text-[#161616] italic">&ldquo;{activeMission.coachCue}&rdquo;</p>
          </div>

          <div className="mt-6 space-y-4">
            {activeMission.lesson.map((p, i) => (
              <p key={i} className="font-sans text-[15px] text-[#161616]/85 leading-relaxed">{p}</p>
            ))}
          </div>

          {activeMission.prompts.length > 0 && (
            <div className="mt-8">
              <p className="font-mono font-bold text-[11px] tracking-wider text-[#E0301E] uppercase">Run these</p>
              <div className="space-y-3 mt-3">
                {activeMission.prompts.map((pr) => (
                  <div key={pr.label} className="border-2 border-[#161616] bg-[#080C16]">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                      <span className="font-mono font-bold text-[11px] text-[#FFDD55]">{pr.label}</span>
                      <CopyButton text={pr.text} />
                    </div>
                    <pre className="p-4 font-mono text-[12px] text-[#d7dbe6] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{pr.text}</pre>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-2 border-dashed border-[#161616]/40 p-5">
            <p className="font-mono font-bold text-[11px] tracking-wider text-[#E0301E] uppercase">Your assignment</p>
            <p className="font-sans text-[15px] text-[#161616] mt-2 leading-relaxed">{activeMission.assignment}</p>
            <p className="font-mono text-[11px] text-[#161616]/60 mt-3">DONE = {activeMission.proof}</p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => completeMission(activeMission)}
              disabled={done}
              className={`font-sans font-bold border-2 border-[#161616] px-6 py-3 transition-all ${
                done
                  ? 'bg-white text-[#161616]/50'
                  : 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616]'
              }`}
            >
              {done ? `Shipped ✓ (+${activeMission.xp} XP banked)` : `Mark shipped (+${activeMission.xp} XP)`}
            </button>
            <button
              onClick={askCoach}
              className="font-sans font-bold bg-white text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-6 py-3 hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] transition-all"
            >
              Coach me through it
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeTrack) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => setActiveTrack(null)} className="font-mono font-bold text-[11px] text-[#1E50C8] uppercase tracking-wider">
          ← All tracks
        </button>
        <h2 className="font-display italic font-extrabold text-4xl text-[#161616] mt-3">{activeTrack.name}</h2>
        <p className="font-sans text-[#161616]/70 mt-1">{activeTrack.tagline}</p>
        <div className="mt-6 space-y-3">
          {activeTrack.missions.map((m, i) => {
            const done = Boolean(progress.completed[m.id]);
            const boss = i === activeTrack.missions.length - 1;
            return (
              <button
                key={m.id}
                onClick={() => setActiveMission(m)}
                className={`w-full text-left border-2 border-[#161616] p-4 flex items-center gap-4 transition-all hover:translate-x-1 ${
                  done ? 'bg-[#FBF6EA]' : boss ? 'bg-[#080C16]' : 'bg-white'
                }`}
              >
                <span
                  className={`font-mono font-bold text-sm w-9 h-9 grid place-items-center border-2 border-[#161616] shrink-0 ${
                    done ? 'bg-[#F5B700]' : boss ? 'bg-[#E0301E] text-white' : 'bg-[#FBF6EA]'
                  }`}
                >
                  {done ? '✓' : boss ? '★' : String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`font-sans font-bold text-sm block truncate ${boss && !done ? 'text-white' : 'text-[#161616]'}`}>
                    {m.title}{boss ? ' (BOSS)' : ''}
                  </span>
                  <span className={`font-mono text-[10px] ${boss && !done ? 'text-white/50' : 'text-[#161616]/50'}`}>
                    ~{m.minutes} MIN · +{m.xp} XP
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {tracks.map((t, i) => {
        const done = t.missions.filter((m) => progress.completed[m.id]).length;
        return (
          <button
            key={t.slug}
            onClick={() => setActiveTrack(t)}
            className="text-left pop-card rounded-none p-7 hover:-translate-y-1 transition-transform"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[11px] tracking-wider" style={{ color: t.color === '#F5B700' ? '#8A6A00' : t.color }}>[ TRACK 0{i + 1} ]</span>
              <span className="font-mono font-bold text-[10px] text-[#161616]/50">{done}/{t.missions.length}</span>
            </div>
            <h3 className="font-display italic font-extrabold text-2xl text-[#161616] mt-3">{t.name}</h3>
            <p className="font-sans text-sm text-[#161616]/70 mt-1">{t.tagline}</p>
            <div className="mt-4 h-2.5 border border-[#161616] bg-[#FBF6EA]">
              <div className="h-full" style={{ width: `${(done / t.missions.length) * 100}%`, background: t.color }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Prompts ────────────────────────────────────────────────────────────
function PromptsTab() {
  const [cat, setCat] = useState<PromptCard['category'] | 'all'>('all');
  const [q, setQ] = useState('');
  const cards = promptCards.filter(
    (c) =>
      (cat === 'all' || c.category === cat) &&
      (q.trim() === '' || `${c.title} ${c.whenToUse} ${c.text}`.toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCat('all')}
          className={`font-mono font-bold text-[11px] uppercase border-2 border-[#161616] px-3 py-1.5 ${cat === 'all' ? 'bg-[#161616] text-white' : 'bg-white'}`}
        >
          All {promptCards.length}
        </button>
        {promptCategories.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`font-mono font-bold text-[11px] uppercase border-2 border-[#161616] px-3 py-1.5 ${cat === c.key ? 'bg-[#F5B700]' : 'bg-white'}`}
          >
            {c.label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the library…"
          className="ml-auto font-sans text-sm border-2 border-[#161616] bg-white px-3 py-1.5 outline-none focus:bg-[#FFFDF6] min-w-[200px]"
        />
      </div>
      <div className="grid md:grid-cols-2 gap-5 mt-6">
        {cards.map((c) => (
          <div key={c.id} className="pop-card rounded-none p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-[#E0301E]">[{c.category}]</span>
                <h3 className="font-display font-extrabold text-lg text-[#161616] mt-1">{c.title}</h3>
              </div>
              <CopyButton text={c.text} />
            </div>
            <p className="font-sans text-[12px] text-[#161616]/60 mt-1">{c.whenToUse}</p>
            <pre className="mt-3 font-mono text-[11.5px] text-[#161616]/85 whitespace-pre-wrap leading-relaxed bg-[#FBF6EA] border border-[#161616]/25 p-3 max-h-44 overflow-y-auto flex-1">{c.text}</pre>
            {c.proTip && <p className="font-mono text-[10px] font-bold text-[#1E50C8] mt-2">PRO TIP: {c.proTip}</p>}
          </div>
        ))}
      </div>
      {cards.length === 0 && <p className="font-mono text-sm text-[#161616]/50 mt-8">No prompts match. Loosen the search.</p>}
    </div>
  );
}

// ── Vault ──────────────────────────────────────────────────────────────
function VaultTab({ tier }: { tier: Tier }) {
  const [open, setOpen] = useState<Blueprint | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = tier === 'player';

  const upgrade = async () => {
    setBusy(true);
    track('mustard_vault_upgrade_click');
    try {
      const res = await fetch('/api/mustard-mode/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'mustard-mode-builder' }),
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setBusy(false);
    }
  };

  if (locked) {
    return (
      <div className="max-w-xl">
        <div className="bg-[#080C16] border-2 border-[#161616] shadow-[6px_6px_0_0_#F5B700] p-8">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">[ Level 02 territory ]</p>
          <h2 className="font-display italic font-extrabold text-3xl text-white mt-3">The Builder vault is locked</h2>
          <p className="font-sans text-sm text-white/70 mt-3 leading-relaxed">
            Nine complete blueprints (the CLAUDE.md starter, the landing page build script, the spec
            template, the debug protocol, and five more), plus a personal studio review of your boss
            mission. Builder is a one-time upgrade and everything you have here carries over.
          </p>
          <button
            onClick={() => void upgrade()}
            disabled={busy}
            className="mt-6 font-sans font-bold bg-[#F5B700] text-[#161616] border-2 border-[#161616] px-6 py-3 hover:translate-y-[1px] transition-transform disabled:opacity-50"
          >
            {busy ? 'Opening checkout…' : 'Unlock the vault'}
          </button>
          <p className="font-mono text-[10px] text-white/40 mt-3">
            ALREADY A PLAYER? EMAIL SARAH FIRST FOR YOUR $197 CREDIT CODE, THEN CHECK OUT. PROMO CODES WORK AT CHECKOUT.
          </p>
        </div>
      </div>
    );
  }

  if (open) {
    return (
      <div className="max-w-3xl">
        <button onClick={() => setOpen(null)} className="font-mono font-bold text-[11px] text-[#1E50C8] uppercase tracking-wider">
          ← Vault
        </button>
        <div className="pop-card rounded-none p-7 mt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-[#E0301E]">[{open.kind}]</span>
              <h2 className="font-display italic font-extrabold text-3xl text-[#161616] mt-1">{open.name}</h2>
            </div>
            <CopyButton text={open.body} label="Copy all" />
          </div>
          <div className="mt-5"><MarkdownLite body={open.body} /></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pop-card-yellow rounded-none p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="font-sans text-sm font-bold text-[#161616]">
          Ship-off: finished a boss mission? Send it in for your personal studio review.
        </p>
        <a
          href={`mailto:sarah@modernmustardseed.com?subject=${encodeURIComponent('MUSTARD MODE ship-off review')}&body=${encodeURIComponent('Coach, here is my boss mission build:\n\nLink: \nTrack: \nWhat I want eyes on: ')}`}
          className="font-mono font-bold text-[11px] uppercase tracking-wider bg-[#161616] text-white px-4 py-2 shrink-0"
        >
          Submit for review →
        </a>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {blueprints.map((b) => (
          <button key={b.id} onClick={() => setOpen(b)} className="text-left pop-card rounded-none p-5 hover:-translate-y-1 transition-transform">
            <span className="font-mono font-bold text-[10px] uppercase tracking-wider text-[#E0301E]">[{b.kind}]</span>
            <h3 className="font-display font-extrabold text-lg text-[#161616] mt-1">{b.name}</h3>
            <p className="font-sans text-[12px] text-[#161616]/65 mt-1.5">{b.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
