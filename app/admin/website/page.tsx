import AdminHeader from '@/components/admin/AdminHeader';
import WebsiteLinks from '@/components/admin/WebsiteLinks';

/** The website at a glance: every live page, share card, icon, tool and PR. */
export default function AdminWebsitePage() {
  return (
    <>
      <AdminHeader active="website" title="Website" />
      <main className="max-w-4xl mx-auto px-5 md:px-6 py-8">
        <div className="mb-6">
          <h1 className="font-sans font-bold text-[32px] tracking-[-0.04em] text-[#141210]">The website, at a glance</h1>
          <p className="font-sans text-[15px] text-[#4a4339] mt-2 max-w-2xl">
            Every page, share card, icon and tool from the studio edition, with a copy button on each. The list lives in
            data/site-links.ts.
          </p>
        </div>
        <WebsiteLinks />
      </main>
    </>
  );
}
