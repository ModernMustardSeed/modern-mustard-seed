import type { SupabaseClient } from '@supabase/supabase-js';
import type { CcAccount } from '@/lib/cc-access';
import { listConversations } from '@/lib/command-center/chats';
import { daysUntil } from '@/lib/domains';
import { escape } from '@/lib/email';
import { buildTraffic } from '@/lib/cc-traffic';

/**
 * THE WEEK. Seven days of what the website and the desk actually did, counted
 * from rows, set beside the seven days before. This is the page an owner
 * forwards to their spouse, so it has one rule above the others: every number
 * on it can be opened and counted in a room of the Command Center. Nothing is
 * projected, valued in dollars, or rounded.
 *
 * A line whose source could not be read carries value null and says so. A
 * zero is only ever printed when something was counted and came to zero.
 */

export type WeekLine = {
  key: 'visits' | 'views' | 'leads' | 'called' | 'touches' | 'chats' | 'scans' | 'asks' | 'posts' | 'mail' | 'contacts';
  label: string;
  /** Where in the Command Center these rows can be opened. */
  room: string;
  value: number | null;
  before: number | null;
  note?: string;
};

export type WeekReport = {
  business: string;
  from: string;
  to: string;
  range: string;
  headline: string;
  lines: WeekLine[];
  people: Array<{ name: string; detail: string; called: boolean }>;
  standing: Array<{ label: string; value: string }>;
};

const TZ = 'America/Denver';
const day = (ms: number) => new Date(ms).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });

