/**
 * CLIENT DESKS MADE ON A FORM. A desk is everything the studio needs to know
 * to run a client's website leads, Daily Posting and Command Center: the same
 * ClientProject record that Built Right's desk is in code.
 *
 * Desks made on /admin/desks are rows in client_desks. They are loaded into
 * CLIENT_PROJECTS, the one registry every route already reads synchronously,
 * so a new desk works everywhere without a line of that code changing:
 *   - at server start (instrumentation.ts awaits hydrateDesks before serving),
 *   - again every minute on a warm server,
 *   - and at once on the server that saved it.
 * A desk defined in code always wins; a row can never replace it.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { CLIENT_PROJECTS, type ClientProject } from '@/lib/client-leads';
import { getSupabase } from '@/lib/supabase';

/** The desks written in code, captured before any row is merged in. */
const CODE_KEYS = new Set(Object.keys(CLIENT_PROJECTS));
const CODE_EMAILS = new Set(Object.values(CLIENT_PROJECTS).map((p) => p.clientEmail.toLowerCase()));
/** Keys this process loaded from rows, so a deleted row leaves the registry too. */
const loaded = new Set<string>();
let lastLoad = 0;
let inflight: Promise<void> | null = null;

export function isCodeDesk(key: string): boolean {
  return CODE_KEYS.has(key);
}

