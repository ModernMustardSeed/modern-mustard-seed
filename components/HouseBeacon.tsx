'use client';

import { useEffect } from 'react';
import { WL_HOST_PATH } from '@/data/white-label-hosts';
import { usePathname } from 'next/navigation';

/**
 * OUR OWN VISITS, for the house Command Center's Traffic room.
 *
 * The same first-party beacon every client site posts to /api/prep-visit:
 * one text/plain POST per page, no cookie, no third-party host, and the
 * address is kept only as a salted day hash on the server. Robots and server
 * farms are dropped when Traffic reads, not here.
 *
 * App surfaces are not our website: the admin, the portal, the Command
 * Center, built demos and the other houses' booths send nothing.
 */
const SKIP = /^\/(admin|portal|cc|office|demo|hatchery|sarahcxc|sarahbook|api|voice-agents\/build\/demo|white-label\/(demo|sheet|hq))(\/|$)/;

// A client-side move keeps the landing page's document.referrer forever, which
// would credit every later page to Google. After the first page the referrer is
// the page before, our own host, which Traffic already reads as "inside".
let previous: string | null = null;

export default function HouseBeacon() {
  const path = usePathname() || '/';
  useEffect(() => {
    const ref = previous ?? document.referrer ?? '';
    previous = window.location.href;
    if (SKIP.test(path) || WL_HOST_PATH.test(path) || path.endsWith('/hq')) return;
    const body = JSON.stringify({ project: 'mms', surface: 'site', path, ref });
    try {
      const sent = navigator.sendBeacon?.('/api/prep-visit', new Blob([body], { type: 'text/plain' }));
      if (!sent) void fetch('/api/prep-visit', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    } catch {
      /* a visit not counted is better than a page that throws */
    }
  }, [path]);
  return null;
}
