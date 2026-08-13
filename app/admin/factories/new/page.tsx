import { buildMetadata } from '@/lib/seo';
import FactoryForge from '@/components/admin/factory/FactoryForge';

export const metadata = buildMetadata({ title: 'Forge a Client Factory', noindex: true });

export default function NewFactoryPage() {
  return <FactoryForge />;
}
