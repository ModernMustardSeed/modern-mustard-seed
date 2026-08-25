import OutboundBuild from '@/components/admin/outbound/OutboundBuild';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Outbound Build', noindex: true });
export const dynamic = 'force-dynamic';

export default function OutboundBuildPage() {
  return <OutboundBuild />;
}
