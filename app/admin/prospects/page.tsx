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

  return (
    <>
      <div className="bg-[#1a1815] text-[#f7f3e9] px-5 py-2.5 text-center text-sm font-sans">
        The dial floor moved to{' '}
        <a href="/admin/outbound" className="font-bold text-[#b58a2a] underline underline-offset-2">
          Outbound
        </a>
        : goals, scripts, audits, Mr. Mustard, email, and pilots in one screen. This Tracker stays for browsing the old list.
      </div>
      <LeadTracker currentEmail={user?.email ?? ''} currentName={user?.name ?? ''} bookDisplay={bookDisplay} />
    </>
  );
}
