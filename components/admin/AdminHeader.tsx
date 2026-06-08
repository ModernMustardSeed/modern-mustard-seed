'use client';

import Link from 'next/link';
import Image from 'next/image';
import HelpGuide from '@/components/HelpGuide';
import { ADMIN_HELP } from '@/lib/help-content';

/**
 * Shared admin header. One responsive bar across the command center, pipeline,
 * and partners. The marketing nav is hidden on /admin (see Navbar), so this is
 * the only chrome here. On small screens the title stacks above a scrollable
 * tab row so nothing overlaps or overflows.
 */

type Tab = 'overview' | 'pipeline' | 'partners' | 'outreach' | 'audit' | 'proposals' | 'projects' | 'reviews';
const TABS: { key: Tab; label: string; href: string }[] = [
  { key: 'overview', label: 'Overview', href: '/admin' },
  { key: 'pipeline', label: 'Pipeline', href: '/admin/leads' },
  { key: 'audit', label: 'Audit', href: '/admin/audit' },
  { key: 'proposals', label: 'Proposals', href: '/admin/proposals' },
  { key: 'projects', label: 'Projects', href: '/admin/projects' },
  { key: 'reviews', label: 'Reviews', href: '/admin/testimonials' },
  { key: 'outreach', label: 'Outreach', href: '/admin/outreach' },
  { key: 'partners', label: 'Partners', href: '/admin/partners' },
];

export default function AdminHeader({ active, title, onRefresh }: { active: Tab; title: string; onRefresh?: () => void }) {
  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  return (
    <header className="border-b border-white/[0.06] sticky top-0 z-30 bg-[#080c16]/92 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/brand/mascot.png" alt="" width={885} height={1180} className="h-8 w-auto" priority />
            <div>
              <span className="text-[9px] uppercase tracking-[0.4em] text-mustard-400 font-mono font-bold block">Modern Mustard Seed</span>
              <h1 className="font-sans text-lg font-bold text-white tracking-tight">{title}</h1>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1 -mx-1 px-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={active === t.key ? 'page' : undefined}
              className={`whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3.5 py-2 rounded-lg transition-colors ${
                active === t.key ? 'bg-mustard-500/15 text-mustard-300' : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              {t.label}
            </Link>
          ))}
          <span className="w-px h-5 bg-white/10 mx-1.5" aria-hidden />
          <HelpGuide guide={ADMIN_HELP} />
          {onRefresh && (
            <button onClick={onRefresh} className="whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3.5 py-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
              Refresh
            </button>
          )}
          <button onClick={logout} className="whitespace-nowrap text-[11px] uppercase tracking-[0.18em] font-sans font-semibold px-3.5 py-2 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-colors">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
