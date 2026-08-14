import ProspectDetail from '@/components/admin/acquisition/ProspectDetail';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Prospect', noindex: true });
export const dynamic = 'force-dynamic';

export default async function AcquisitionProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProspectDetail id={id} />;
}
