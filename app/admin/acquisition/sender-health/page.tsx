import SenderHealth from '@/components/admin/acquisition/SenderHealth';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Sender Health', noindex: true });
export const dynamic = 'force-dynamic';

export default function SenderHealthPage() {
  return <SenderHealth />;
}
