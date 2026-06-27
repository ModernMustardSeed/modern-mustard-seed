import { notFound } from 'next/navigation';
import CampaignDetail from '@/components/admin/CampaignDetail';
import { getCampaign, campaigns } from '@/data/campaigns';

export function generateStaticParams() {
  return campaigns.map((c) => ({ slug: c.slug }));
}

export default async function AdminCampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = getCampaign(slug);
  if (!campaign) notFound();
  return <CampaignDetail campaign={campaign} />;
}
