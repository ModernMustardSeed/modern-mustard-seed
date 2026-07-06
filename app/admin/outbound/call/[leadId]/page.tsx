import OutboundCockpit from '@/components/admin/outbound/OutboundCockpit';
import { buildMetadata } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata = buildMetadata({ title: 'Call Cockpit', noindex: true });
export const dynamic = 'force-dynamic';

export default async function CallCockpitPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const user = await getAdminUser();
  return <OutboundCockpit leadId={leadId} adminName={user?.name ?? ''} />;
}
