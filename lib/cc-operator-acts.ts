/**
 * THE OPERATOR'S HANDS FOR FIXING AND UNDOING. The Operator could add things
 * (a job, a QR code, a draft) and could not take anything away or put anything
 * right, so "delete those test posts" got a warm sentence and no change.
 *
 * Every function here finds its target the way a person names it (a date, a
 * few words of a headline, a name, a short id the Operator was shown) and
 * refuses rather than guesses when that matches nothing or more than it
 * should. Nothing that has already gone out to a feed is touched: a published
 * post lives on Facebook now, and pretending to delete it would be a lie.
 * Every outcome is returned as a sentence that says what actually changed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSettings } from '@/lib/posting/settings';
import { retireFact } from '@/lib/cc-facts';
import { planClient } from '@/lib/posting/planner';
import { scrub } from '@/lib/posting/captions';
import { mountainDate } from '@/lib/posting/time';
import { PLATFORMS, type Platform } from '@/lib/posting/types';

type Sb = SupabaseClient;
type PostLite = { id: string; scheduled_for: string; publish_at: string | null; status: string; headline: string | null; captions: Record<string, string> | null; material_id: string | null };

const GONE = ['published', 'publishing', 'partial'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

/** The client's posts that have not gone out, soonest first, for the Operator to be shown and to match against. */
export async function upcomingPosts(sb: Sb, email: string, limit = 40): Promise<PostLite[]> {
  const { data } = await sb
    .from('posting_posts')
    .select('id, scheduled_for, publish_at, status, headline, captions, material_id')
    .eq('client_email', email)
    .gte('scheduled_for', mountainDate())
    .not('status', 'in', `(${GONE.join(',')})`)
    .order('scheduled_for', { ascending: true })
    .limit(limit);
  return (data ?? []) as PostLite[];
}

/** One line per post, with the short id the Operator names it by. */
export function postLines(posts: PostLite[]): string[] {
  return posts.map((p) => `[post ${p.id.slice(0, 8)}] ${p.scheduled_for}, ${p.status}: ${(p.headline ?? '(no words yet)').slice(0, 90)}`);
}

/** A post named by short id, date, or headline words. Several on one date is fine for a date ("the 27th"). */
function matchPosts(posts: PostLite[], ref: string): PostLite[] {
  const r = ref.trim().toLowerCase().replace(/^post\s+/, '');
  if (!r) return [];
  if (/^[0-9a-f]{6,}$/.test(r)) return posts.filter((p) => p.id.startsWith(r));
  if (ISO.test(r)) return posts.filter((p) => p.scheduled_for === r);
  const want = words(r);
  if (!want.length) return [];
  const scored = posts.map((p) => ({ p, n: words(p.headline ?? '').filter((w) => want.includes(w)).length })).filter((x) => x.n > 0);
  const best = Math.max(0, ...scored.map((x) => x.n));
  return scored.filter((x) => x.n === best).map((x) => x.p);
}

async function removePosts(sb: Sb, email: string, list: PostLite[]): Promise<number> {
  if (!list.length) return 0;
  const ids = list.map((p) => p.id);
  const { data } = await sb.from('posting_posts').delete().eq('client_email', email).in('id', ids).not('status', 'in', `(${GONE.join(',')})`).select('id');
  // Their words stay on file, out of the queue, so the planner never picks them up again.
  const mats = list.map((p) => p.material_id).filter((m): m is string => Boolean(m));
  if (mats.length) await sb.from('posting_materials').update({ status: 'archived' }).eq('client_email', email).in('id', mats);
  return (data ?? []).length;
}

export async function deletePost(sb: Sb, email: string, ref: string): Promise<string> {
  const posts = await upcomingPosts(sb, email);
  const hits = matchPosts(posts, ref);
  if (!hits.length) return `I did not find a post that has not gone out yet matching "${ref}".`;
  if (hits.length > 1 && !ISO.test(ref.trim())) return `"${ref}" matches ${hits.length} posts (${hits.map((h) => h.scheduled_for).join(', ')}). Tell me which day.`;
  const n = await removePosts(sb, email, hits);
  return n ? `Deleted ${n === 1 ? `the post for ${hits[0].scheduled_for}` : `${n} posts on ${hits[0].scheduled_for}`}. Nothing had gone out.` : 'Nothing was deleted: that post has already started going out.';
}

