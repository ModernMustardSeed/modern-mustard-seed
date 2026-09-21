import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientProject } from '@/lib/client-leads';
import { sendViaResend } from '@/lib/send-email';
import { isRootDomainAddress } from '@/lib/outreach-domain';
import { SITE } from '@/lib/seo';

/**
 * CAMPAIGNS: one message from a business to the people in its own book.
 *
 * Their words, to their people, from their address. Four rules, each one here
 * because the alternative has already cost somebody:
 *
 *   1. It never leaves from our domain. A client's list is theirs to spend a
 *      reputation on, not ours, so a project with no verified sending address
 *      of its own can write, preview and test, and cannot send. See
 *      lib/outreach-domain.ts for what bulk mail did to the root domain.
 *   2. A person presses Send. There is no schedule and no drip behind this.
 *   3. Unsubscribed means never again, and every message carries the one-click
 *      link that makes it so.
 *   4. Every recipient is a row with its own outcome. "Sent to 214" is a count
 *      of rows that say sent.
 */

export const MAILING_CAP = 400;
/** Resend allows two requests a second. This stays under it. */
const GAP_MS = 550;

export type Audience = { total: number; withEmail: number; reachable: number; unsubscribed: number; tags: Array<{ tag: string; count: number }> };

export type Mailing = {
  id: string;
  subject: string;
  tags: string[];
  status: 'sending' | 'sent' | 'stopped';
  createdBy: string | null;
  audienceCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  finishedAt: string | null;
};

