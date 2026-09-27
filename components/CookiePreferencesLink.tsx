'use client';

import { openConsent } from '@/lib/consent';

/** Footer link to reopen the cookie banner. */
export default function CookiePreferencesLink() {
  return (
    <button
      onClick={openConsent}
      className="rounded-full border-2 border-[#0d0d0d] bg-white px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-[#0d0d0d] hover:bg-[#ffd400] hover:-translate-y-0.5 hover:shadow-[2px_2px_0_0_#0d0d0d] transition-all font-mono font-bold"
    >
      Cookie Preferences
    </button>
  );
}
