import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Client Portal',
  noindex: true,
});

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // `contents` keeps this wrapper out of layout; it only exists so the
  // legacy-ground rule in globals.css can find the portal and keep its
  // original ink ground now that the site default is cream.
  return <div className="portal-shell contents">{children}</div>;
}
