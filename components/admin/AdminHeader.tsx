'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import HelpGuide from '@/components/HelpGuide';
import { ADMIN_HELP } from '@/lib/help-content';
import { openWelcomeTour } from '@/components/admin/WelcomeTour';

/**
 * Shared admin header. The daily drivers are pinned as top-level chips
 * (Overview, Outbound, Pipeline, Partner Hub) and everything else lives in
 * three grouped dropdowns (Clients, Marketing, Desk). Every page key keeps
 * working; keys with no nav home (tracker, script, training) belong to pages
 * that are reachable from elsewhere (the Tracker archive, the Partner Hub's
 * Learn section) and simply light no chip. Dropdowns open on click, close on
 * outside click, Esc, or navigation; the group holding the active page wears
 * the mustard chip, and the Inbox unread dot bubbles up to its group.
 */

type Tab = 'overview' | 'hq' | 'portfolio' | 'gleaner' | 'pipeline' | 'tracker' | 'outbound' | 'partners' | 'team' | 'outreach' | 'campaigns' | 'texting' | 'ads' | 'audit' | 'call' | 'script' | 'callers' | 'training' | 'proposals' | 'projects' | 'builds' | 'build-log' | 'delivery' | 'intakes' | 'approvals' | 'reviews' | 'calendar' | 'onboarding' | 'manual' | 'inbox';

// `external: true` marks a public-facing offer page that opens in a new tab, so
// clicking it from the admin never loses the team member's place. These items
// never light an active chip (they are not admin routes), so their keys sit
// outside the Tab union.
type Item = { key: Tab | string; label: string; href: string; external?: boolean };

const PINNED: Item[] = [
  { key: 'overview', label: 'Overview', href: '/admin' },
  { key: 'outbound', label: 'Outbound', href: '/admin/outbound' },
  { key: 'pipeline', label: 'Pipeline', href: '/admin/leads' },
  { key: 'hq', label: 'Partner Hub', href: '/admin/hq' },
];

// Every live customer-facing offer, one launcher. Ordered flagship-first so the
// team can open, share, or demo any program in a click. All open in a new tab.
const PROGRAMS: Item[] = [
  { key: 'p-demos', label: 'Demos', href: '/demos', external: true },
  { key: 'p-sidekick', label: 'Sidekick', href: '/sidekick', external: true },
  { key: 'p-chief', label: 'The Chief', href: '/chief', external: true },
  { key: 'p-mode', label: 'Mustard Mode', href: '/mustard-mode', external: true },
  { key: 'p-launch', label: 'Mustard Launch', href: '/mustard-launch', external: true },
  { key: 'p-pictures', label: 'Mustard Pictures', href: '/pictures', external: true },
  { key: 'p-press', label: 'Mustard Press', href: '/press', external: true },
  { key: 'p-audit', label: 'Website Audit', href: '/website-audit', external: true },
  { key: 'p-spec', label: 'Idea to Spec', href: '/idea-to-spec', external: true },
  { key: 'p-terminal', label: 'The Terminal', href: '/the-terminal', external: true },
  { key: 'p-store', label: 'Store', href: '/store', external: true },
];

const GROUPS: { name: string; items: Item[] }[] = [
  { name: 'Programs', items: PROGRAMS },
  {
    name: 'Clients',
    items: [
      { key: 'delivery', label: 'Delivery', href: '/admin/delivery' },
      { key: 'projects', label: 'Projects', href: '/admin/projects' },
      { key: 'proposals', label: 'Proposals', href: '/admin/proposals' },
      { key: 'call', label: 'Intake Call', href: '/admin/intake-call' },
      { key: 'builds', label: 'Builds', href: '/admin/builds' },
      { key: 'build-log', label: 'Build Log', href: '/admin/build-log' },
      { key: 'intakes', label: 'Intakes', href: '/admin/intakes' },
      { key: 'reviews', label: 'Reviews', href: '/admin/testimonials' },
      { key: 'portfolio', label: 'My Projects', href: '/admin/portfolio' },
    ],
  },
  {
    name: 'Marketing',
    items: [
      { key: 'ads', label: 'Ads Playbook', href: '/admin/ads' },
      { key: 'youtube', label: 'Publish to YouTube', href: '/admin/youtube' },
      { key: 'campaigns', label: 'Campaigns', href: '/admin/campaigns' },
      { key: 'texting', label: 'Texting', href: '/admin/texting' },
      { key: 'gleaner', label: 'Gleaner', href: '/admin/gleaner' },
      { key: 'outreach', label: 'Outreach', href: '/admin/outreach' },
      { key: 'audit', label: 'Audit Desk', href: '/admin/audit' },
    ],
  },
  {
    name: 'Desk',
    items: [
      { key: 'inbox', label: 'Inbox', href: '/admin/inbox' },
      { key: 'calendar', label: 'Calendar', href: '/admin/calendar' },
      { key: 'approvals', label: 'Approvals', href: '/admin/approvals' },
      { key: 'team', label: 'Team', href: '/admin/team' },
      { key: 'partners', label: 'Partner Admin', href: '/admin/partners' },
      { key: 'callers', label: 'Callers', href: '/admin/callers' },
      { key: 'onboarding', label: 'Academy', href: '/admin/onboarding' },
      { key: 'manual', label: 'Manual', href: '/admin/manual' },
    ],
  },
];