/** Load every row into the registry. Safe to call often; it reads at most once a minute unless forced. */
export async function hydrateDesks(opts: { force?: boolean } = {}): Promise<void> {
  if (!opts.force && Date.now() - lastLoad < 60_000) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const sb = getSupabase();
      if (!sb) return;
      const { data, error } = await sb.from('client_desks').select('key, config');
      if (error) return; // the table not being there yet leaves the code desks exactly as they were
      const seen = new Set<string>();
      for (const row of (data ?? []) as Array<{ key: string; config: ClientProject }>) {
        if (CODE_KEYS.has(row.key) || CODE_EMAILS.has(String(row.config?.clientEmail ?? '').toLowerCase())) continue;
        CLIENT_PROJECTS[row.key] = row.config;
        loaded.add(row.key);
        seen.add(row.key);
      }
      for (const k of [...loaded]) {
        if (!seen.has(k)) {
          delete CLIENT_PROJECTS[k];
          loaded.delete(k);
        }
      }
      lastLoad = Date.now();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/* ── the form's shape, and turning it into a desk ──────────────────── */

export type DeskPerson = { name: string; email: string; mailbox?: string };
export type DeskForm = {
  key?: string;
  business: string;
  clientEmail: string;
  siteUrl?: string;
  publicUrl?: string;
  extraOrigins?: string;
  notifyPhone?: string;
  notifyEmails?: string;
  people?: DeskPerson[];
  answers?: string;
  phone?: string;
  emailDomain?: string;
  postal?: string;
  googleReviewUrl?: string;
  googleMapsUrl?: string;
  houzzUrl?: string;
  facebookReviewUrl?: string;
  crm?: string;
  assistantId?: string;
  officeHost?: string;
  logo?: string;
  logoOnDark?: string;
  ink?: string;
  paper?: string;
  accent?: string;
  accent2?: string;
  guideName?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const t = (v: unknown, max = 300) => String(v ?? '').trim().slice(0, max);
const list = (v: unknown) => t(v, 2000).split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);

function url(v: unknown): string | null {
  const s = t(v, 500);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

/** An origin and its www twin, so a lead from either one is accepted. */
function originsOf(u: string | null): string[] {
  if (!u) return [];
  const o = new URL(u).origin.toLowerCase();
  const host = new URL(o).host;
  const twin = host.startsWith('www.') ? o.replace('//www.', '//') : o.replace('//', '//www.');
  return host.endsWith('.vercel.app') ? [o] : [o, twin];
}

export function slugFor(business: string): string {
  return business.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'client';
}

/** Form in, a complete desk out, or every problem at once so the form can say them all. */
export function buildDesk(f: DeskForm): { ok: true; desk: ClientProject } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const business = t(f.business, 120);
  const clientEmail = t(f.clientEmail, 200).toLowerCase();
  const key = t(f.key, 40).toLowerCase() || slugFor(business);
  if (!business) errors.push('The business name is needed.');
  if (!EMAIL.test(clientEmail)) errors.push('The account email is needed: the address the owner signs in with.');
  if (!/^[a-z0-9-]{2,40}$/.test(key)) errors.push('The key is lowercase letters, numbers and dashes.');

  const siteUrl = url(f.siteUrl);
  const publicUrl = url(f.publicUrl) ?? siteUrl;
  if (t(f.siteUrl) && !siteUrl) errors.push('The website address does not read as a web address.');

  const people: NonNullable<ClientProject['people']> = {};
  for (const p of f.people ?? []) {
    const name = t(p.name, 60);
    const email = t(p.email, 200).toLowerCase();
    const mailbox = t(p.mailbox, 200).toLowerCase();
    if (!name && !email) continue;
    if (!name) errors.push(`A person with the email ${email} needs a name.`);
    if (!EMAIL.test(email)) errors.push(`${name || 'A person'} needs the email they sign in with.`);
    if (mailbox && !EMAIL.test(mailbox)) errors.push(`${name}'s own inbox does not read as an email address.`);
    let k = slugFor(name).split('-')[0] || 'person';
    while (people[k]) k = `${k}2`;
    people[k] = { name, email, ...(mailbox ? { mailbox } : {}) };
  }

  const notifyEmails = list(f.notifyEmails).map((e) => e.toLowerCase());
  for (const e of notifyEmails) if (!EMAIL.test(e)) errors.push(`${e} is not an email address.`);
  const notifyPhone = t(f.notifyPhone, 40) || null;

  const colors = { ink: t(f.ink) || '#161616', paper: t(f.paper) || '#FBF6EA', accent: t(f.accent) || '#F5B700', accent2: t(f.accent2) || '#1E50C8' };
  for (const [k, v] of Object.entries(colors)) if (!HEX.test(v)) errors.push(`The ${k} colour is a hex code like #48603C.`);
  const logo = url(f.logo);
  if (!logo) errors.push('A logo address is needed. It shows at the top of their Command Center and on every campaign.');

  const officeHost = t(f.officeHost, 120).toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const googleReview = url(f.googleReviewUrl);
  const reviews: ClientProject['reviews'] = [];
  if (googleReview) reviews.push({ key: 'google', label: 'Google', url: googleReview });
  const houzz = url(f.houzzUrl);
  if (houzz) reviews.push({ key: 'houzz', label: 'Houzz', url: houzz });
  const fb = url(f.facebookReviewUrl);
  if (fb) reviews.push({ key: 'facebook', label: 'Facebook', url: fb });

  if (errors.length) return { ok: false, errors };

  const firstName = Object.values(people)[0]?.name ?? business;
  const desk: ClientProject = {
    key,
    clientEmail,
    business,
    siteUrl: siteUrl ?? '',
    publicUrl: publicUrl ?? '',
    origins: [...new Set([...originsOf(siteUrl), ...originsOf(publicUrl), ...list(f.extraOrigins).map(url).filter((u): u is string => Boolean(u)).flatMap(originsOf)])],
    notify: { phone: notifyPhone, emails: notifyEmails.length ? notifyEmails : [clientEmail] },
    ...(Object.keys(people).length ? { people } : {}),
    answers: t(f.answers, 60) || firstName,
    phone: t(f.phone, 40) || notifyPhone || '',
    assistantId: t(f.assistantId, 80) || null,
    crm: f.crm === 'buildertrend' ? 'buildertrend' : null,
    emailDomain: t(f.emailDomain, 120).toLowerCase() || null,
    googleProfile: googleReview || url(f.googleMapsUrl) ? { reviewUrl: googleReview, mapsUrl: url(f.googleMapsUrl) } : null,
    reviews,
    campaignFrom: null,
    postal: t(f.postal, 200) || null,
    projects: [],
    office: {
      name: `${business} Command Center`,
      host: officeHost,
      origins: officeHost ? [`https://${officeHost}`] : [],
      logo: logo as string,
      logoOnDark: url(f.logoOnDark) ?? (logo as string),
      colors,
      guideName: t(f.guideName, 80) || `your ${business} guide`,
    },
  };
  return { ok: true, desk };
}

/** The desk back into the form's shape, for editing. */
export function formOf(d: ClientProject): DeskForm {
  const review = (k: string) => d.reviews.find((r) => r.key === k)?.url ?? '';
  const [siteOrigins, publicOrigins] = [originsOf(d.siteUrl || null), originsOf(d.publicUrl || null)];
  return {
    key: d.key,
    business: d.business,
    clientEmail: d.clientEmail,
    siteUrl: d.siteUrl,
    publicUrl: d.publicUrl === d.siteUrl ? '' : d.publicUrl,
    extraOrigins: d.origins.filter((o) => !siteOrigins.includes(o) && !publicOrigins.includes(o)).join(', '),
    notifyPhone: d.notify.phone ?? '',
    notifyEmails: d.notify.emails.join(', '),
    people: Object.values(d.people ?? {}).map((p) => ({ name: p.name, email: p.email, mailbox: p.mailbox ?? '' })),
    answers: d.answers,
    phone: d.phone,
    emailDomain: d.emailDomain ?? '',
    postal: d.postal ?? '',
    googleReviewUrl: review('google'),
    googleMapsUrl: d.googleProfile?.mapsUrl ?? '',
    houzzUrl: review('houzz'),
    facebookReviewUrl: review('facebook'),
    crm: d.crm ?? '',
    assistantId: d.assistantId ?? '',
    officeHost: d.office.host,
    logo: d.office.logo,
    logoOnDark: d.office.logoOnDark === d.office.logo ? '' : d.office.logoOnDark,
    ...d.office.colors,
    guideName: d.office.guideName,
  };
}

/**
 * Save a desk, and make the rows it needs to be usable: a clients row so the
 * owner has a card in the Client Book, and posting settings (switched off and
 * hidden) so the desk appears on the posting desk, where the Show switches are.
 * Nothing is switched on for the client here; that stays a press on the desk.
 */
export async function saveDesk(sb: SupabaseClient, f: DeskForm, by: string, editing?: string | null): Promise<{ ok: true; desk: ClientProject } | { ok: false; errors: string[] }> {
  const built = buildDesk(f);
  if (!built.ok) return built;
  const desk = built.desk;
  if (editing && editing !== desk.key) return { ok: false, errors: ['A desk key cannot change once it is made.'] };
  if (isCodeDesk(desk.key)) return { ok: false, errors: [`${desk.key} is a desk written in code and is edited there.`] };
  if (CODE_EMAILS.has(desk.clientEmail)) return { ok: false, errors: [`${desk.clientEmail} already has a desk written in code.`] };

  const { data: clash } = await sb.from('client_desks').select('key').eq('client_email', desk.clientEmail).maybeSingle();
  if (clash && (clash as { key: string }).key !== desk.key) return { ok: false, errors: [`${desk.clientEmail} already has the desk "${(clash as { key: string }).key}".`] };
  if (!editing) {
    const { data: taken } = await sb.from('client_desks').select('key').eq('key', desk.key).maybeSingle();
    if (taken) return { ok: false, errors: [`The key "${desk.key}" is taken. Give this desk its own.`] };
  }

  const now = new Date().toISOString();
  const row = { key: desk.key, client_email: desk.clientEmail, config: desk, updated_at: now, ...(editing ? {} : { created_by: by, created_at: now }) };
  const { error } = await sb.from('client_desks').upsert(row, { onConflict: 'key' });
  if (error) return { ok: false, errors: [`The desk did not save: ${error.message}`] };

  const firstPerson = Object.values(desk.people ?? {})[0]?.name ?? null;
  const { data: client } = await sb.from('clients').select('id').eq('email', desk.clientEmail).maybeSingle();
  if (!client) await sb.from('clients').insert({ email: desk.clientEmail, name: firstPerson, company: desk.business, tier: 'engagement', status: 'active' });
  const { data: posting } = await sb.from('posting_settings').select('client_email').eq('client_email', desk.clientEmail).maybeSingle();
  if (!posting) {
    await sb.from('posting_settings').insert({ client_email: desk.clientEmail, business_name: desk.business, site_url: desk.publicUrl || desk.siteUrl || null, phone: desk.phone || null, active: false, visible: false, notify_emails: desk.notify.emails });
  } else {
    await sb.from('posting_settings').update({ business_name: desk.business, site_url: desk.publicUrl || desk.siteUrl || null, updated_at: now }).eq('client_email', desk.clientEmail);
  }

  CLIENT_PROJECTS[desk.key] = desk;
  loaded.add(desk.key);
  return { ok: true, desk };
}

export type DeskListing = { key: string; business: string; clientEmail: string; source: 'code' | 'form'; people: number; siteUrl: string; form?: DeskForm };

export async function listDesks(sb: SupabaseClient): Promise<DeskListing[]> {
  await hydrateDesks({ force: true });
  const { data } = await sb.from('client_desks').select('key').order('created_at', { ascending: true });
  const formKeys = new Set(((data ?? []) as Array<{ key: string }>).map((r) => r.key));
  return Object.values(CLIENT_PROJECTS)
    .filter((d) => CODE_KEYS.has(d.key) || formKeys.has(d.key))
    .map((d) => ({
      key: d.key,
      business: d.business,
      clientEmail: d.clientEmail,
      source: CODE_KEYS.has(d.key) ? ('code' as const) : ('form' as const),
      people: Object.keys(d.people ?? {}).length,
      siteUrl: d.publicUrl || d.siteUrl,
      ...(CODE_KEYS.has(d.key) ? {} : { form: formOf(d) }),
    }));
}
