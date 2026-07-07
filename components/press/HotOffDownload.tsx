'use client';

/**
 * The instant-download button on /press/hot-off. Only renders a working
 * button for PIECE purchases (the pdf route verifies the session against
 * Stripe server-side; KIT/HAND PRESS sessions without a lift-able run simply
 * hide the button after a failed probe).
 */

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';

export default function HotOffDownload({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<'checking' | 'ready' | 'none'>('checking');
  const href = `/api/press/pdf?session_id=${encodeURIComponent(sessionId)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(href, { method: 'GET', headers: { Range: 'bytes=0-0' } });
        if (alive) setState(res.ok ? 'ready' : 'none');
      } catch {
        if (alive) setState('none');
      }
    })();
    return () => { alive = false; };
  }, [href]);

  if (state === 'none') return null;

  return (
    <a
      href={href}
      onClick={() => trackEvent('press_clean_download', {})}
      aria-disabled={state === 'checking'}
      className={`inline-block mt-8 rounded-full bg-[#F5B700] border-2 border-[#161616] px-10 py-4 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 ${state === 'checking' ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {state === 'checking' ? 'Checking the tray…' : 'Download your print-ready file'}
    </a>
  );
}
