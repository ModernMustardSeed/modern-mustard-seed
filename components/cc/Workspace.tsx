'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/cc/icons';
import { Badge, Button, cx } from '@/components/cc/ui';
import Overview from '@/components/cc/modules/Overview';
import Leads from '@/components/cc/modules/Leads';
import Contacts from '@/components/cc/modules/Contacts';
import Conversations from '@/components/cc/modules/Conversations';
import Inbox from '@/components/cc/modules/Inbox';
import Reviews from '@/components/cc/modules/Reviews';
import Marketing from '@/components/cc/modules/Marketing';
import Website from '@/components/cc/modules/Website';
import Accounts from '@/components/cc/modules/Accounts';
import Operator from '@/components/cc/Operator';
import Palette from '@/components/cc/Palette';

/**
 * THE WORKSPACE. One rail, one canvas, one operator.
 *
 * The rail is the whole product in a glance, so it is grouped the way a day
 * runs: the people waiting first, the work that brings more of them second,
 * the plumbing last. Modules the account does not own are not greyed out,
 * they are absent; a door that opens on nothing is worse than no door.
 *
 * The module lives in the URL hash, so a reload, a bookmark and a link from
 * the operator all land in the same room.
 */

export type Session = {
  email: string;
  person: string | null;
  preview: boolean;
  brand: { business: string; name: string; logo: string; logoOnDark: string; colors: { ink: string; paper: string; accent: string; accent2: string }; siteUrl: string; guideName: string };
  modules: Record<string, boolean>;
  state: { mailConnected: boolean; crm: string | null; crmConnected: boolean; crmCaptcha: boolean };
};

export type Pulse = {
  leads: { waiting: number; today: number; month: number; days: Array<{ day: string; count: number }> };
  inbox: { unread: number; needsReply: number };
  reviews: { asked30: number };
  marketing: { scheduled: number; awaitingApproval: number };
  scans: { week: number };
  domains: { dueSoon: number; first: { domain: string; days: number | null } | null; total: number };
  contacts: { total: number };
};

type ModuleKey = 'overview' | 'leads' | 'contacts' | 'conversations' | 'inbox' | 'reviews' | 'marketing' | 'website' | 'accounts';

const MODULES: Array<{ key: ModuleKey; label: string; icon: IconName; group: string; title: string; blurb: string }> = [
  { key: 'overview', label: 'Overview', icon: 'overview', group: 'Today', title: 'Overview', blurb: 'What is waiting, what came in, what goes out.' },
  { key: 'leads', label: 'Leads', icon: 'leads', group: 'Today', title: 'Leads', blurb: 'Everyone who reached out, and the door they used.' },
  { key: 'inbox', label: 'Inbox', icon: 'inbox', group: 'Today', title: 'Inbox', blurb: 'Your mail, sorted, with a reply drafted where one is needed.' },
  { key: 'conversations', label: 'Conversations', icon: 'chat', group: 'Today', title: 'Conversations', blurb: 'Every chat on your website, in their words.' },
  { key: 'contacts', label: 'Contacts', icon: 'contacts', group: 'Book', title: 'Contacts', blurb: 'Your whole book: customers, subs, suppliers, realtors.' },
  { key: 'reviews', label: 'Reviews', icon: 'reviews', group: 'Growth', title: 'Reviews', blurb: 'Ask when a job closes. Nobody gets asked twice.' },
  { key: 'marketing', label: 'Marketing', icon: 'marketing', group: 'Growth', title: 'Marketing', blurb: 'What goes out this week, and what is waiting on your word.' },
  { key: 'website', label: 'Website', icon: 'website', group: 'Growth', title: 'Website', blurb: 'Your pages, your project photos, your articles.' },
  { key: 'accounts', label: 'Accounts', icon: 'accounts', group: 'System', title: 'Accounts', blurb: 'What this runs on, and the one thing to do where it is not connected.' },
];

const GROUPS = ['Today', 'Book', 'Growth', 'System'];

function readHash(): ModuleKey {
  if (typeof window === 'undefined') return 'overview';
  const h = window.location.hash.replace('#', '') as ModuleKey;
  return MODULES.some((m) => m.key === h) ? h : 'overview';
}

