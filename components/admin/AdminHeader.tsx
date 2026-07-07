'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import HelpGuide from '@/components/HelpGuide';
import { ADMIN_HELP } from '@/lib/help-content';

/**
 * Shared admin header. One responsive bar across the command center. The tab row
 * can hold more tabs than fit, so it is a real horizontal scroller that works
 * without a touchscreen: clickable left/right arrows, mouse-wheel scrolling, and
 * arrow-key support when focused. Help/Refresh/Sign out are pinned so they are
 * always reachable no matter where the tabs are scrolled.
 */

type Tab = 'overview' | 'gleaner' | 'pipeline' | 'tracker' | 'outbound' | 'partners' | 'outreach' | 'campaigns' | 'texting' | 'ads' | 'audit' | 'call' | 'script' | 'callers' | 'training' | 'proposals' | 'projects' | 'builds' | 'approvals' | 'reviews' | 'calendar' | 'onboarding' | 'manual' | 'inbox';
const TABS: { key: Tab; label: string; href: string }[] = [
  { key: 'overview', label: 'Overview', href: '/admin' },
  { key: 'gleaner', label: 'Gleaner', href: '/admin/gleaner' },
  { key: 'inbox', label: 'Inbox', href: '/admin/inbox' },
  { key: 'calendar', label: 'Calendar', href: '/admin/calendar' },
  { key: 'approvals', label: 'Approvals', href: '/admin/approvals' },
  { key: 'pipeline', label: 'Pipeline', href: '/admin/leads' },
  { key: 'campaigns', label: 'Campaigns', href: '/admin/campaigns' },
  { key: 'texting', label: 'Texting', href: '/admin/texting' },
  { key: 'ads', label: 'Ads', href: '/admin/ads' },
  { key: 'audit', label: 'Audit', href: '/admin/audit' },
  { key: 'call', label: 'Call', href: '/admin/intake-call' },
  { key: 'script', label: 'Script', href: '/admin/call-script' },
  { key: 'callers', label: 'Callers', href: '/admin/callers' },
  { key: 'training', label: 'Training', href: '/admin/sales-training' },
  { key: 'tracker', label: 'Tracker', href: '/admin/prospects' },
  { key: 'outbound', label: 'Outbound', href: '/admin/outbound' },
  { key: 'proposals', label: 'Proposals', href: '/admin/proposals' },
  { key: 'projects', label: 'Projects', href: '/admin/projects' },
  { key: 'builds', label: 'Builds', href: '/admin/builds' },
  { key: 'reviews', label: 'Reviews', href: '/admin/testimonials' },
  { key: 'outreach', label: 'Outreach', href: '/admin/outreach' },
  { key: 'partners', label: 'Partners', href: '/admin/partners' },
  { key: 'onboarding', label: 'Onboarding', href: '/admin/onboarding' },
  { key: 'manual', label: 'Manual', href: '/admin/manual' },
];

export default function AdminHeader({ active, title, onRefresh }: { active: Tab; title: string; onRefresh?: () => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [unread, setUnread] = useState(0);

  // Unread lead-reply count, for the Inbox alert dot.
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/messages?unread=1')
      .then((r) => (r.ok ? r.json() : { unread: 0 }))
      .then((j) => { if (alive) setUnread(j.unread ?? 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateArrows();
    // Bring the active tab into view so you can always see where you are.
    const act = el.querySelector('[aria-current="page"]') as HTMLElement | null;
    if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    // Mouse wheel scrolls the tabs sideways (older mice only have a vertical wheel).
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    const onScroll = () => updateArrows();
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows]);

  const nudge = (dir: number) => scrollerRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { nudge(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { nudge(-1); e.preventDefault(); }
  };

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  const hasOverflow = canLeft || canRight;
  const arrowCls = (enabled: boolean) =>
    `shrink-0 w-7 h-7 flex items-center justify-center rounded-full border-2 border-[#161616] text-[#161616] text-lg leading-none font-bold transition-all ${
      enabled ? 'bg-white hover:bg-[#F5B700] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5 cursor-pointer' : 'bg-[#161616]/5 text-[#161616]/25 border-[#161616]/20 cursor-default'
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
          {/* Tab strip: full width and swipeable on mobile, flexes on desktop.
              Arrows are desktop-only (on touch you just swipe). */}
          <div className="flex items-center gap-1.5 min-w-0 w-full md:w-auto md:flex-1 md:justify-end">
            {/* Scroll left (desktop only) */}
            {hasOverflow && (
              <button type="button" onClick={() => nudge(-1)} disabled={!canLeft} aria-label="Scroll tabs left" className={`hidden md:flex ${arrowCls(canLeft)}`}>‹</button>
            )}

            <div
              ref={scrollerRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              role="tablist"
              aria-label="Admin sections (swipe, or use the arrows and arrow keys to see more)"
              className="flex items-center gap-1 overflow-x-auto no-scrollbar min-w-0 w-full md:w-auto scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5B700] rounded-lg"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {TABS.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  aria-current={active === t.key ? 'page' : undefined}
                  className={`whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3.5 py-2 rounded-lg border-2 transition-colors ${
                    active === t.key
                      ? 'bg-[#F5B700] text-[#161616] border-[#161616] shadow-[2px_2px_0_0_#161616]'
                      : 'border-transparent text-[#161616]/55 hover:text-[#161616] hover:bg-[#161616]/[0.05]'
                  }`}
                >
                  {t.label}
                  {t.key === 'inbox' && unread > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold text-white bg-[#E0301E] rounded-full align-middle">{unread}</span>
                  )}
                </Link>
              ))}
            </div>

            {/* Scroll right (desktop only) */}
            {hasOverflow && (
              <button type="button" onClick={() => nudge(1)} disabled={!canRight} aria-label="Scroll tabs right" className={`hidden md:flex ${arrowCls(canRight)}`}>›</button>
            )}
          </div>

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
