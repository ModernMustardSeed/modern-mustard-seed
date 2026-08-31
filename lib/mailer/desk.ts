/**
 * What the Mailer desk shows.
 *
 * One query set, read on the server, because every number here is a count and
 * a count does not need a client fetch, a spinner, or a loading state.
 *
 * THE LIST THAT MATTERS is `warm`: businesses that got a card, typed the code,
 * looked at their own website, and have not bought. That is a person with their
 * hand up. It is the only screen in this system that is worth interrupting
 * someone's day for.
 */

import { getSupabase } from '@/lib/supabase';

export type MailerStats = {
  mailable: number;
  undeliverable: number;
  unverified: number;
  sent: number;
  failed: number;
  viewed: number;
  claimed: number;
  spentCents: number;
  byCampaign: Array<{ campaign: string; sent: number; viewed: number; claimed: number; spentCents: number }>;
};

export type WarmLead = {
  id: string;
  business_name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  mail_code: string | null;
  mail_first_view_at: string | null;
  mail_view_count: number | null;
  mail_last_sent_at: string | null;
  lead_score: number | null;
  status: string | null;
};

export type MailerDeskData = { stats: MailerStats; warm: WarmLead[] };

const EMPTY: MailerDeskData = {
  stats: { mailable: 0, undeliverable: 0, unverified: 0, sent: 0, failed: 0, viewed: 0, claimed: 0, spentCents: 0, byCampaign: [] },
  warm: [],
};

export async function getMailerDeskData(): Promise<MailerDeskData> {
  const supabase = getSupabase();
  if (!supabase) return EMPTY;

  const head = { count: 'exact' as const, head: true };
  const [mailableRes, undeliverableRes, unverifiedRes, viewedRes, claimedRes] = await Promise.all([
    supabase.from('outbound_leads').select('id', head).eq('mail_address_status', 'mailable'),
    supabase.from('outbound_leads').select('id', head).eq('mail_address_status', 'undeliverable'),
    supabase.from('outbound_leads').select('id', head).is('mail_address_status', null).not('address', 'is', null),
    supabase.from('outbound_leads').select('id', head).not('mail_first_view_at', 'is', null),
    supabase.from('demo_orders').select('id', head).not('mail_code', 'is', null).in('status', ['paid', 'intake_done', 'delivered']),
  ]);
  const mailable = mailableRes.count ?? 0;
  const undeliverable = undeliverableRes.count ?? 0;
  const unverified = unverifiedRes.count ?? 0;
  const viewed = viewedRes.count ?? 0;
  const claimed = claimedRes.count ?? 0;

  // Pieces are few enough to read whole, and reading them whole is the only way
  // to break the numbers down per campaign without five more round trips.
  const { data: pieces } = await supabase
    .from('mail_pieces')
    .select('campaign,status,cost_cents,mail_code')
    .limit(50000);

  const rows = pieces ?? [];
  const sent = rows.filter((p) => p.status === 'sent' || p.status === 'delivered').length;
  const failed = rows.filter((p) => p.status === 'failed').length;
  const spentCents = rows.reduce((s, p) => s + (p.cost_cents ?? 0), 0);

  const { data: viewedCodes } = await supabase
    .from('outbound_leads')
    .select('mail_code')
    .not('mail_first_view_at', 'is', null)
    .limit(50000);
  const viewedSet = new Set((viewedCodes ?? []).map((r) => r.mail_code).filter(Boolean));

  const { data: claimedCodes } = await supabase
    .from('demo_orders')
    .select('mail_code')
    .not('mail_code', 'is', null)
    .in('status', ['paid', 'intake_done', 'delivered'])
    .limit(50000);
  const claimedSet = new Set((claimedCodes ?? []).map((r) => r.mail_code).filter(Boolean));

  const byCampaignMap = new Map<string, { campaign: string; sent: number; viewed: number; claimed: number; spentCents: number }>();
  for (const p of rows) {
    const entry = byCampaignMap.get(p.campaign) ?? { campaign: p.campaign, sent: 0, viewed: 0, claimed: 0, spentCents: 0 };
    if (p.status === 'sent' || p.status === 'delivered') entry.sent++;
    if (viewedSet.has(p.mail_code)) entry.viewed++;
    if (claimedSet.has(p.mail_code)) entry.claimed++;
    entry.spentCents += p.cost_cents ?? 0;
    byCampaignMap.set(p.campaign, entry);
  }

  // Hand up, no card on file. Newest first, because a card that was opened this
  // morning is a different conversation from one opened three weeks ago.
  const { data: warm } = await supabase
    .from('outbound_leads')
    .select('id,business_name,city,state,phone,mail_code,mail_first_view_at,mail_view_count,mail_last_sent_at,lead_score,status')
    .not('mail_first_view_at', 'is', null)
    .not('status', 'in', '(won,client,dnc,lost)')
    .order('mail_first_view_at', { ascending: false })
    .limit(200);

  return {
    stats: {
      mailable,
      undeliverable,
      unverified,
      sent,
      failed,
      viewed,
      claimed,
      spentCents,
      byCampaign: [...byCampaignMap.values()].sort((a, b) => b.sent - a.sent),
    },
    warm: ((warm ?? []) as WarmLead[]).filter((l) => !claimedSet.has(l.mail_code)),
  };
}
