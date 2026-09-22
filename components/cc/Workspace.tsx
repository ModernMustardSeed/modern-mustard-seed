'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from '@/components/cc/icons';
import { Badge, Button, Who, cx, waited } from '@/components/cc/ui';
import Overview from '@/components/cc/modules/Overview';
import Leads from '@/components/cc/modules/Leads';
import Contacts from '@/components/cc/modules/Contacts';
import Conversations from '@/components/cc/modules/Conversations';
import Inbox from '@/components/cc/modules/Inbox';
import Reviews from '@/components/cc/modules/Reviews';
import Marketing from '@/components/cc/modules/Marketing';
import Website from '@/components/cc/modules/Website';
import Accounts from '@/components/cc/modules/Accounts';
import Domains from '@/components/cc/modules/Domains';
import Week from '@/components/cc/modules/Week';
import Traffic from '@/components/cc/modules/Traffic';
import Campaigns from '@/components/cc/modules/Campaigns';
import Jobs from '@/components/cc/modules/Jobs';
import Field from '@/components/cc/modules/Field';
import Operator from '@/components/cc/Operator';
import Tray from '@/components/cc/Tray';
import Person, { type Who as PersonWho } from '@/components/cc/Person';
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
  /** The named person at the desk, when they have said who they are. */
  who: { key: string; name: string } | null;
  people: Array<{ key: string; name: string }>;
  preview: boolean;
  brand: { business: string; name: string; logo: string; logoOnDark: string; colors: { ink: string; paper: string; accent: string; accent2: string }; siteUrl: string; guideName: string };
  modules: Record<string, boolean>;
  /** Their project pages, each with the opening of its story and its cover. */
  projects: Array<{ slug: string; title: string; story?: string; image?: string }>;
  publicUrl: string;
  state: { mailConnected: boolean; crm: string | null; crmConnected: boolean; crmCaptcha: boolean };
};

export type Pulse = {
  leads: { waiting: number; oldestWaitingAt: string | null; mine: number; unowned: number; today: number; month: number; days: Array<{ day: string; count: number }> };
  inbox: { unread: number; needsReply: number };
  reviews: { asked30: number };
  marketing: { scheduled: number; awaitingApproval: number };
  scans: { week: number };
  domains: { dueSoon: number; first: { domain: string; days: number | null } | null; total: number };
  contacts: { total: number };
};

type ModuleKey = 'overview' | 'week' | 'traffic' | 'campaigns' | 'jobs' | 'field' | 'leads' | 'contacts' | 'conversations' | 'inbox' | 'reviews' | 'marketing' | 'website' | 'domains' | 'accounts';

