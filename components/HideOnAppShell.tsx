'use client';

import { usePathname } from 'next/navigation';

/** Hides marketing chrome (footer, etc.) on app shells that have their own
 *  layout: admin, the client portal, and program HQs. */
export default function HideOnAppShell({ children }: { children: React.ReactNode }) {
  const p = usePathname() || '/';
  if (p.startsWith('/admin') || p.startsWith('/portal') || p.endsWith('/hq')) return null;
  return <>{children}</>;
}
