import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import MustardHelp from '@/components/admin/MustardHelp';
import AnnouncementBanner from '@/components/admin/AnnouncementBanner';
import WelcomeTour from '@/components/admin/WelcomeTour';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = buildMetadata({
  title: 'Admin',
  noindex: true,
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  return (
    <div className="admin-shell">
      <AnnouncementBanner />
      {children}
      <MustardHelp />
      {user && <WelcomeTour name={user.name} email={user.email} role={user.role} />}
    </div>
  );
}
