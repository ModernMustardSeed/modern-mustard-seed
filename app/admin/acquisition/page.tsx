import CommandCenter from '@/components/admin/acquisition/CommandCenter';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Acquisition Command Center', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionPage() {
  return <CommandCenter />;
}
