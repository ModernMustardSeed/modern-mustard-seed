'use client';

import { usePathname } from 'next/navigation';

/** Hides marketing chrome (footer, etc.) on app shells that have their own
 *  layout: admin, the client portal, program HQs, and every forged demo
 *  surface. A forged demo is a one-offer sales page; the marketing footer sold
 *  competing offers (a FREE voice agent demo) directly under a paid ask. Note
 *  the voice demo still lives at the legacy /voice-agents/forge/demo/ path. */
export default function HideOnAppShell({
  children,
  alsoOn = [],
}: {
  children: React.ReactNode;
  /** Extra exact paths to hide this slot on, so one slot (the chat launcher)
   *  can stay hidden on a page where the rest of the chrome shows. */
  alsoOn?: string[];
}) {
  const p = usePathname() || '/';
  if (
    alsoOn.includes(p) ||
    p.startsWith('/admin') ||
    p.startsWith('/portal') ||
    p.endsWith('/hq') ||
    p.startsWith('/demo/') ||
    p.startsWith('/hatchery/') ||
    // The CXC and Eternal Optimist booths: no MMS footer under another house.
    p.startsWith('/sarahcxc') ||
    p.startsWith('/sarahbook') ||
    p.startsWith('/voice-agents/forge/demo/')
  )
    return null;
  return <>{children}</>;
}
