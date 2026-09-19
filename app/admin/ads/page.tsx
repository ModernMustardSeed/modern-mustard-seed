import AdsPlaybook from '@/components/admin/AdsPlaybook';

export default async function AdminAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string | string[] }>;
}) {
  const { campaign } = await searchParams;
  const selected = typeof campaign === 'string' ? campaign : 'default';
  return <AdsPlaybook key={selected} />;
}
