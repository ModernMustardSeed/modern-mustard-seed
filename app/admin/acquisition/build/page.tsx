import AcqBuild from '@/components/admin/acquisition/Build';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Acquisition Build', noindex: true });
export const dynamic = 'force-dynamic';

export default function AcquisitionBuildPage() {
  return <AcqBuild />;
}