type ContactRow = { id: string; name: string | null; email: string | null; tags: string[] | null; unsubscribed_at: string | null; unsubscribe_token: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const norm = (e: string) => e.trim().toLowerCase();
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The address a campaign leaves from, or null when the project has none of its own yet. */
export function campaignSender(project: ClientProject): string | null {
  const from = project.campaignFrom ?? null;
  if (!from) return null;
  // A sender that drifted onto our own root domain is treated as no sender at all.
  return isRootDomainAddress(from) ? null : from;
}

async function readBook(sb: SupabaseClient, clientEmail: string): Promise<ContactRow[] | null> {
  const r = await sb
    .from('client_contacts')
    .select('id, name, email, tags, unsubscribed_at, unsubscribe_token')
    .eq('client_email', clientEmail)
    .limit(5000);
  if (r.error || !r.data) return null;
  return r.data as ContactRow[];
}

/** Everyone a message could reach: a usable address, not unsubscribed, one row per address. */
function reachable(rows: ContactRow[], tags: string[]): ContactRow[] {
  const seen = new Set<string>();
  const want = tags.map((t) => t.toLowerCase());
  const out: ContactRow[] = [];
  for (const c of rows) {
    if (!c.email || !EMAIL.test(c.email.trim()) || c.unsubscribed_at) continue;
    if (want.length && !(c.tags ?? []).some((t) => want.includes(t.toLowerCase()))) continue;
    const key = norm(c.email);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export async function audience(sb: SupabaseClient, clientEmail: string): Promise<Audience | null> {
  const rows = await readBook(sb, clientEmail);
  if (!rows) return null;
  const everyone = reachable(rows, []);
  const counts = new Map<string, number>();
  for (const c of everyone) for (const t of c.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  return {
    total: rows.length,
    withEmail: rows.filter((c) => c.email && EMAIL.test(c.email.trim())).length,
    reachable: everyone.length,
    unsubscribed: rows.filter((c) => c.unsubscribed_at).length,
    tags: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([tag, count]) => ({ tag, count })),
  };
}

export async function countFor(sb: SupabaseClient, clientEmail: string, tags: string[]): Promise<number | null> {
  const rows = await readBook(sb, clientEmail);
  return rows ? reachable(rows, tags).length : null;
}

const firstName = (name: string | null) => (name ?? '').trim().split(/\s+/)[0] || 'there';

/** {first} becomes the person's first name, or "there" when the book has no name. */
const personalise = (text: string, name: string | null) => text.replace(/\{first\}/gi, firstName(name));

export function unsubscribeUrl(token: string): string {
  return `${SITE.url}/api/client-unsubscribe?t=${encodeURIComponent(token)}`;
}

/** The message as it arrives: their name at the top, their words, their address, the way out. */
export function mailingHtml(project: ClientProject, body: string, name: string | null, unsubUrl: string | null): string {
  const paras = personalise(body, name)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.65">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const ink = project.office.colors.ink;
  const accent = project.office.colors.accent;
  const foot = [esc(project.business), project.postal ? esc(project.postal) : '', esc(project.phone)].filter(Boolean).join(' &middot; ');
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:${ink}">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-top:4px solid ${accent}">
<div style="padding:28px 28px 8px;font-size:20px;font-weight:bold;letter-spacing:.01em">${esc(project.business)}</div>
<div style="padding:12px 28px 20px;font-size:16px">${paras}</div>
<div style="padding:18px 28px 26px;border-top:1px solid #e6e2da;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b675f">
${foot}<br>
You are getting this because you are in our contact book.${unsubUrl ? ` <a href="${esc(unsubUrl)}" style="color:#6b675f">Unsubscribe</a> and we will not write again.` : ''}
</div></div></body></html>`;
}

export function mailingText(project: ClientProject, body: string, name: string | null, unsubUrl: string | null): string {
  const foot = [project.business, project.postal ?? '', project.phone].filter(Boolean).join(' | ');
  return `${personalise(body, name).trim()}\n\n${foot}\n${unsubUrl ? `Unsubscribe: ${unsubUrl}` : ''}`.trim();
}

/** One copy to the person at the desk, so they see it land before anybody else does. */
export async function sendTest(project: ClientProject, to: string, toName: string | null, subject: string, body: string): Promise<{ ok: boolean; error: string | null }> {
  const own = campaignSender(project);
  // A test is one message to the owner themselves, which is a thing they asked
  // for, so it may leave from our address when theirs is not set up yet.
  const from = own ?? `${project.business} <sarah@modernmustardseed.com>`;
  const sent = await sendViaResend({
    from,
    to,
    subject: `[Test] ${personalise(subject, toName)}`,
    html: mailingHtml(project, body, toName, null),
    text: mailingText(project, body, toName, null),
    replyTo: project.clientEmail,
  });
  return sent.ok ? { ok: true, error: null } : { ok: false, error: sent.error };
}

const toMailing = (r: Record<string, unknown>): Mailing => ({
  id: r.id as string,
  subject: r.subject as string,
  tags: (r.tags as string[] | null) ?? [],
  status: r.status as Mailing['status'],
  createdBy: (r.created_by as string | null) ?? null,
  audienceCount: Number(r.audience_count) || 0,
  sentCount: Number(r.sent_count) || 0,
  failedCount: Number(r.failed_count) || 0,
  createdAt: r.created_at as string,
  finishedAt: (r.finished_at as string | null) ?? null,
});

export async function listMailings(sb: SupabaseClient, clientEmail: string): Promise<Mailing[] | null> {
  const r = await sb.from('client_mailings').select('*').eq('client_email', clientEmail).order('created_at', { ascending: false }).limit(30);
  if (r.error || !r.data) return null;
  return (r.data as Array<Record<string, unknown>>).map(toMailing);
}

export type StartResult = { ok: true; mailing: Mailing } | { ok: false; error: string };

/**
 * Freeze the audience and send. The recipient rows are written first, so the
 * list a message went to is a fact on disk before the first one leaves, and a
 * send that is cut short can be finished from the rows still marked queued.
 */
export async function startMailing(
  sb: SupabaseClient,
  project: ClientProject,
  clientEmail: string,
  input: { subject: string; body: string; tags: string[]; expect: number; by: string },
): Promise<StartResult> {
  const from = campaignSender(project);
  if (!from) return { ok: false, error: 'Your sending address is still being set up, so this cannot go out yet. You can write it, preview it and send yourself a test.' };

  const rows = await readBook(sb, clientEmail);
  if (!rows) return { ok: false, error: 'We could not read your contact book just now. Nothing was sent.' };
  const people = reachable(rows, input.tags);
  if (!people.length) return { ok: false, error: 'Nobody in that group has an email address we can write to.' };
  // The number on the button is the number that goes. If the book changed
  // since the screen counted it, stop and let them look again.
  if (people.length !== input.expect) return { ok: false, error: `That group is ${people.length} people now, not ${input.expect}. Look again before sending.` };
  if (people.length > MAILING_CAP) return { ok: false, error: `That is ${people.length} people. One message goes to ${MAILING_CAP} at most, so pick a tag.` };

  const made = await sb
    .from('client_mailings')
    .insert({ client_email: clientEmail, subject: input.subject, body: input.body, tags: input.tags, created_by: input.by, audience_count: people.length })
    .select('*')
    .single();
  if (made.error || !made.data) return { ok: false, error: 'We could not start that. Nothing was sent.' };
  const mailingId = (made.data as { id: string }).id;

  const queued = await sb.from('client_mailing_recipients').insert(people.map((c) => ({ mailing_id: mailingId, contact_id: c.id, email: norm(c.email as string), name: c.name })));
  if (queued.error) {
    await sb.from('client_mailings').update({ status: 'stopped', finished_at: new Date().toISOString() }).eq('id', mailingId);
    return { ok: false, error: 'We could not write the list of who it goes to, so nothing was sent.' };
  }

  const tokens = new Map(people.map((c) => [norm(c.email as string), c.unsubscribe_token]));
  return runMailing(sb, project, mailingId, from, tokens);
}

/** Send every row still queued. Safe to call again on a mailing that was cut short. */
export async function runMailing(sb: SupabaseClient, project: ClientProject, mailingId: string, from: string, tokens: Map<string, string>): Promise<StartResult> {
  const m = await sb.from('client_mailings').select('*').eq('id', mailingId).single();
  if (m.error || !m.data) return { ok: false, error: 'That message could not be found.' };
  const mailing = m.data as { subject: string; body: string };

  const q = await sb.from('client_mailing_recipients').select('id, email, name').eq('mailing_id', mailingId).eq('status', 'queued').limit(MAILING_CAP);
  if (q.error || !q.data) return { ok: false, error: 'We could not read who is still waiting on it.' };

  for (const r of q.data as Array<{ id: string; email: string; name: string | null }>) {
    const token = tokens.get(r.email);
    const unsub = token ? unsubscribeUrl(token) : null;
    // No way out, no message. A row without a token is marked failed, not sent bare.
    const sent = unsub
      ? await sendViaResend({
          from,
          to: r.email,
          subject: personalise(mailing.subject, r.name),
          html: mailingHtml(project, mailing.body, r.name, unsub),
          text: mailingText(project, mailing.body, r.name, unsub),
          replyTo: project.clientEmail,
          unsubscribeUrl: unsub,
        })
      : ({ ok: false, error: 'No unsubscribe link for this person.' } as const);
    await sb
      .from('client_mailing_recipients')
      .update(sent.ok ? { status: 'sent', sent_at: new Date().toISOString() } : { status: 'failed', error: sent.error.slice(0, 300) })
      .eq('id', r.id);
    await new Promise((res) => setTimeout(res, GAP_MS));
  }

  const [sentRows, failedRows, left] = await Promise.all([
    sb.from('client_mailing_recipients').select('id', { count: 'exact', head: true }).eq('mailing_id', mailingId).eq('status', 'sent'),
    sb.from('client_mailing_recipients').select('id', { count: 'exact', head: true }).eq('mailing_id', mailingId).eq('status', 'failed'),
    sb.from('client_mailing_recipients').select('id', { count: 'exact', head: true }).eq('mailing_id', mailingId).eq('status', 'queued'),
  ]);
  const done = (left.count ?? 0) === 0;
  const upd = await sb
    .from('client_mailings')
    .update({ sent_count: sentRows.count ?? 0, failed_count: failedRows.count ?? 0, ...(done ? { status: 'sent', finished_at: new Date().toISOString() } : {}) })
    .eq('id', mailingId)
    .select('*')
    .single();
  if (upd.error || !upd.data) return { ok: false, error: 'It went out, and we could not read the final count. Reload to see it.' };
  return { ok: true, mailing: toMailing(upd.data as Record<string, unknown>) };
}

/** One click, no sign-in, no questions. Returns the business name for the page that says so. */
export async function unsubscribe(sb: SupabaseClient, token: string): Promise<{ ok: boolean; clientEmail: string | null }> {
  if (!/^[a-f0-9]{32}$/i.test(token)) return { ok: false, clientEmail: null };
  const r = await sb.from('client_contacts').select('id, client_email, unsubscribed_at').eq('unsubscribe_token', token).maybeSingle();
  if (r.error || !r.data) return { ok: false, clientEmail: null };
  const row = r.data as { id: string; client_email: string; unsubscribed_at: string | null };
  if (!row.unsubscribed_at) await sb.from('client_contacts').update({ unsubscribed_at: new Date().toISOString() }).eq('id', row.id);
  return { ok: true, clientEmail: row.client_email };
}