export default function Workspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [active, setActive] = useState<ModuleKey>('overview');
  const [railOpen, setRailOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadPulse = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/pulse', { cache: 'no-store' });
      if (r.ok) setPulse((await r.json()) as Pulse);
    } catch {
      /* the board still renders without its badges */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/cc/session', { cache: 'no-store' });
        if (r.status === 401) {
          window.location.href = '/cc/login';
          return;
        }
        if (!r.ok) {
          if (alive) setFailed(true);
          return;
        }
        const j = (await r.json()) as Session;
        if (alive) setSession(j);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    void loadPulse();
    const t = setInterval(loadPulse, 60_000);
    return () => clearInterval(t);
  }, [session, loadPulse]);

  useEffect(() => {
    const sync = () => setActive(readHash());
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setRailOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback((key: ModuleKey) => {
    window.location.hash = key;
    setActive(key);
    setRailOpen(false);
    setPaletteOpen(false);
  }, []);

  const visible = useMemo(() => MODULES.filter((m) => session?.modules?.[m.key] !== false), [session]);
  // A hash for a room this account does not own lands on the Overview rather
  // than on a door that opens on nothing.
  const allowed = session && !visible.some((m) => m.key === active) ? 'overview' : active;
  const current = MODULES.find((m) => m.key === allowed) ?? MODULES[0];
  const brand = session?.brand;

  const badge = (key: ModuleKey): number => {
    if (!pulse) return 0;
    if (key === 'leads') return pulse.leads.waiting;
    if (key === 'inbox') return pulse.inbox.needsReply;
    if (key === 'marketing') return pulse.marketing.awaitingApproval;
    return 0;
  };

  if (failed) {
    return (
      <main className="min-h-screen grid place-items-center bg-[#F6F7F9] px-6">
        <div className="max-w-md text-center text-[#12151b]">
          <h1 className="font-display text-2xl">The Command Center could not load</h1>
          <p className="mt-2 text-[14px] text-[#5b6472]">It is us, not you. Try again in a moment, or email sarah@modernmustardseed.com and it gets looked at today.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => window.location.reload()} kind="primary">Reload</Button>
            <Button href="/cc/login">Sign in again</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      className="cc min-h-screen bg-[var(--cc-paper)] text-[var(--cc-ink)]"
      style={
        {
          '--cc-ink': '#12151b',
          '--cc-paper': '#F6F7F9',
          '--cc-card': '#FFFFFF',
          '--cc-line': '#E4E7EC',
          '--cc-muted': '#5B6472',
          '--cc-accent': brand?.colors.accent ?? '#1E50C8',
          '--cc-accent-2': brand?.colors.accent2 ?? '#B54708',
        } as React.CSSProperties
      }
    >
      <div className="flex min-h-screen">
        {/* rail */}
        <aside
          className={cx(
            'fixed lg:static inset-y-0 left-0 z-40 w-[248px] flex-none bg-[#0F1218] text-white flex flex-col transition-transform',
            railOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className="px-5 pt-5 pb-4 border-b border-white/10">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">Command Center</p>
            <div className="mt-2 flex items-center gap-2.5">
              {brand?.logoOnDark && (
                // Their mark, on their board, on a light chip so a dark logo and a
                // light one both read. A plain img: the logo is served from their
                // own site and the optimiser has no business in the middle.
                <span className="flex-none rounded-md bg-white/90 px-1.5 py-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brand.logoOnDark} alt="" className="h-6 w-auto max-w-[64px] object-contain" />
                </span>
              )}
              <p className="font-display text-[18px] leading-tight text-white">{brand?.business ?? 'Loading'}</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-3">
            {GROUPS.map((group) => {
              const items = visible.filter((m) => m.group === group);
              if (!items.length) return null;
              return (
                <div key={group} className="px-3 pb-2">
                  <p className="px-2 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/35">{group}</p>
                  {items.map((m) => {
                    const n = badge(m.key);
                    return (
                      <button
                        key={m.key}
                        onClick={() => go(m.key)}
                        className={cx(
                          'group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] transition',
                          active === m.key ? 'bg-white/[0.09] text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
                        )}
                        aria-current={active === m.key ? 'page' : undefined}
                      >
                        <span className={cx('flex-none', active === m.key ? 'text-[var(--cc-accent)]' : 'text-white/45 group-hover:text-white/75')}>
                          <Icon name={m.icon} />
                        </span>
                        <span className="flex-1 truncate font-medium">{m.label}</span>
                        {n > 0 && <span className="flex-none rounded-full bg-[var(--cc-accent)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">{n}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="flex-none border-t border-white/10 px-4 py-3">
            <button onClick={() => setOperatorOpen(true)} className="w-full flex items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-2.5 text-left text-[13px] font-semibold text-white hover:bg-white/[0.12] transition">
              <span className="text-[var(--cc-accent)]"><Icon name="operator" /></span>
              Ask the Operator
            </button>
            <a href="/portal" className="mt-3 block font-mono text-[9px] uppercase tracking-[0.16em] text-white/45 hover:text-white">
              Your project portal
            </a>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-[11px] text-white/45">{session?.email ?? ''}</span>
              <button
                onClick={async () => {
                  await fetch('/api/cc/logout', { method: 'POST' });
                  window.location.href = '/cc/login';
                }}
                className="flex-none font-mono text-[9px] uppercase tracking-[0.16em] text-white/45 hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {railOpen && <button className="fixed inset-0 z-30 bg-[#0c111d]/40 lg:hidden" aria-label="Close menu" onClick={() => setRailOpen(false)} />}

        {/* canvas */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-20 flex-none border-b border-[var(--cc-line)] bg-[var(--cc-paper)]/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
              <button className="lg:hidden rounded-lg border border-[var(--cc-line)] bg-white p-2" onClick={() => setRailOpen(true)} aria-label="Open menu">
                <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[22px] leading-tight truncate">{current.title}</h1>
                <p className="hidden sm:block text-[12.5px] text-[var(--cc-muted)] truncate">{current.blurb}</p>
              </div>
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-lg border border-[var(--cc-line)] bg-white px-3 py-2 text-[13px] text-[var(--cc-muted)] hover:border-[var(--cc-ink)]"
              >
                <Icon name="search" size={16} />
                Search or jump
                <span className="ml-1 rounded border border-[var(--cc-line)] px-1.5 py-0.5 font-mono text-[10px]">⌘K</span>
              </button>
              <Button kind="primary" onClick={() => setOperatorOpen(true)}>
                <Icon name="operator" size={16} />
                Operator
              </Button>
            </div>
            {session?.preview && (
              <div className="px-4 sm:px-6 pb-2">
                <Badge tone="warn">Looking as {session.email}. Everything you do here is real.</Badge>
              </div>
            )}
          </header>

          <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6">
            <div className="mx-auto w-full max-w-[1320px]">
              {!session ? (
                <div className="space-y-3">
                  <div className="h-24 rounded-xl bg-[#EEF0F3] animate-pulse" />
                  <div className="h-64 rounded-xl bg-[#EEF0F3] animate-pulse" />
                </div>
              ) : allowed === 'overview' ? (
                <Overview session={session} pulse={pulse} go={(k) => go(k as ModuleKey)} refreshPulse={loadPulse} />
              ) : allowed === 'leads' ? (
                <Leads session={session} refreshPulse={loadPulse} />
              ) : allowed === 'contacts' ? (
                <Contacts />
              ) : allowed === 'conversations' ? (
                <Conversations />
              ) : allowed === 'inbox' ? (
                <Inbox refreshPulse={loadPulse} />
              ) : allowed === 'reviews' ? (
                <Reviews />
              ) : allowed === 'marketing' ? (
                <Marketing refreshPulse={loadPulse} />
              ) : allowed === 'website' ? (
                <Website session={session} />
              ) : (
                <Accounts session={session} />
              )}
            </div>
          </main>

          <footer className="flex-none px-4 sm:px-6 py-4 text-[11px] text-[var(--cc-muted)] border-t border-[var(--cc-line)]">
            {brand?.business} Command Center. Built and run by{' '}
            <a href="https://modernmustardseed.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#F5B700] hover:underline">
              Modern Mustard Seed
            </a>
            .
          </footer>
        </div>
      </div>

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} modules={visible.map((m) => ({ key: m.key, label: m.label, blurb: m.blurb }))} go={(k) => go(k as ModuleKey)} onOperator={() => { setPaletteOpen(false); setOperatorOpen(true); }} />
      <Operator open={operatorOpen} onClose={() => setOperatorOpen(false)} session={session} go={(k) => go(k as ModuleKey)} onDidAct={loadPulse} />
    </div>
  );
}
