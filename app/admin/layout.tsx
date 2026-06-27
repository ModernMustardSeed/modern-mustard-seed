import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import MustardHelp from '@/components/admin/MustardHelp';
import AnnouncementBanner from '@/components/admin/AnnouncementBanner';

export const metadata: Metadata = buildMetadata({
  title: 'Admin',
  noindex: true,
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBanner />
      {children}
      <MustardHelp />
    </>
  );
}
