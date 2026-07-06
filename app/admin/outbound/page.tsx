import OutboundDashboard from '@/components/admin/outbound/OutboundDashboard';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Outbound Cockpit', noindex: true });
export const dynamic = 'force-dynamic';

export default function OutboundPage() {
  return <OutboundDashboard />;
}
