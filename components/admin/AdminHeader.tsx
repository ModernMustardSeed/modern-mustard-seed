'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import HelpGuide from '@/components/HelpGuide';
import { ADMIN_HELP } from '@/lib/help-content';

/**
 * Shared admin header. The old 24-tab horizontal scroller became five calm
 * top-level items: Overview plus four grouped dropdowns (Sell, Market,
 * Deliver, Desk). Every page key and href is unchanged, so `active` props
 * across the command center keep working. Dropdowns open on click, close on
 * outside click, Esc, or navigation; the group holding the active page wears
 * the mustard chip, and the Inbox unread dot bubbles up to its group.
 */

type Tab = 'overview' | 'gleaner' | 'pipeline' | 'tracker' | 'outbound' | 'partners' | 'outreach' | 'campaigns' | 'texting' | 'ads' | 'audit' | 'call' | 'script' | 'callers' | 'training' | 'proposals' | 'projects' | 'builds' | 'approvals' | 'reviews' | 'calendar' | 'onboarding' | 'manual' | 'inbox';

type Item = { key: Tab; label: string; href: string };

const OVERVIEW: Item = { key: 'overview', label: 'Overview', href: '/admin' };

const GROUPS: { name: string; items: Item[] }[] = [
  {
    name: 'Sell',
    items: [
      { key: 'pipeline', label: 'Pipeline', href: '/admin/leads' },
      { key: 'tracker', label: 'Tracker', href: '/admin/prospects' },
      { key: 'outbound', label: 'Outbound', href: '/admin/outbound' },
      { key: 'callers', label: 'Callers', href: '/admin/callers' },
      { key: 'call', label: 'Intake Call', href: '/admin/intake-call' },
      { key: 'script', label: 'Call Script', href: '/admin/call-script' },
      { key: 'training', label: 'Sales Training', href: '/admin/sales-training' },
      { key: 'audit', label: 'Audit Desk', href: '/admin/audit' },
    ],
  },
  {
    name: 'Market',
    items: [
      { key: 'ads', label: 'Ads Playbook', href: '/admin/ads' },
      { key: 'campaigns', label: 'Campaigns', href: '/admin/campaigns' },
      { key: 'outreach', label: 'Outreach', href: '/admin/outreach' },
      { key: 'texting', label: 'Texting', href: '/admin/texting' },
      { key: 'gleaner', label: 'Gleaner', href: '/admin/gleaner' },
    ],
  },
  {
    name: 'Deliver',
    items: [
      { key: 'proposals', label: 'Proposals', href: '/admin/proposals' },
      { key: 'projects', label: 'Projects', href: '/admin/projects' },
      { key: 'builds', label: 'Builds', href: '/admin/builds' },
      { key: 'onboarding', label: 'Onboarding', href: '/admin/onboarding' },
      { key: 'reviews', label: 'Reviews', href: '/admin/testimonials' },
      { key: 'partners', label: 'Partners', href: '/admin/partners' },
    ],
  },
  {
    name: 'Desk',
    items: [
      { key: 'inbox', label: 'Inbox', href: '/admin/inbox' },
      { key: 'calendar', label: 'Calendar', href: '/admin/calendar' },
      { key: 'approvals', label: 'Approvals', href: '/admin/approvals' },
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
    `whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3.5 py-2 rounded-lg border-2 transition-colors ${
      isActive
        ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
        : 'border-transparent text-[#161616]/55 hover:text-[#161616] hover:bg-[#161616]/[0.05]'
    }`;
  const actionCls = 'whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3.5 py-2 rounded-lg border-2 border-transparent text-[#161616]/55 hover:text-[#161616] hover:bg-[#161616]/[0.05] transition-colors';

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
            <Link
              href={OVERVIEW.href}
              aria-current={active === 'overview' ? 'page' : undefined}
              onClick={() => setOpenGroup(null)}
              className={chipCls(active === 'overview')}
            >
              {OVERVIEW.label}
            </Link>

            {GROUPS.map((group) => {
              const holdsActive = group.items.some((i) => i.key === active);
              const isOpen = openGroup === group.name;
              const showDot = group.name === 'Desk' && unread > 0;
              return (
                <div key={group.name} className="relative">
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
                      className="absolute right-0 md:right-auto md:left-0 top-[calc(100%+6px)] z-40 min-w-[13rem] rounded-xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] py-2"
                    >
                      {group.items.map((item) => (
                        <Link
                          key={item.key}
                          href={item.href}
                          role="menuitem"
                          aria-current={active === item.key ? 'page' : undefined}
                          onClick={() => setOpenGroup(null)}
                          className={`flex items-center justify-between gap-3 px-4 py-2 text-[12px] uppercase tracking-[0.14em] font-sans font-semibold transition-colors ${
                            active === item.key ? 'text-[#161616] bg-[#F5B700]/60' : 'text-[#161616]/70 hover:text-[#161616] hover:bg-[#FBF6EA]'
                          }`}
                        >
                          {item.label}
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
