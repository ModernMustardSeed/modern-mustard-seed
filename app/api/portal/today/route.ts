import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { projectForEmail } from '@/lib/client-leads';
import { daysUntil } from '@/lib/domains';
import { buildertrendStatus } from '@/lib/buildertrend';
import { mailStatus } from '@/lib/mail-desk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHAT MATTERS TODAY, computed, never guessed. The brief at the top of the
 * Command Center is a list of true sentences drawn from the tables, in the
 * order a person should act on them: people waiting first, then money-shaped
 * things (a domain about to lapse), then what is going out, then what is
 * still to set up. No model writes this; a model would be tempted to be
 * encouraging, and this is not the place.
 */
export type TodayItem = { kind: 'leads' | 'mail' | 'domains' | 'posts' | 'chat' | 'setup' | 'scans' | 'quiet'; text: string; weight: number };

export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  const project = projectForEmail(session.email);
  if (!sb || !project) return NextResponse.json({ today: null });
  const email = session.email;
  const items: TodayItem[] = [];
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' });

  const [waiting, newLeads, mailNeed, domains, posts, visits, bt, mail] = await Promise.all([
    sb.from('client_leads').select('name, town, priority, created_at').eq('client_email', email).is('handled_at', null).order('priority', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(5),
    sb.from('client_leads').select('id', { count: 'exact', head: true }).eq('client_email', email).gte('created_at', dayAgo),
    sb.from('client_mail').select('id, from_name, from_addr, subject').eq('client_email', email).eq('status', 'new').eq('needs_reply', true).order('received_at', { ascending: false }).limit(5),
    sb.from('client_domains').select('domain, expires_on, status').eq('client_email', email),
    sb.from('posting_posts').select('id, scheduled_for, status, headline').eq('client_email', email).eq('scheduled_for', todayIso),
    sb.from('client_visits').select('campaign_code').eq('client_email', email).gte('created_at', weekAgo),
    buildertrendStatus(sb, email),
    mailStatus(sb, email),
  ]);

  const w = waiting.data ?? [];
  if (w.length) {
    const first = w[0];
    const who = `${first.name ?? 'someone'}${first.town ? ` in ${first.town}` : ''}`;
    items.push({ kind: 'leads', weight: 100 + w.length, text: w.length === 1 ? `One lead is waiting on a call: ${who}.` : `${w.length} leads are waiting on a call. First up: ${who}${first.priority ? `, priority ${first.priority}` : ''}.` });
  }
  if ((newLeads.count ?? 0) > 0) items.push({ kind: 'leads', weight: 90, text: `${newLeads.count} new ${newLeads.count === 1 ? 'lead' : 'leads'} came in through the website in the last 24 hours.` });

  const mn = mailNeed.data ?? [];
  if (mn.length) items.push({ kind: 'mail', weight: 80 + mn.length, text: mn.length === 1 ? `One email needs your reply: ${mn[0].from_name ?? mn[0].from_addr}, "${mn[0].subject}". A draft is ready.` : `${mn.length} emails need your reply. Drafts are ready for each.` });

  const dueSoon = (domains.data ?? []).map((d) => ({ ...d, days: daysUntil(d.expires_on as string | null) })).filter((d) => d.status === 'active' && d.days != null && d.days <= 45).sort((a, b) => a.days! - b.days!);
  if (dueSoon.length) items.push({ kind: 'domains', weight: 70, text: dueSoon.length === 1 ? `${dueSoon[0].domain} renews in ${dueSoon[0].days} days. We are handling it.` : `${dueSoon.length} domains renew inside 45 days, the first in ${dueSoon[0].days} days. We are handling them.` });

  const p = posts.data ?? [];
  if (p.length) {
    const out = p.filter((x) => x.status === 'published').length;
    items.push({ kind: 'posts', weight: 60, text: out === p.length ? `Today's post went out: "${p[0].headline ?? 'your post'}".` : `Today's post goes out on schedule: "${p[0].headline ?? 'your post'}".` });
  }

  const scans = (visits.data ?? []).length;
  if (scans) {
    const by = new Map<string, number>();
    for (const v of visits.data ?? []) by.set(v.campaign_code as string, (by.get(v.campaign_code as string) ?? 0) + 1);
    const top = [...by.entries()].sort((a, b) => b[1] - a[1])[0];
    items.push({ kind: 'scans', weight: 50, text: `${scans} QR ${scans === 1 ? 'scan' : 'scans'} this week. Most from "${top[0]}".` });
  }

  const setup: string[] = [];
  if (project.crm === 'buildertrend' && !bt.connected) setup.push('paste your Buildertrend form so leads land in your pipeline');
  if (!mail.connected) setup.push('connect your mailbox so email gets sorted with replies drafted');
  if (setup.length) items.push({ kind: 'setup', weight: 10, text: `Two minutes each, once: ${setup.join('; ')}.` });

  if (!items.length) items.push({ kind: 'quiet', weight: 0, text: 'Nothing is waiting on you. The website, the posting and the domains are running.' });
  items.sort((a, b) => b.weight - a.weight);
  return NextResponse.json({ today: { business: project.business, date: new Date().toLocaleDateString('en-US', { timeZone: 'America/Denver', weekday: 'long', month: 'long', day: 'numeric' }), items } });
}