export async function buildWeek(sb: SupabaseClient, account: CcAccount, opts: { marketing: boolean; mailConnected: boolean }): Promise<WeekReport> {
  const email = account.clientEmail;
  const now = Date.now();
  const startMs = now - 7 * 86_400_000;
  const prevMs = now - 14 * 86_400_000;
  const start = new Date(startMs).toISOString();
  const prev = new Date(prevMs).toISOString();

  const count = (table: string, col: string, from: string, to?: string) => {
    let q = sb.from(table).select('id', { count: 'exact', head: true }).eq('client_email', email).gte(col, from);
    if (to) q = q.lt(col, to);
    return q;
  };

  const [leadRows, leadsBefore, called, calledBefore, touches, touchesBefore, scans, scansBefore, asks, asksBefore, posts, postsBefore, mail, mailBefore, contacts, contactsCarried, contactsBefore, contactsTotal, domains, chats] = await Promise.all([
    sb.from('client_leads').select('name, town, project_type, handled_at, created_at').eq('client_email', email).gte('created_at', start).order('created_at', { ascending: false }),
    count('client_leads', 'created_at', prev, start),
    count('client_leads', 'handled_at', start),
    count('client_leads', 'handled_at', prev, start),
    count('client_lead_events', 'created_at', start).in('kind', ['note', 'tried']),
    count('client_lead_events', 'created_at', prev, start).in('kind', ['note', 'tried']),
    count('client_visits', 'created_at', start),
    count('client_visits', 'created_at', prev, start),
    count('client_review_requests', 'created_at', start).is('error', null),
    count('client_review_requests', 'created_at', prev, start).is('error', null),
    opts.marketing ? count('posting_posts', 'published_at', start).eq('status', 'published') : Promise.resolve(null),
    opts.marketing ? count('posting_posts', 'published_at', prev, start).eq('status', 'published') : Promise.resolve(null),
    opts.mailConnected ? count('client_mail', 'received_at', start) : Promise.resolve(null),
    opts.mailConnected ? count('client_mail', 'received_at', prev, start) : Promise.resolve(null),
    count('client_contacts', 'created_at', start),
    count('client_contacts', 'created_at', start).neq('origin', 'portal'),
    count('client_contacts', 'created_at', prev, start),
    sb.from('client_contacts').select('id', { count: 'exact', head: true }).eq('client_email', email),
    sb.from('client_domains').select('domain, expires_on, status').eq('client_email', email),
    account.project.assistantId ? listConversations(account.project.assistantId, 14) : Promise.resolve(undefined),
  ]);

  // The website's own visit count, the same one the Traffic room shows. When it
  // cannot be read both lines say Not read; when nothing came before, before is
  // a counted zero.
  const traffic = await buildTraffic(sb, account, 7).catch(() => null);

  const n = (r: { count: number | null; error: unknown } | null): number | null => (!r || r.error ? null : (r.count ?? 0));
  const leadsIn = leadRows.error ? null : (leadRows.data ?? []).length;

  const lines: WeekLine[] = [
    { key: 'visits', label: 'Visits to your website', room: 'traffic', value: traffic ? traffic.visits : null, before: traffic ? (traffic.previous?.visits ?? 0) : null, note: traffic ? 'One person on one day counts once.' : 'The visit count could not be read just now.' },
    { key: 'views', label: 'Pages they opened', room: 'traffic', value: traffic ? traffic.views : null, before: traffic ? (traffic.previous?.views ?? 0) : null },
    { key: 'leads', label: 'People who reached out', room: 'leads', value: leadsIn, before: n(leadsBefore) },
    { key: 'called', label: 'Leads marked called', room: 'leads', value: n(called), before: n(calledBefore) },
    { key: 'touches', label: 'Notes and call attempts written down', room: 'leads', value: n(touches), before: n(touchesBefore) },
  ];
  if (chats !== undefined) {
    const inWeek = chats ? chats.filter((c) => Date.parse(c.startedAt) >= startMs).length : null;
    const inPrev = chats ? chats.filter((c) => Date.parse(c.startedAt) >= prevMs && Date.parse(c.startedAt) < startMs).length : null;
    lines.push({ key: 'chats', label: 'Conversations your website had', room: 'conversations', value: inWeek, before: inPrev, note: chats ? undefined : 'The chat record could not be read just now.' });
  }
  lines.push({ key: 'scans', label: 'QR code scans', room: 'website', value: n(scans), before: n(scansBefore) });
  if (account.project.reviews.length) lines.push({ key: 'asks', label: 'Review asks sent', room: 'reviews', value: n(asks), before: n(asksBefore) });
  if (opts.marketing) lines.push({ key: 'posts', label: 'Posts published', room: 'marketing', value: n(posts), before: n(postsBefore) });
  if (opts.mailConnected) lines.push({ key: 'mail', label: 'Emails read and sorted', room: 'inbox', value: n(mail), before: n(mailBefore) });
  if ((n(contacts) ?? 0) > 0 || (n(contactsBefore) ?? 0) > 0) {
    // A book carried over from an old provider lands in one day. Said plainly,
    // so 304 new names never reads as 304 new customers.
    const carried = n(contactsCarried) ?? 0;
    lines.push({ key: 'contacts', label: 'People added to your book', room: 'contacts', value: n(contacts), before: n(contactsBefore), note: carried > 0 ? `${carried} of them carried over from your old provider.` : undefined });
  }

  const people = (leadRows.data ?? []).map((l) => ({
    name: (l.name as string | null) ?? 'Someone',
    detail: [l.town, l.project_type].filter(Boolean).join(', '),
    called: Boolean(l.handled_at),
  }));

  // The headline is assembled from the same counts, in a fixed order, so it
  // cannot say anything the table under it does not.
  const parts: string[] = [];
  if (leadsIn != null) parts.push(leadsIn === 0 ? 'Nobody new reached out this week' : `${leadsIn} ${leadsIn === 1 ? 'person' : 'people'} reached out this week`);
  const chatLine = lines.find((l) => l.key === 'chats');
  if (chatLine?.value) parts.push(`your website held ${chatLine.value} ${chatLine.value === 1 ? 'conversation' : 'conversations'}`);
  const calledN = n(called);
  if (calledN) parts.push(`${calledN} ${calledN === 1 ? 'lead was' : 'leads were'} called`);
  const headline = parts.length ? parts.map((p) => `${p.charAt(0).toUpperCase()}${p.slice(1)}.`).join(' ') : 'The week, counted from your records.';

  const ds = (domains.data ?? []).map((d) => ({ domain: d.domain as string, days: daysUntil(d.expires_on as string | null), status: d.status as string }));
  const next = ds.filter((d) => d.status === 'active' && d.days != null && d.days >= 0).sort((a, b) => (a.days ?? 0) - (b.days ?? 0))[0];
  const standing: WeekReport['standing'] = [];
  if (!contactsTotal.error) standing.push({ label: 'People in your book', value: String(contactsTotal.count ?? 0) });
  if (!domains.error && ds.length) standing.push({ label: 'Domains held and renewed for you', value: String(ds.length) });
  if (next) standing.push({ label: 'Next renewal', value: `${next.domain}, ${next.days} ${next.days === 1 ? 'day' : 'days'}` });

  return { business: account.project.business, from: day(startMs), to: day(now), range: `${day(startMs)} to ${day(now)}`, headline, lines, people, standing };
}

