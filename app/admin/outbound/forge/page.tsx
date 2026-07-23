import OutboundForge from '@/components/admin/outbound/OutboundForge';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Outbound Forge', noindex: true });
export const dynamic = 'force-dynamic';

export default function OutboundForgePage() {
  return <OutboundForge />;
}
