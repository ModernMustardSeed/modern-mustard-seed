import SalesTraining from '@/components/admin/SalesTraining';
import { buildMetadata, SITE } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';

export const metadata = buildMetadata({ title: 'Sales Training', noindex: true });
export const dynamic = 'force-dynamic';

export default async function SalesTrainingPage() {
  const user = await getAdminUser();
  const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // If this admin is also a partner, personalize the scripts with their link.
  let bookDisplay = `${siteDisplay}/book`;
  if (user?.email) {
    const aff = await getAffiliateByEmail(user.email);
    if (aff?.status === 'approved' && aff.code) bookDisplay = `${siteDisplay}/book?ref=${aff.code}`;
  }

  return <SalesTraining bookDisplay={bookDisplay} />;
}
