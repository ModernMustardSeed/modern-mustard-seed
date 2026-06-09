'use client';

/**
 * Cookie consent state. First-party, stored in a 1-year cookie. Non-essential
 * trackers (GA4, Google Ads, Meta Pixel) only load when consent === 'granted'.
 * Essential cookies (auth/session) are exempt and always allowed.
 */
export type Consent = 'granted' | 'denied';
const KEY = 'mms_consent';

export function getConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)mms_consent=(granted|denied)/);
  return m ? (m[1] as Consent) : null;
}

export function setConsent(v: Consent): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${KEY}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.dispatchEvent(new CustomEvent('mms-consent-change', { detail: v }));
}

/** Reopen the banner (wired to a footer "Cookie preferences" link). */
export function openConsent(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('mms-consent-open'));
}
