import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Client Portal',
  noindex: true,
});

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