export default function AdminHeader({ active, title, onRefresh }: { active: Tab; title: string; onRefresh?: () => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  // Unread lead-reply count, for the Inbox alert dot (bubbles to the Desk group).
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/messages?unread=1')
      .then((r) => (r.ok ? r.json() : { unread: 0 }))
      .then((j) => { if (alive) setUnread(j.unread ?? 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Close the open dropdown on outside click or Escape.
  useEffect(() => {
    if (!openGroup) return;
    const onDown = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGroup(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openGroup]);

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const chipCls = (isActive: boolean) =>
    `whitespace-nowrap text-[11px] uppercase tracking-[0.12em] font-sans font-semibold px-2.5 py-2 rounded-lg border-2 transition-colors ${
      isActive
        ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
        : 'border-transparent text-[#161616]/55 hover:text-[#161616] hover:bg-[#161616]/[0.05]'
    }`;
  const actionCls = 'whitespace-nowrap text-[11px] uppercase tracking-[0.12em] font-sans font-semibold px-2.5 py-2 rounded-lg border-2 border-transparent text-[#161616]/55 hover:text-[#161616] hover:bg-[#161616]/[0.05] transition-colors';

  return (
    <header className="border-b-2 border-[#161616] sticky top-0 z-30 bg-[#FBF6EA]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-8 w-auto" priority />
          <div>
            <span className="text-[9px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block">Modern Mustard Seed</span>
            <h1 className="font-sans text-lg font-bold text-[#161616] tracking-tight">{title}</h1>
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row md:items-center gap-2 md:gap-1.5 min-w-0 md:flex-1 md:justify-end">
          <nav ref={navRef} aria-label="Admin sections" className="relative flex items-center flex-wrap gap-1 w-full md:w-auto md:justify-end">
            {PINNED.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active === item.key ? 'page' : undefined}
                onClick={() => setOpenGroup(null)}
                className={chipCls(active === item.key)}
              >
                {item.label}
              </Link>
            ))}

            {GROUPS.map((group) => {
              const holdsActive = group.items.some((i) => i.key === active);
              const isOpen = openGroup === group.name;
              const showDot = group.name === 'Desk' && unread > 0;
              return (
                <div key={group.name} className="md:relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    onClick={() => setOpenGroup(isOpen ? null : group.name)}
                    className={chipCls(holdsActive)}
                  >
                    {group.name}
                    {showDot && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold text-white bg-[#E0301E] rounded-full align-middle">{unread}</span>
                    )}
                    <span aria-hidden="true" className={`ml-1 inline-block text-[9px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      // Mobile: the group wrapper is `static`, so this anchors to the
                      // full-width <nav> and drops a full-width panel that always fits
                      // the viewport (the old `right-0` grew a fixed-width menu leftward
                      // off the screen for left-positioned buttons). Desktop (md+): the
                      // wrapper is `relative`, so it drops under its own button.
                      className="absolute left-0 right-0 md:right-auto md:left-0 top-[calc(100%+6px)] z-40 md:min-w-[13rem] max-h-[70vh] overflow-y-auto rounded-xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] py-2"
                    >
                      {group.items.map((item) => (
                        <Link
                          key={item.key}
                          href={item.href}
                          role="menuitem"
                          {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          aria-current={active === item.key ? 'page' : undefined}
                          onClick={() => setOpenGroup(null)}
                          className={`flex items-center justify-between gap-3 px-4 py-2 text-[12px] uppercase tracking-[0.14em] font-sans font-semibold transition-colors ${
                            active === item.key ? 'text-[#161616] bg-[#F5B700]/60' : 'text-[#161616]/70 hover:text-[#161616] hover:bg-[#FBF6EA]'
                          }`}
                        >
                          {item.label}
                          {item.external && (
                            <span aria-hidden="true" className="text-[#161616]/35 text-[11px]">↗</span>
                          )}
                          {item.key === 'inbox' && unread > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold text-white bg-[#E0301E] rounded-full">{unread}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Pinned actions: top-right on mobile, far-right on desktop. */}
          <div className="flex items-center gap-1 shrink-0 self-end md:self-auto">
            <span className="hidden md:block w-px h-5 bg-[#161616]/15 mx-1 shrink-0" aria-hidden />
            <HelpGuide guide={ADMIN_HELP} />
            <button onClick={openWelcomeTour} className={actionCls} title="Replay the 30-second welcome tour">Replay tour</button>
            {onRefresh && (
              <button onClick={onRefresh} className={actionCls}>Refresh</button>
            )}
            <button onClick={logout} className={actionCls}>Sign out</button>
          </div>
        </div>
      </div>
    </header>
  );
}
