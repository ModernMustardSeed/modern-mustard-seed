import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { buildMetadata } from '@/lib/seo';
import AdminHeader from '@/components/admin/AdminHeader';
import BuildMintForm from '@/components/build/BuildMintForm';

export const metadata = buildMetadata({ title: 'Team Build', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The team mint surface ("Build for a business you know"): same shared mint
 * as the partner build, origin 'rep'. Attribution rides the minter's own
 * partner identity; the lead lands on the dial floor pre-armed with the
 * "I already built it" pitch.
 */
export default async function AdminBuildPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="hq" title="Team Build" />
      <main className="max-w-3xl mx-auto px-5 md:px-6 py-8">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold">Build for a business you know</span>
        <h1 className="font-display text-3xl md:text-4xl font-bold mt-2 leading-tight">
          Walk in with it already built.
        </h1>
        <p className="font-body text-[#3A3733] mt-3 max-w-xl">
          Mint the full suite for a business you know personally or want to open cold: voice, website, command center, hub. The lead lands on the dial floor prebuilt, and the pitch becomes &quot;I already built it, here is the link.&quot;
        </p>
        <div className="mt-8">
          <BuildMintForm endpoint="/api/admin/hq/build" variant="admin" />
        </div>
      </main>
    </div>
  );
}
