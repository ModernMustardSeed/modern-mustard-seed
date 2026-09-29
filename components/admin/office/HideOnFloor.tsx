'use client';

import { usePathname } from 'next/navigation';

/**
 * Keeps a floating corner control off /admin/office, where Sower's chat
 * column owns the bottom right and the composer's Send button sits there.
 */
export default function HideOnFloor({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/admin/office')) return null;
  return <>{children}</>;
}
