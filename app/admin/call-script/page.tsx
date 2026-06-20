import CallScript from '@/components/admin/CallScript';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({ title: 'Sales Call Script', noindex: true });

export default function CallScriptPage() {
  return <CallScript />;
}
