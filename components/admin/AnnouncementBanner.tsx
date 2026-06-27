'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { latestAnnouncement } from '@/data/announcements';

/**
 * Team-wide notice bar pinned to the top of every admin page. Shows the latest
 * announcement until the person dismisses it on their device. Bumping the
 * announcement id re-shows it to everyone. Hidden on the login screen.
 */
export default function AnnouncementBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const a = latestAnnouncement;
  const key = a ? `mms_announce_${a.id}` : '';

  useEffect(() => {
    if (!a) return;
    try {
      setShow(localStorage.getItem(key) !== 'dismissed');
    } catch {
      setShow(true);
    }
  }, [a, key]);

  if (!a || !show) return null;
  if (pathname?.startsWith('/admin/login')) return null;

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(key, 'dismissed'); } catch {}
  };

  return (
    <div className="bg-[#161616] text-[#FBF6EA] border-b-2 border-[#161616]">
      <div className="max-w-7xl mx-auto px-5 md:px-6 py-2.5 flex items-center gap-3">
        <span className="text-lg leading-none shrink-0" aria-hidden>{a.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">
            <span className="font-sans font-bold text-[#F5B700]">{a.title}.</span>{' '}
            <span className="font-body text-[#FBF6EA]/85 hidden sm:inline">{a.body}</span>
          </p>
        </div>
        <Link
          href={a.href}
          className="shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.15em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#F5B700] rounded-lg px-3 py-1.5 hover:bg-[#FFD23F] hover:border-[#FFD23F] transition-colors"
        >
          {a.cta} →
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 text-[#FBF6EA]/50 hover:text-[#FBF6EA] text-lg leading-none px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