/** Every post not yet out between two dates, inclusive. With no dates, every upcoming one. */
export async function clearPosts(sb: Sb, email: string, from?: string, to?: string): Promise<string> {
  const a = from && ISO.test(from) ? from : mountainDate();
  const b = to && ISO.test(to) ? to : '9999-12-31';
  const hits = (await upcomingPosts(sb, email, 200)).filter((p) => p.scheduled_for >= a && p.scheduled_for <= b);
  if (!hits.length) return 'There were no upcoming posts in that range to delete.';
  const n = await removePosts(sb, email, hits);
  const span = b === '9999-12-31' ? 'upcoming' : `from ${a} to ${b}`;
  return `Deleted ${n} ${span} post${n === 1 ? '' : 's'}. Anything already published stays on the feeds.`;
}

export async function skipPost(sb: Sb, email: string, ref: string): Promise<string> {
  const hits = matchPosts(await upcomingPosts(sb, email), ref);
  if (hits.length !== 1) return hits.length ? `"${ref}" matches ${hits.length} posts. Tell me which day.` : `I did not find an upcoming post matching "${ref}".`;
  await sb.from('posting_posts').update({ status: 'skipped', edited_by: email, updated_at: new Date().toISOString() }).eq('id', hits[0].id);
  return `The ${hits[0].scheduled_for} post is skipped. It can be put back from the calendar.`;
}

export async function movePost(sb: Sb, email: string, ref: string, date: string): Promise<string> {
  if (!ISO.test(date) || date < mountainDate()) return `I can only move a post to today or a later date, given as a date.`;
  const hits = matchPosts(await upcomingPosts(sb, email), ref);
  if (hits.length !== 1) return hits.length ? `"${ref}" matches ${hits.length} posts. Tell me which day.` : `I did not find an upcoming post matching "${ref}".`;
  const p = hits[0];
  // Same hour of day, new date: shift publish_at by the whole days between them.
  const days = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${p.scheduled_for}T12:00:00Z`)) / 86_400_000);
  const publishAt = p.publish_at ? new Date(Date.parse(p.publish_at) + days * 86_400_000).toISOString() : null;
  await sb.from('posting_posts').update({ scheduled_for: date, ...(publishAt ? { publish_at: publishAt } : {}), edited_by: email, updated_at: new Date().toISOString() }).eq('id', p.id);
  return `The ${p.scheduled_for} post now goes out on ${date}.`;
}

/** Their words for one platform, or for every platform when none is named. Written by a person, so no model rewrites it later. */
export async function editPost(sb: Sb, email: string, ref: string, text: string, platform?: string): Promise<string> {
  const clean = text.trim().slice(0, 3000);
  if (clean.length < 3) return 'Tell me the new words for the post.';
  const hits = matchPosts(await upcomingPosts(sb, email), ref);
  if (hits.length !== 1) return hits.length ? `"${ref}" matches ${hits.length} posts. Tell me which day.` : `I did not find an upcoming post matching "${ref}".`;
  const p = hits[0];
  const one = platform && (PLATFORMS as readonly string[]).includes(platform) ? (platform as Platform) : null;
  const next: Record<string, string> = { ...(p.captions ?? {}) };
  for (const k of one ? [one] : PLATFORMS) next[k] = clean;
  const patch: Record<string, unknown> = { captions: scrub(next), edited_by: email, updated_at: new Date().toISOString() };
  if (!one) patch.headline = clean.slice(0, 200);
  if (p.status === 'writing') patch.status = 'scheduled';
  await sb.from('posting_posts').update(patch).eq('id', p.id);
  return `The ${p.scheduled_for} post now says your words${one ? ` on ${one}` : ' on every platform'}.`;
}

/** A new post in their words; the planner puts it on the next open day and writes each platform's version. */
export async function addPost(sb: Sb, email: string, text: string): Promise<string> {
  const clean = text.trim().slice(0, 4000);
  if (clean.length < 3) return 'Tell me what the post should say.';
  const settings = await getSettings(sb, email);
  if (!settings || !settings.visible) return 'Daily Posting is not on for this account, so I cannot add a post.';
  const { error } = await sb.from('posting_materials').insert({ client_email: email, kind: 'post', text: clean, uploaded_by: email, status: 'fresh' });
  if (error) return `I could not add the post: ${error.message}`;
  const planned = await planClient(sb, settings);
  const first = planned.find((x) => x.action === 'created');
  return first?.date ? `The post is on the calendar for ${first.date}, with each platform's version being written now.` : 'The post is in your queue and will take the next open day.';
}

