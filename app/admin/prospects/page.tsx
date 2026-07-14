import LeadTracker from '@/components/admin/LeadTracker';
import { buildMetadata, SITE } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';

export const metadata = buildMetadata({ title: 'Lead Tracker', noindex: true });
export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const user = await getAdminUser();
  const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Personalize the per-lead call script with the rep's own booking link.
  let bookDisplay = `${siteDisplay}/book`;
  if (user?.email) {
    const aff = await getAffiliateByEmail(user.email);
    if (aff?.status === 'approved' && aff.code) bookDisplay = `${siteDisplay}/book?ref=${aff.code}`;
  }

  // The archive banner inside LeadTracker explains the move to Outbound.
  return <LeadTracker currentEmail={user?.email ?? ''} currentName={user?.name ?? ''} bookDisplay={bookDisplay} />;
}
