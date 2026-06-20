import LeadTracker from '@/components/admin/LeadTracker';
import { buildMetadata } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata = buildMetadata({ title: 'Lead Tracker', noindex: true });
export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const user = await getAdminUser();
  return <LeadTracker currentEmail={user?.email ?? ''} currentName={user?.name ?? ''} />;
}
