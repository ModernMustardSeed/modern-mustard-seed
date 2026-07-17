'use client';

import { openConsent } from '@/lib/consent';

/** Footer link to reopen the cookie banner. */
export default function CookiePreferencesLink() {
  return (
    <button
      onClick={openConsent}
      className="text-[10px] uppercase tracking-[0.15em] text-white/55 hover:text-mustard-400 transition-colors font-mono font-bold"
    >
      Cookie Preferences
    </button>
  );
}
