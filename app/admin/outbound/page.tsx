import OutboundDashboard from '@/components/admin/outbound/OutboundDashboard';
import { buildMetadata } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata = buildMetadata({ title: 'Outbound Cockpit', noindex: true });
export const dynamic = 'force-dynamic';

export default async function OutboundPage() {
  // The batch picker defaults to the signed-in rep's own leads, so a caller who
  // has never touched this browser still lands on their stack and not the floor's.
  const user = await getAdminUser();
  return <OutboundDashboard adminName={user?.name ?? ''} />;
}