/* ── the book, the board and the rest ─────────────────────────────── */

async function oneContact(sb: Sb, email: string, name?: string, addr?: string, phone?: string) {
  let q = sb.from('client_contacts').select('id, name, email, phone').eq('client_email', email);
  const digits = (phone ?? '').replace(/\D/g, '').slice(-10);
  if (addr) q = q.ilike('email', addr.trim());
  else if (digits.length === 10) q = q.ilike('phone', `%${digits.slice(-4)}%`);
  else if (name) q = q.ilike('name', name.trim());
  else return { error: 'Tell me the name, email or phone of the contact.' } as const;
  const { data } = await q.limit(5);
  const rows = ((data ?? []) as Array<{ id: string; name: string | null; email: string | null; phone: string | null }>).filter((r) => digits.length !== 10 || (r.phone ?? '').replace(/\D/g, '').endsWith(digits));
  if (!rows.length) return { error: `I did not find a contact matching ${addr || phone || name}.` } as const;
  if (rows.length > 1) return { error: `${rows.length} contacts match ${addr || phone || name}. Give me their email or phone so I change the right one.` } as const;
  return { row: rows[0] } as const;
}

export async function deleteContact(sb: Sb, email: string, name?: string, addr?: string, phone?: string): Promise<string> {
  const c = await oneContact(sb, email, name, addr, phone);
  if ('error' in c) return c.error as string;
  await sb.from('client_contacts').delete().eq('id', c.row.id).eq('client_email', email);
  return `${c.row.name ?? c.row.email ?? 'That contact'} is deleted from your contacts.`;
}

const CONTACT_FIELDS = ['name', 'email', 'phone', 'company', 'notes'] as const;
export async function fixContact(sb: Sb, email: string, who: { name?: string; email?: string; phone?: string }, field: string, value: string): Promise<string> {
  if (!(CONTACT_FIELDS as readonly string[]).includes(field)) return `I can change a contact's name, email, phone, company or notes.`;
  const c = await oneContact(sb, email, who.name, who.email, who.phone);
  if ('error' in c) return c.error as string;
  await sb.from('client_contacts').update({ [field]: value.trim().slice(0, 500) || null, updated_at: new Date().toISOString() }).eq('id', c.row.id).eq('client_email', email);
  return `${c.row.name ?? 'The contact'}: ${field} is now ${value.trim() || 'blank'}.`;
}

/** A lead marked called by mistake goes back on the waiting list, with the reason in its log. */
export async function unmarkCalled(sb: Sb, email: string, name: string, by: string): Promise<string> {
  const { data } = await sb.from('client_leads').select('id, name').eq('client_email', email).not('handled_at', 'is', null).ilike('name', `%${name.replace(/[%_]/g, '')}%`).order('handled_at', { ascending: false }).limit(2);
  const rows = (data ?? []) as Array<{ id: string; name: string | null }>;
  if (rows.length !== 1) return rows.length ? `More than one called lead matches ${name}. Give me the full name.` : `I did not find a lead named ${name} marked called.`;
  await sb.from('client_leads').update({ handled_at: null, handled_by: null }).eq('id', rows[0].id);
  await sb.from('client_lead_events').insert({ client_email: email, lead_id: rows[0].id, kind: 'uncalled', author_key: null, author_name: `${by}, through the Operator` });
  return `${rows[0].name ?? name} is back on the waiting list.`;
}

