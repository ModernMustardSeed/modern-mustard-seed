import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { resolveAdminPartner } from '@/lib/admin-partner';
import { buildMetadata, SITE } from '@/lib/seo';
import PartnerHub from '@/components/admin/PartnerHub';

export const metadata = buildMetadata({ title: 'Partner Hub', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * The team's partner tab: your code and money link, the team directory
 * (codes, links, and contact info, editable; served by /api/admin/hq/team),
 * the ready-to-post swipe kit, the playbooks, the training, and the free
 * program access every team-partner gets. All numbers are read from the live
 * tables (affiliate_clicks, commissions); each person sees their OWN money
 * here. Team-wide earnings stay on the owner-only Team board.
 */
export default async function AdminHqPage() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  const partner = await resolveAdminPartner(user);
  const sb = getSupabase();

  let clicks = 0;
  const earnings = { sales: 0, pending: 0, payable: 0, paid: 0 };
  if (sb && partner) {
    const [clicksRes, commsRes] = await Promise.all([
      sb.from('affiliate_clicks').select('id', { count: 'exact', head: true }).eq('code', partner.code),
      sb.from('commissions').select('amount_cents,status').eq('affiliate_code', partner.code),
    ]);
    clicks = clicksRes.count ?? 0;
    for (const c of commsRes.data ?? []) {
      if (c.status !== 'clawed_back') earnings.sales += 1;
      const cents = Number(c.amount_cents) || 0;
      if (c.status === 'pending') earnings.pending += cents;
      else if (c.status === 'payable') earnings.payable += cents;
      else if (c.status === 'paid') earnings.paid += cents;
    }
  }

  return (
    <PartnerHub
      firstName={(user.name || 'there').trim().split(/\s+/)[0]}
      partner={partner}
      clicks={clicks}
      earnings={earnings}
      siteUrl={SITE.url}
    />
  );
}
