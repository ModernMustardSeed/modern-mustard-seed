'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * "Show me mine." One field on the homepage: paste your website, and we send you
 * to the Demo Station (/demos) with it already filled in. The Demo Station is the
 * real pipeline: the build floor designs their new site and the link goes out by
 * email. Nothing here promises an instant result, because the build is not
 * instant.
 */
export default function ShowMeMine({ className }: { className: string }) {
  const router = useRouter();
  const [site, setSite] = useState('');
  const clean = site.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const ready = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(clean);

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    trackEvent('show_me_mine', { location: 'home' });
    router.push(`/demos?site=${encodeURIComponent(clean)}&utm_source=home&utm_medium=show-me-mine`);
  };

  return (
    <form onSubmit={go} className={className}>
      <label>
        <span className="sr-only">Your website</span>
        <input type="text" inputMode="url" autoComplete="url" spellCheck={false} value={site} onChange={(e) => setSite(e.target.value)} placeholder="yourbusiness.com" />
      </label>
      <button type="submit" disabled={!ready}>Show Me Mine <span aria-hidden="true">↗</span></button>
    </form>
  );
}
