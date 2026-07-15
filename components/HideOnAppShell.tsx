'use client';

import { usePathname } from 'next/navigation';

/** Hides marketing chrome (footer, etc.) on app shells that have their own
 *  layout: admin, the client portal, program HQs, and every forged demo
 *  surface. A forged demo is a one-offer sales page; the marketing footer sold
 *  competing offers (a FREE receptionist demo) directly under a paid ask. Note
 *  the voice demo still lives at the legacy /sidekick/demo/ path. */
export default function HideOnAppShell({ children }: { children: React.ReactNode }) {
  const p = usePathname() || '/';
  if (
    p.startsWith('/admin') ||
    p.startsWith('/portal') ||
    p.endsWith('/hq') ||
    p.startsWith('/demo/') ||
    p.startsWith('/hatchery/') ||
    p.startsWith('/sidekick/demo/')
  )
    return null;
  return <>{children}</>;
}
