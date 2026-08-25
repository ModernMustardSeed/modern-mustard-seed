import { buildMetadata } from '@/lib/seo';
import FactoryBuild from '@/components/admin/factory/FactoryBuild';

export const metadata = buildMetadata({ title: 'Build a Client Factory', noindex: true });

export default function NewFactoryPage() {
  return <FactoryBuild />;
}
