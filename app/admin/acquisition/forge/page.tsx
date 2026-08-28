import AcqForge from '@/components/admin/acquisition/Forge';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Acquisition Forge', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionForgePage() {
  return <AcqForge />;
}
