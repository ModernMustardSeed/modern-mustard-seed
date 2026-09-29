import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import MustardHelp from '@/components/admin/MustardHelp';
import OfficeDock from '@/components/admin/office/OfficeDock';
import HideOnFloor from '@/components/admin/office/HideOnFloor';
import MustardDeskCall from '@/components/MustardDeskCall';
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
      {/* The owner gets Sower, the chief of staff at Yield, in the corner; the
          team keeps Mr. Mustard's help bubble. One launcher per person. */}
      {user?.role === 'owner' ? <OfficeDock /> : <MustardHelp />}
      {user && (
        <HideOnFloor>
          <MustardDeskCall
            endpoint="/api/admin/desk-call"
            sublabel="Voice line, live numbers"
            positionClass="bottom-[4.75rem] right-5"
          />
        </HideOnFloor>
      )}
      {user && <WelcomeTour name={user.name} email={user.email} role={user.role} />}
    </div>
  );
}
