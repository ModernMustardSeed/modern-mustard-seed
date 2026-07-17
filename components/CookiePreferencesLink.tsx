'use client';

import { openConsent } from '@/lib/consent';

/** Footer link to reopen the cookie banner. */
export default function CookiePreferencesLink() {
  return (
    <button
      onClick={openConsent}
      className="rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#161616] hover:bg-[#F5B700] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#161616] transition-all font-mono font-bold"
    >
      Cookie Preferences
    </button>
  );
}
