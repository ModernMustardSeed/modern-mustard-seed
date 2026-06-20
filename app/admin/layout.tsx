import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import MustardHelp from '@/components/admin/MustardHelp';

export const metadata: Metadata = buildMetadata({
  title: 'Admin',
  noindex: true,
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MustardHelp />
    </>
  );
}
