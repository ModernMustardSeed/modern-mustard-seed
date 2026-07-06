import OutboundLeads from '@/components/admin/outbound/OutboundLeads';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Outbound Leads', noindex: true });
export const dynamic = 'force-dynamic';

export default function OutboundLeadsPage() {
  return <OutboundLeads />;
}