/** Only a lead they name exactly; a real inquiry deleted by a loose match is a lost job. */
export async function deleteLead(sb: Sb, email: string, name: string): Promise<string> {
  const { data } = await sb.from('client_leads').select('id, name').eq('client_email', email).ilike('name', name.trim()).limit(2);
  const rows = (data ?? []) as Array<{ id: string; name: string | null }>;
  if (rows.length !== 1) return rows.length ? `Two leads are named ${name}. Delete that one from the Leads room so the right one goes.` : `I did not find a lead named exactly ${name}.`;
  await sb.from('client_lead_events').delete().eq('lead_id', rows[0].id).eq('client_email', email);
  await sb.from('client_leads').delete().eq('id', rows[0].id).eq('client_email', email);
  return `The lead ${rows[0].name ?? name} is deleted.`;
}

export async function deleteJob(sb: Sb, email: string, jobName: string): Promise<string> {
  const { data } = await sb.from('client_jobs').select('id, name').eq('client_email', email).ilike('name', `%${jobName.replace(/[%_]/g, '')}%`).limit(2);
  const rows = (data ?? []) as Array<{ id: string; name: string }>;
  if (rows.length !== 1) return rows.length ? `More than one job matches "${jobName}". Give me its full name.` : `I did not find a job called "${jobName}".`;
  await sb.from('client_job_events').delete().eq('job_id', rows[0].id).eq('client_email', email);
  await sb.from('client_jobs').delete().eq('id', rows[0].id).eq('client_email', email);
  return `"${rows[0].name}" is off the board.`;
}

export async function deleteTrade(sb: Sb, email: string, company: string): Promise<string> {
  const { data } = await sb.from('client_trades').select('id, company').eq('client_email', email).ilike('company', `%${company.replace(/[%_]/g, '')}%`).limit(2);
  const rows = (data ?? []) as Array<{ id: string; company: string }>;
  if (rows.length !== 1) return rows.length ? `More than one company matches "${company}".` : `I did not find ${company} on the bench.`;
  await sb.from('client_trades').delete().eq('id', rows[0].id).eq('client_email', email);
  return `${rows[0].company} is off the bench.`;
}

/** A QR code is archived, not deleted, so a printed sign that is still out there keeps counting honestly. */
export async function archiveCode(sb: Sb, email: string, label: string): Promise<string> {
  const { data } = await sb.from('client_campaigns').select('id, label').eq('client_email', email).is('archived_at', null).ilike('label', `%${label.replace(/[%_]/g, '')}%`).limit(2);
  const rows = (data ?? []) as Array<{ id: string; label: string }>;
  if (rows.length !== 1) return rows.length ? `More than one code matches "${label}".` : `I did not find a code called "${label}".`;
  await sb.from('client_campaigns').update({ archived_at: new Date().toISOString() }).eq('id', rows[0].id);
  return `The code "${rows[0].label}" is put away. A sign still printed with it keeps landing on your site.`;
}

export async function forgetFact(sb: Sb, email: string, fact: string, by: string): Promise<string> {
  const want = words(fact);
  const { data } = await sb.from('client_facts').select('id, fact').eq('client_email', email).is('retired_at', null).limit(200);
  const scored = ((data ?? []) as Array<{ id: string; fact: string }>).map((f) => ({ f, n: words(f.fact).filter((w) => want.includes(w)).length })).filter((x) => x.n >= Math.min(2, want.length));
  const best = Math.max(0, ...scored.map((x) => x.n));
  const hits = scored.filter((x) => x.n === best);
  if (hits.length !== 1) return hits.length ? 'More than one thing I remember matches that. Say it more exactly.' : 'I do not remember anything like that.';
  await retireFact(sb, email, hits[0].f.id, 'asked to forget, through the Operator', by);
  return `Forgotten: ${hits[0].f.fact}`;
}