/** The same report as an email. Their colours, their name, plain tables. */
export function weekEmail(report: WeekReport, brand: { ink: string; accent: string }, sentBy: string, note?: string): string {
  const row = (l: WeekLine) => `
    <tr>
      <td style="padding:12px 0;border-top:1px solid #e6e8ec;font:400 15px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink}">${escape(l.label)}${l.note ? `<div style="font-size:12px;color:#6b7280">${escape(l.note)}</div>` : ''}</td>
      <td align="right" style="padding:12px 0;border-top:1px solid #e6e8ec;font:700 20px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink};white-space:nowrap">${l.value == null ? 'Not read' : l.value}</td>
      <td align="right" style="padding:12px 0 12px 14px;border-top:1px solid #e6e8ec;font:400 12px/1.2 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b7280;white-space:nowrap">${l.before == null ? '' : `${l.before} the week before`}</td>
    </tr>`;
  const people = report.people.length
    ? `<tr><td style="padding:20px 32px 0;font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Who reached out</td></tr>
       <tr><td style="padding:6px 32px 0;font:400 15px/1.7 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink}">${report.people
         .map((p) => `${escape(p.name)}${p.detail ? `, ${escape(p.detail)}` : ''} <span style="color:${p.called ? '#067647' : '#b54708'}">(${p.called ? 'called' : 'waiting on a call'})</span>`)
         .join('<br>')}</td></tr>`
    : '';
  const standing = report.standing.length
    ? `<tr><td style="padding:20px 32px 0;font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Kept running</td></tr>
       <tr><td style="padding:6px 32px 0;font:400 15px/1.7 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink}">${report.standing.map((s) => `${escape(s.label)}: <strong>${escape(s.value)}</strong>`).join('<br>')}</td></tr>`
    : '';
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e6e8ec">
        <tr><td style="padding:32px 32px 6px;font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${brand.accent}">${escape(report.business)} · ${escape(report.range)}</td></tr>
        <tr><td style="padding:0 32px;font:400 24px/1.3 Georgia,'Times New Roman',serif;color:${brand.ink}">${escape(report.headline)}</td></tr>
        ${note ? `<tr><td style="padding:14px 32px 0;font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${brand.ink}">${escape(note)}</td></tr>` : ''}
        <tr><td style="padding:18px 32px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${report.lines.map(row).join('')}</table></td></tr>
        ${people}
        ${standing}
        <tr><td style="padding:24px 32px 32px;font:400 13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#6b7280">Every number here was counted from the records in the ${escape(report.business)} Command Center. Sent by ${escape(sentBy)}.</td></tr>
      </table>
      <div style="font:400 12px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8b949e;padding:16px">Built and run by <a href="https://modernmustardseed.com" style="color:#F5B700;font-weight:600">Modern Mustard Seed</a></div>
    </td></tr>
  </table>
</body></html>`;
}
