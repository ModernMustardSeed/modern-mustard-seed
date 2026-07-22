import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { buildMetadata } from '@/lib/seo';
import YouTubePublisher from '@/components/admin/YouTubePublisher';

export const metadata = buildMetadata({ title: 'Publish to YouTube', noindex: true });
export const dynamic = 'force-dynamic';

export default async function YouTubePublishPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin');
  return <YouTubePublisher />;
}
