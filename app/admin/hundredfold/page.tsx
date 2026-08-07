import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import HundredfoldDesk from '@/components/admin/HundredfoldDesk';
import { buildMetadata } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = buildMetadata({ title: 'Hundredfold', noindex: true });

export default async function AdminHundredfoldPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  return <HundredfoldDesk />;
}
