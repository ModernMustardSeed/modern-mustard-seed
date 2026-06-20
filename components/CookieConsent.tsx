'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConsent, setConsent } from '@/lib/consent';

/**
 * Cookie consent banner. Shows until the visitor decides. Defaults to denied
 * (analytics/ad trackers stay off until Accept). Reopens on the "Cookie
 * preferences" footer link. Pop-art, on-brand.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setShow(true);
    const reopen = () => setShow(true);
    window.addEventListener('mms-consent-open', reopen);
    return () => window.removeEventListener('mms-consent-open', reopen);
  }, []);

  if (!show) return null;

  const decide = (v: 'granted' | 'denied') => {
    setConsent(v);
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] p-3 sm:p-5 print:hidden">
      <div className="max-w-3xl mx-auto rounded-2xl border-[3px] border-[#161616] bg-[#FBF6EA] shadow-[6px_6px_0_0_#161616] p-5 sm:p-6">
        <div className="sm:flex sm:items-center sm:gap-6">
          <div className="flex-1 mb-4 sm:mb-0">
            <p className="font-display text-lg font-black text-[#161616] mb-1">A quick note on cookies</p>
            <p className="text-[#3a3733] font-body text-sm leading-relaxed">
              We use essential cookies to run the site. With your okay, we also use analytics and advertising cookies to understand what helps. You can change your mind anytime.{' '}
              <Link href="/privacy" className="underline font-semibold text-[#161616] hover:text-[#E0301E]">
                Privacy &amp; cookies
              </Link>
              .
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 flex-shrink-0">
            <button
              onClick={() => decide('denied')}
              className="px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] hover:-translate-y-0.5 transition-all"
            >
              Essential only
            </button>
            <button
              onClick={() => decide('granted')}
              className="px-6 py-2.5 text-[11px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
