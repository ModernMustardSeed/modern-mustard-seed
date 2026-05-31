'use client';

import { useEffect } from 'react';

/**
 * Captures affiliate attribution. When a visitor arrives with ?ref=CODE we set
 * a first-party 60-day cookie (last touch wins) and log the click. BuyButton and
 * the build-queue path read mms_ref so the sale can be attributed server-side.
 */
export default function RefCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (!ref) return;
    const code = ref.trim().slice(0, 64);
    if (!code) return;

    // Last touch wins: overwrite with the most recent code, 60-day window.
    const sixtyDays = 60 * 24 * 60 * 60;
    document.cookie = `mms_ref=${encodeURIComponent(code)}; path=/; max-age=${sixtyDays}; samesite=lax`;

    fetch('/api/partners/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, path: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
