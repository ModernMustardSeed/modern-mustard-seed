import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import HundredfoldMember from '@/components/admin/HundredfoldMember';
import { buildMetadata } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';

export const metadata: Metadata = buildMetadata({ title: 'Hundredfold member', noindex: true });

export default async function AdminHundredfoldMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  const { id } = await params;
  return <HundredfoldMember id={id} />;
}
