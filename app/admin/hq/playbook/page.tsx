import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';
import { resolveAdminPartner } from '@/lib/admin-partner';
import OutreachPlaybook from '@/components/partners/OutreachPlaybook';

export const metadata = buildMetadata({ title: 'The Outreach Playbook', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The Outreach Playbook for the admin team, gated by the ADMIN session (the
 * public /partners/playbook stays gated by the partner portal session). Same
 * component, personalized with the teammate's own code via team_members, with
 * the back link and PDF pointed at the admin-side equivalents.
 */
export default async function AdminPlaybookPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  const partner = await resolveAdminPartner(user);
  if (!partner) {
    return (
      <div className="min-h-screen bg-[#FBF6EA] halftone-bg text-[#161616] flex items-center justify-center px-6">
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-10 max-w-md text-center">
          <h1 className="font-display text-2xl font-semibold text-[#161616] mb-3">The Outreach Playbook</h1>
          <p className="text-[#3A3733] font-body text-sm mb-6">
            No partner code is linked to your login yet. Ask Sarah to add you on the Team board, then the playbook personalizes itself for you.
          </p>
          <Link href="/admin/hq" className="inline-block px-7 py-3 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
            Back to Partner Hub
          </Link>
        </div>
      </div>
    );
  }

  const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const bookDisplay = `${siteDisplay}/book?ref=${partner.code}`;
  const bookHref = `${SITE.url.replace(/\/$/, '')}/book?ref=${partner.code}`;
  const firstName = partner.name?.split(' ')[0] || 'partner';

  return (
    <OutreachPlaybook
      code={partner.code}
      firstName={firstName}
      bookDisplay={bookDisplay}
      bookHref={bookHref}
      backHref="/admin/hq"
      backLabel="← Partner Hub"
      pdfHref="/api/admin/hq/playbook-pdf"
    />
  );
}
