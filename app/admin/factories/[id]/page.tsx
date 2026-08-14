import { buildMetadata } from '@/lib/seo';
import FactoryControlCenter from '@/components/admin/factory/FactoryControlCenter';

export const metadata = buildMetadata({ title: 'Client Factory', noindex: true });

export default async function FactoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FactoryControlCenter factoryId={id} />;
}
