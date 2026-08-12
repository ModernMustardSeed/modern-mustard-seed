'use client';

import { useState } from 'react';
import type { CelebrateAudience } from '@/data/celebrate';

export type WaitlistStatus = 'idle' | 'sending' | 'done' | 'error';

/**
 * One submit path for every Celebrate capture on the page. The countdown band
 * and the parade builder are different surfaces with different chrome, and they
 * were going to end up with two copies of the same fetch, two honeypots, and
 * two slightly different error states. This is the shared piece.
 *
 * `surface` rides along to the API so the admin can see which half of the page
 * is actually converting before launch.
 */
export function useWaitlist(surface: 'countdown' | 'parade') {
  const [email, setEmail] = useState('');
  const [business, setBusiness] = useState('');
  const [city, setCity] = useState('');
  const [audience, setAudience] = useState<CelebrateAudience>('team');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<WaitlistStatus>('idle');

  const submit = async (people: string[] = []) => {
    if (status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/celebrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, business, city, audience, people, surface, company: honeypot }),
      });
      if (!res.ok) throw new Error('bad status');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  return {
    email, setEmail,
    business, setBusiness,
    city, setCity,
    audience, setAudience,
    honeypot, setHoneypot,
    status,
    submit,
  };
}
