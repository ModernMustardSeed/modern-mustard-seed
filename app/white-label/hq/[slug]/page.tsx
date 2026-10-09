import type { Metadata } from 'next';
import Link from 'next/link';
import { agencyFromKey } from '@/lib/white-label/portal';
import { listClients } from '@/lib/white-label/store';
import { agencyLinks } from '@/lib/white-label/mail';
import { deskUrl } from '@/lib/white-label/desk';
import { wlPricesHeld } from '@/lib/white-label/key';
import { WL_GROUPS, WL_LINES, WL_PROGRAM } from '@/data/white-label';
import { wlSans, wlSerif } from '@/components/white-label/font';
import AgencyPortal from '@/components/white-label/AgencyPortal';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Agency Portal · White Label Program' },
  robots: { index: false, follow: false },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * THE AGENCY PORTAL. Opened by the signed link in the welcome email; no
 * account to forget. Everything an agency needs between meetings: its demo,
 * its price sheet, a client-ready demo link maker, every client and the
 * stage it is at, and the form that starts the next one.
 */
export default async function AgencyPortalPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Search }) {
  const { slug } = await params;
  const q = await searchParams;
  const key = Array.isArray(q.k) ? q.k[0] : q.k;
  const agency = await agencyFromKey(slug, key);

  if (!agency) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f5f2] px-5 text-neutral-900">
        <div className="max-w-md text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-neutral-500">Agency portal</p>
          <h1 className="mt-3 text-3xl font-black">This link is not active.</h1>
          <p className="mt-4 text-neutral-600">Open the portal from your welcome email. If it still does not open, write to sarah@modernmustardseed.com and a fresh link comes back the same day.</p>
          <Link href="/white-label/apply" className="mt-6 inline-block rounded-full bg-neutral-900 px-6 py-3 text-sm font-bold text-white">Apply to the program</Link>
        </div>
      </div>
    );
  }

  const clients = await listClients(agency.id);
  const links = agencyLinks(agency);
  const held = wlPricesHeld(agency.slug);
  const none = { setup: 0, monthly: 0 };
  return (
    <div className={`${wlSans.className} ${wlSerif.variable}`}>
    <AgencyPortal
      agency={{ name: agency.name, slug: agency.slug, contact: agency.contact_name, color: agency.color || '#0b3b44', founding: agency.founding, status: agency.status }}
      portalKey={key as string}
      links={{ demo: links.demo, sheet: held ? null : links.sheet }}
      clients={clients.map((c) => ({
        id: c.id,
        business: c.business,
        website: c.website,
        lines: c.lines,
        status: c.status,
        test_number: c.test_number,
        agency_approved_at: c.agency_approved_at,
        created_at: c.created_at,
        live_at: c.live_at,
        desk: c.vapi_assistant_id ? deskUrl(agency.slug, c.id) : null,
      }))}
      lines={WL_LINES.map((l) => ({ slug: l.slug, name: l.name, group: l.group, pitch: l.pitch, wholesale: held ? none : l.wholesale, retail: held ? none : l.retail, internal: l.internal }))}
      pricesHeld={held}
      groups={WL_GROUPS.map((g) => ({ key: g.key, title: g.title }))}
      foundingMonths={WL_PROGRAM.foundingMonths}
    />
    </div>
  );
}
