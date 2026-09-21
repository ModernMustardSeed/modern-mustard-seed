import type { SupabaseClient } from '@supabase/supabase-js';
import { daysUntil } from '@/lib/domains';
import { buildertrendStatus } from '@/lib/buildertrend';
import { mailStatus } from '@/lib/mail-desk';

/**
 * THE COMMAND CENTER, AS PLAIN SENTENCES, for the portal guide's context.
 * Everything here is scoped by the client's email. It is bounded on purpose:
 * the guide answers "who is waiting" and "which sign is working", it does
 * not read whole inboxes into a prompt.
 */
export async function commandCenterContext(sb: SupabaseClient, email: string): Promise<string[]> {
  const out: string[] = [];
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [waiting, month, mailNeed, domains, campaigns, visits, posts, bt, mail] = await Promise.all([
    sb.from('client_leads').select('id, name, town, priority, source, campaign, created_at, owner_name').eq('client_email', email).is('handled_at', null).order('priority', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(8),
    sb.from('client_leads').select('source, sources, campaign').eq('client_email', email).gte('created_at', monthAgo),
    sb.from('client_mail').select('from_name, from_addr, subject, summary').eq('client_email', email).eq('status', 'new').eq('needs_reply', true).order('received_at', { ascending: false }).limit(6),
    sb.from('client_domains').select('domain, role, expires_on, status').eq('client_email', email),
    sb.from('client_campaigns').select('code, label, medium, scans, leads').eq('client_email', email).is('archived_at', null),
    sb.from('client_visits').select('campaign_code').eq('client_email', email).gte('created_at', weekAgo),
    sb.from('posting_posts').select('scheduled_for, status, headline').eq('client_email', email).gte('scheduled_for', new Date().toLocaleDateString('en-CA', { timeZone: 'America/Denver' })).order('scheduled_for', { ascending: true }).limit(5),
    buildertrendStatus(sb, email),
    mailStatus(sb, email),
  ]);

  const w = waiting.data ?? [];
  // What the desk already knows about each waiting lead: how long they have
  // waited, who has it, and the last thing anyone wrote. Without this the
  // Operator starts as blind as the next person would.
  const lastTouch = new Map<string, string>();
  if (w.length) {
    const { data: ev } = await sb.from('client_lead_events').select('lead_id, kind, body, author_name, created_at').eq('client_email', email).in('lead_id', w.map((l) => l.id as string)).order('created_at', { ascending: false }).limit(60);
    for (const e of ev ?? []) {
      if (lastTouch.has(e.lead_id as string)) continue;
      const what = e.kind === 'tried' ? 'tried and got no answer' : e.kind === 'note' ? 'left a note' : e.kind === 'taken' ? 'took it' : e.kind === 'handed' ? 'handed it over' : String(e.kind);
      const on = new Date(String(e.created_at)).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric' });
      lastTouch.set(e.lead_id as string, `last touch: ${e.author_name} ${what} on ${on}${e.body ? ` ("${String(e.body).slice(0, 200)}")` : ''}`);
    }
  }
  const desk = (l: { id: unknown; created_at: unknown; owner_name: unknown }) => {
    const days = Math.floor((Date.now() - Date.parse(String(l.created_at))) / 86_400_000);
    return `, ${days >= 1 ? `waiting ${days} ${days === 1 ? 'day' : 'days'}` : 'came in today'}, ${l.owner_name ? `${l.owner_name} has it` : 'nobody has taken it'}${lastTouch.has(l.id as string) ? `, ${lastTouch.get(l.id as string)}` : ''}`;
  };
  out.push(w.length ? `Leads waiting on a call (${w.length}): ${w.map((l) => `${l.name ?? 'no name'}${desk(l)}${l.town ? `, ${l.town}` : ''}${l.priority ? `, priority ${l.priority}` : ''}${l.campaign ? `, scanned "${l.campaign}"` : ''}`).join('; ')}.` : 'No leads are waiting on a call.');
  const m = month.data ?? [];
  if (m.length) {
    const by = new Map<string, number>();
    for (const l of m) for (const s of ((l.sources as string[]) ?? []).length ? (l.sources as string[]) : [String(l.source)]) by.set(s, (by.get(s) ?? 0) + 1);
    out.push(`Leads in the last 30 days: ${m.length}. By door: ${[...by.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}.`);
  }
  const mn = mailNeed.data ?? [];
  out.push(mail.connected ? (mn.length ? `Emails needing a reply (${mn.length}), drafts ready: ${mn.map((x) => `${x.from_name ?? x.from_addr}: "${x.subject}"${x.summary ? ` (${x.summary})` : ''}`).join('; ')}.` : 'No emails need a reply right now.') : 'Their mailbox is not connected yet, so email is not sorted here.');
  const ds = (domains.data ?? []).map((d) => ({ ...d, days: daysUntil(d.expires_on as string | null) }));
  const soon = ds.filter((d) => d.days != null && d.days <= 60).sort((a, b) => a.days! - b.days!);
  out.push(`Domains: ${ds.length} owned. ${soon.length ? `Renewing soon: ${soon.map((d) => `${d.domain} in ${d.days} days`).join(', ')}.` : 'Nothing renews inside 60 days.'} Modern Mustard Seed carries every renewal.`);
  const cs = campaigns.data ?? [];
  if (cs.length) {
    const weekBy = new Map<string, number>();
    for (const v of visits.data ?? []) weekBy.set(v.campaign_code as string, (weekBy.get(v.campaign_code as string) ?? 0) + 1);
    out.push(`QR codes: ${cs.map((c) => `"${c.label}" (${c.medium}) ${c.scans} scans all time, ${weekBy.get(c.code as string) ?? 0} this week, ${c.leads} leads`).join('; ')}.`);
  } else out.push('No QR codes made yet. They can make one in the Command Center under Signs and ads.');
  const ps = posts.data ?? [];
  if (ps.length) out.push(`Next posts: ${ps.map((p) => `${p.scheduled_for} "${p.headline ?? 'untitled'}" (${p.status})`).join('; ')}.`);
  out.push(bt.connected ? `Buildertrend is connected (builder ${bt.builderId}); website leads are handed to it.` : 'Buildertrend is not connected yet; they paste their Lead Contact Form embed in the Command Center to connect it.');
  return out;
}
