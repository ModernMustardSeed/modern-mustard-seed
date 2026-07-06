import OutboundPilots from '@/components/admin/outbound/OutboundPilots';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Outbound Pilots', noindex: true });
export const dynamic = 'force-dynamic';

export default function OutboundPilotsPage() {
  return <OutboundPilots />;
}
