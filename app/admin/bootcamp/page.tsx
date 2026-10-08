import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildMetadata, SITE } from '@/lib/seo';
import { hostLinks } from '@/lib/bootcamp/key';
import { hostStats, listHosts } from '@/lib/bootcamp/store';
import BootcampDesk, { type HostRow } from '@/components/admin/BootcampDesk';

export const metadata = buildMetadata({ title: 'Bootcamp', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The Bootcamp desk. Hosts load here on the server (links are signed with the
 * admin secret, so they never leave a server render); everything else the
 * desk fetches from /api/admin/bootcamp/* and refreshes on its own.
 */
export default async function BootcampAdminPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin');

  let hosts: HostRow[] = [];
  let hostsError = '';
  const sb = getSupabase();
  try {
    if (!sb) throw new Error('Supabase is not configured, so hosts cannot load.');
    const rows = await listHosts(sb);
    hosts = await Promise.all(
      rows.map(async (h) => {
        const base = {
          id: h.id,
          slug: h.slug,
          name: h.name,
          brand: h.brand ?? null,
          email: h.email,
          website: h.website ?? null,
          platforms: h.platforms ?? null,
          audience: h.audience ?? null,
          vertical: h.vertical ?? null,
          room: h.room ?? null,
          status: h.status,
          founding: Boolean(h.founding),
          clicks: Number(h.clicks ?? 0),
          notes: h.notes ?? null,
          approved_at: h.approved_at ?? null,
          created_at: h.created_at,
        };
        if (h.status === 'applied' || h.status === 'declined') return { ...base, links: null, stats: null };
        const stats = await hostStats(sb, h.slug).catch(() => null);
        return { ...base, links: hostLinks(SITE.url, h.slug), stats };
      }),
    );
  } catch (err) {
    hostsError = err instanceof Error ? err.message : 'Could not load hosts.';
  }

  return <BootcampDesk hosts={hosts} hostsError={hostsError} />;
}