const MODULES: Array<{ key: ModuleKey; label: string; icon: IconName; group: string; title: string; blurb: string }> = [
  { key: 'overview', label: 'Now', icon: 'overview', group: 'Today', title: 'Now', blurb: 'What needs you, and nothing else.' },
  { key: 'leads', label: 'Leads', icon: 'leads', group: 'Today', title: 'Leads', blurb: 'Everyone who reached out, and the door they used.' },
  { key: 'inbox', label: 'Inbox', icon: 'inbox', group: 'Today', title: 'Inbox', blurb: 'Your mail, sorted, with a reply drafted where one is needed.' },
  { key: 'jobs', label: 'The Board', icon: 'board', group: 'Today', title: 'The Board', blurb: 'Every job from the first call to the contract. Buildertrend takes it from there.' },
  { key: 'field', label: 'From the site', icon: 'tray', group: 'Today', title: 'From the site', blurb: 'Photos from the job become the record, a note to the homeowner, and a post.' },
  { key: 'conversations', label: 'Conversations', icon: 'chat', group: 'Today', title: 'Conversations', blurb: 'Every chat on your website, in their words.' },
  { key: 'week', label: 'This week', icon: 'week', group: 'Today', title: 'This week', blurb: 'What the website and the desk did, counted. Made to be forwarded.' },
  { key: 'contacts', label: 'Contacts', icon: 'contacts', group: 'Book', title: 'Contacts', blurb: 'Your whole book: customers, subs, suppliers, realtors.' },
  { key: 'reviews', label: 'Reviews', icon: 'reviews', group: 'Growth', title: 'Reviews', blurb: 'Ask when a job closes. Nobody gets asked twice.' },
  { key: 'marketing', label: 'Marketing', icon: 'marketing', group: 'Growth', title: 'Marketing', blurb: 'What goes out this week, and what is waiting on your word.' },
  { key: 'website', label: 'Website', icon: 'website', group: 'Growth', title: 'Website', blurb: 'Your pages, your project photos, your articles.' },
  { key: 'campaigns', label: 'Campaigns', icon: 'send', group: 'Growth', title: 'Campaigns', blurb: 'One message, in your words, to the people in your book.' },
  { key: 'traffic', label: 'Traffic', icon: 'spark', group: 'Growth', title: 'Traffic', blurb: 'Who came to your website, what they read, and how many reached out.' },
  { key: 'domains', label: 'Domains', icon: 'out', group: 'System', title: 'Domains', blurb: 'Every name you own, who holds it, and when it renews.' },
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
  // What the Operator opens with. send is true only when a person typed the
  // words themselves; a suggestion fills the box and waits for their press.
  const [seed, setSeed] = useState<{ text: string; send: boolean; n: number } | null>(null);
  const [askText, setAskText] = useState('');
  const [deskOpen, setDeskOpen] = useState(false);
  // The tray is reachable from every room on purpose: the moment somebody has
  // a napkin in their hand is not the moment to go looking for the right screen.
  const [trayOpen, setTrayOpen] = useState(false);
  // Who the search was really asking about. A name typed at speed almost
  // always means "who is this and what do we know".
  const [person, setPerson] = useState<PersonWho | null>(null);

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
        // 403 is a signed-in account whose Command Center is switched off. That
        // is not a fault, so it lands on sign-in, not on the failure screen.
        if (r.status === 401 || r.status === 403) {
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

  const ask = useCallback((text?: string, send = false) => {
    if (text) setSeed((prev) => ({ text, send, n: (prev?.n ?? 0) + 1 }));
    setOperatorOpen(true);
    setRailOpen(false);
  }, []);

  const sitDown = useCallback(async (key: string) => {
    setDeskOpen(false);
    try {
      const r = await fetch('/api/cc/who', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
      const j = (await r.json()) as { ok?: boolean; who?: { key: string; name: string } };
      if (r.ok && j.who) {
        setSession((prev) => (prev ? { ...prev, who: j.who ?? null, person: j.who?.name ?? null } : prev));
        void loadPulse();
      }
    } catch {
      /* the picker stays where it was; nothing was signed under a wrong name */
    }
  }, [loadPulse]);

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
      // The brand never loaded on this screen, so the tokens the buttons read
      // are set here. Without them the primary button is white on nothing.
      <main className="min-h-screen grid place-items-center bg-[#F6F7F9] px-6" style={{ '--cc-accent': '#12151b', '--cc-ink': '#12151b', '--cc-line': '#E4E7EC', '--cc-muted': '#5B6472' } as React.CSSProperties}>
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
            'fixed lg:sticky lg:top-0 lg:h-screen inset-y-0 left-0 z-40 w-[248px] print:hidden flex-none bg-[#0F1218] text-white flex flex-col transition-transform',
            railOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          <div className="px-5 pt-5 pb-4 border-b border-white/10">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">Command Center</p>
            <div className="mt-2 flex items-center gap-2.5">
              {brand?.logoOnDark && (
                // Their mark, on their board, straight onto the dark rail.
                //
                // It used to sit on a white chip, on the theory that a chip
                // makes any logo readable. It does the opposite here: a
                // logoOnDark asset is a WHITE logo, and a white logo on a
                // white chip is a blank square. The right rule is simpler and
                // it is in the field name: the dark logo belongs on the dark
                // rail. A plain img, because the file is served from their own
                // site and the optimiser has no business in the middle.
                <span className="flex-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={brand.logoOnDark} alt="" className="h-9 w-auto max-w-[84px] object-contain" />
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
                    const cold = m.key === 'leads' && pulse?.leads.oldestWaitingAt ? waited(pulse.leads.oldestWaitingAt).tone : null;
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
                        {n > 0 && <span className={cx('flex-none rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white', cold === 'cold' ? 'bg-[#D92D20]' : cold === 'late' ? 'bg-[#DC6803]' : 'bg-[var(--cc-accent)]')}>{n}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
          <div className="flex-none border-t border-white/10 px-4 py-3">
            <button onClick={() => ask()} className="w-full flex items-center gap-2 rounded-lg bg-white/[0.07] px-3 py-2.5 text-left text-[13px] font-semibold text-white hover:bg-white/[0.12] transition">
              <span className="text-[var(--cc-accent)]"><Icon name="operator" /></span>
              Ask the Operator
            </button>
            {/* Who is at the desk. One office screen serves three people, so the
                name is one tap to change. Sarah looking as the client is never
                offered a client's name to sign with. */}
            {session && !session.preview && session.people.length > 0 && (
              <div className="relative mt-2">
                <button onClick={() => setDeskOpen((v) => !v)} aria-haspopup="menu" aria-expanded={deskOpen} className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-[12.5px] text-white/75 hover:border-white/25 hover:text-white">
                  <span className="min-w-0 truncate">{session.who ? `${session.who.name} at the desk` : 'Who is at the desk?'}</span>
                  <svg width="10" height="10" viewBox="0 0 20 20" aria-hidden className="flex-none"><path d="m5 12 5-5 5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                {deskOpen && (
                  <div role="menu" className="absolute bottom-full left-0 right-0 z-10 mb-1 rounded-xl border border-white/10 bg-[#1A1F29] p-1 shadow-[0_-12px_32px_-12px_rgba(0,0,0,.6)]">
                    {session.people.map((p) => (
                      <button key={p.key} role="menuitem" onClick={() => sitDown(p.key)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/[0.07] hover:text-white">
                        {p.name}
                        {session.who?.key === p.key && <span className="text-[var(--cc-accent)]"><Icon name="check" size={14} /></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
          <header className="sticky top-0 z-20 flex-none print:hidden border-b border-[var(--cc-line)] bg-[var(--cc-paper)]/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-[22px] leading-tight truncate">{current.title}</h1>
                <p className="hidden sm:block text-[12.5px] text-[var(--cc-muted)] truncate">{current.blurb}</p>
              </div>
              <button
                onClick={() => setTrayOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-[var(--cc-line)] bg-white px-3 py-2 text-[13px] font-semibold text-[var(--cc-ink)] hover:border-[var(--cc-accent)] hover:text-[var(--cc-accent)]"
                title="A photo of a napkin, a screenshot, a spreadsheet. It gets read and you check it before anything is saved."
              >
                <Icon name="tray" size={16} />
                <span className="hidden sm:inline">Drop anything</span>
              </button>
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-lg border border-[var(--cc-line)] bg-white px-3 py-2 text-[13px] text-[var(--cc-muted)] hover:border-[var(--cc-ink)]"
              >
                <Icon name="search" size={16} />
                Search or jump
                <span className="ml-1 rounded border border-[var(--cc-line)] px-1.5 py-0.5 font-mono text-[10px]">⌘K</span>
              </button>
              {/* No Operator button up here any more: it is the bar along the
                  bottom of every room on a desk, and a tab under the thumb on
                  a phone. */}
              {session?.who && <Who name={session.who.name} size="md" />}
            </div>
            {session?.preview && (
              <div className="px-4 sm:px-6 pb-2">
                <Badge tone="warn">Looking as {session.email}. Everything you do here is real.</Badge>
              </div>
            )}
          </header>

          <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6">
            <div className="mx-auto w-full max-w-[1320px]" key={session?.who?.key ?? 'desk'}>
              {/* Asked once, on a session that does not know its person yet.
                  Without a name, notes are signed with the business. */}
              {session && !session.preview && !session.who && session.people.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-[var(--cc-line)] bg-white px-5 py-4">
                  <div className="min-w-0 flex-1 basis-[240px]">
                    <p className="text-[14.5px] font-semibold">Who is at the desk?</p>
                    <p className="text-[13px] text-[var(--cc-muted)]">So your notes carry your name, and a lead can be yours.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {session.people.map((p) => (
                      <Button key={p.key} onClick={() => sitDown(p.key)}>{p.name}</Button>
                    ))}
                  </div>
                </div>
              )}
              {!session ? (
                <div className="space-y-3">
                  <div className="h-24 rounded-xl bg-[#EEF0F3] animate-pulse" />
                  <div className="h-64 rounded-xl bg-[#EEF0F3] animate-pulse" />
                </div>
              ) : allowed === 'overview' ? (
                <Overview session={session} pulse={pulse} go={(k) => go(k as ModuleKey)} refreshPulse={loadPulse} ask={ask} />
              ) : allowed === 'week' ? (
                <Week session={session} go={(k) => go(k as ModuleKey)} />
              ) : allowed === 'jobs' ? (
                <Jobs session={session} />
              ) : allowed === 'field' ? (
                <Field />
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
                <Marketing session={session} refreshPulse={loadPulse} />
              ) : allowed === 'website' ? (
                <Website session={session} />
              ) : allowed === 'campaigns' ? (
                <Campaigns />
              ) : allowed === 'traffic' ? (
                <Traffic />
              ) : allowed === 'domains' ? (
                <Domains />
              ) : (
                <Accounts session={session} />
              )}
            </div>
          </main>

          {/* THE OPERATOR, IN THE ROOM. On a desk it is a line along the bottom
              of every room: type, press enter, and the drawer opens already
              working. It offers nothing and does nothing until a person
              types. */}
          {session && (
            <div className="sticky bottom-0 z-20 hidden lg:block flex-none border-t border-[var(--cc-line)] bg-[var(--cc-paper)]/90 backdrop-blur print:hidden">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = askText.trim();
                  if (!text) return ask();
                  setAskText('');
                  ask(text, true);
                }}
                className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-6 py-3"
              >
                <span className="flex-none text-[var(--cc-accent)]"><Icon name="operator" /></span>
                <input
                  value={askText}
                  onChange={(e) => setAskText(e.target.value)}
                  placeholder={pulse?.leads.waiting ? 'Ask the Operator. "Who is waiting, and what do we know about them?"' : 'Ask the Operator. "What came in this week?"'}
                  aria-label="Ask the Operator"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--cc-ink)] placeholder:text-[#98a2b3] outline-none"
                />
                <Button type="submit" kind={askText.trim() ? 'primary' : 'quiet'}>{askText.trim() ? 'Ask' : 'Open'}</Button>
              </form>
            </div>
          )}

          <footer className="flex-none px-4 sm:px-6 py-4 max-lg:pb-[calc(1rem+64px+env(safe-area-inset-bottom))] text-[11px] text-[var(--cc-muted)] border-t border-[var(--cc-line)] print:hidden">
            {brand?.business} Command Center. Built and run by{' '}
            <a href="https://modernmustardseed.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#F5B700] hover:underline">
              Modern Mustard Seed
            </a>
            .
          </footer>
        </div>
      </div>

      {/* THE THUMB BAR. Half of this gets read one handed in a truck, so the
          four places that matter sit under a thumb and the rest is one tap
          behind More. */}
      {session && (
        <nav aria-label="Rooms" className="fixed inset-x-0 bottom-0 z-30 lg:hidden border-t border-[var(--cc-line)] bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] print:hidden">
          <div className="mx-auto grid max-w-[560px] grid-cols-5">
            {(
              [
                { key: 'overview', label: 'Now', icon: 'overview' },
                { key: 'leads', label: 'Leads', icon: 'leads' },
                { key: 'operator', label: 'Operator', icon: 'operator' },
                { key: 'week', label: 'Week', icon: 'week' },
                { key: 'more', label: 'More', icon: 'more' },
              ] as Array<{ key: string; label: string; icon: IconName }>
            ).map((t) => {
              const on = t.key === allowed;
              const n = t.key === 'leads' ? badge('leads') : 0;
              const tone = n && pulse?.leads.oldestWaitingAt ? waited(pulse.leads.oldestWaitingAt).tone : null;
              return (
                <button
                  key={t.key}
                  onClick={() => (t.key === 'operator' ? ask() : t.key === 'more' ? setRailOpen(true) : go(t.key as ModuleKey))}
                  aria-current={on ? 'page' : undefined}
                  className={cx('relative flex h-[60px] flex-col items-center justify-center gap-1 text-[10.5px] font-semibold', on ? 'text-[var(--cc-accent)]' : 'text-[var(--cc-muted)]')}
                >
                  {on && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-[var(--cc-accent)]" aria-hidden />}
                  <span className="relative">
                    <Icon name={t.icon} size={21} />
                    {n > 0 && <span className={cx('absolute -right-2.5 -top-1.5 min-w-[16px] rounded-full px-1 text-center text-[9.5px] font-bold leading-[16px] tabular-nums text-white', tone === 'cold' ? 'bg-[#D92D20]' : tone === 'late' ? 'bg-[#DC6803]' : 'bg-[var(--cc-accent)]')}>{n}</span>}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <Palette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        modules={visible.map((m) => ({ key: m.key, label: m.label, blurb: m.blurb }))}
        go={(k) => go(k as ModuleKey)}
        onOperator={() => {
          setPaletteOpen(false);
          ask();
        }}
        onPerson={setPerson}
      />
      <Person who={person} onClose={() => setPerson(null)} go={(k) => go(k as ModuleKey)} />
      <Tray open={trayOpen} onClose={() => setTrayOpen(false)} onFiled={loadPulse} />
      <Operator open={operatorOpen} onClose={() => setOperatorOpen(false)} seed={seed} session={session} go={(k) => go(k as ModuleKey)} onDidAct={loadPulse} />
    </div>
  );
}
