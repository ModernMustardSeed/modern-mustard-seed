import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptSecret, encryptSecret } from '@/lib/crypto';

/**
 * BUILDERTREND, WITHOUT A PARTNER API.
 *
 * Buildertrend's public API is for its partners, so a small builder cannot
 * get a key. What every Buildertrend account does have is a website contact
 * form: an embed whose builder token identifies the account, backed by a
 * public endpoint that returns the form definition and accepts submissions.
 * A submission becomes a Lead Opportunity in their CRM, which is exactly the
 * hand-off we want.
 *
 * So we speak that form's language. The token comes from the embed code in
 * Buildertrend under Sales, Lead Opportunities, Lead Contact Form, and is
 * held encrypted in client_integrations. Every lead that reaches us is
 * posted through it once. If Buildertrend refuses (a captcha on their side
 * is the only reason it does), the refusal is recorded on the lead and the
 * portal says so, rather than pretending.
 */

const API = 'https://buildertrend.net/apix/v2/public/ContactForm';
const PROVIDER = 'buildertrend';

/** Buildertrend's own property ids for the standard fields. */
const PROP = { leadName: 0, phone: 1, cell: 2, email: 3, street: 4, city: 5, state: 6, zip: 7, leadSource: 8, leadCategory: 9, conversionDate: 10, notes: 11, captcha: 12, suburb: 13, firstName: 14, lastName: 15 } as const;

export type FormDef = {
  builderId: number;
  recaptchaKey: string;
  formTimestamp: string;
  fields: Array<{ fieldId: number; propertyId: number | null; customFieldId: number | null; displayText: string; isRequired: boolean; fieldType: string; options: Array<{ v?: string; t?: string; value?: string; text?: string }> }>;
};

/** The token out of an embed snippet, a bare token, or a full iframe URL. */
export function tokenFromEmbed(input: string): string | null {
  const s = input.trim();
  const m = s.match(/builderID=([A-Za-z0-9._-]+)/i) ?? s.match(/ContactForm\/([A-Za-z0-9._-]+)/i);
  const token = m ? m[1] : /^[A-Za-z0-9._-]{20,}$/.test(s) ? s : null;
  return token && token.split('.').length === 3 ? token : null;
}

/** Read the form definition. Proves the token is real and tells us the fields. */
export async function readForm(token: string): Promise<{ ok: true; form: FormDef } | { ok: false; error: string }> {
  try {
    const r = await fetch(`${API}/${encodeURIComponent(token)}`, { headers: { Accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; ModernMustardSeed/1.0)' }, signal: AbortSignal.timeout(15_000) });
    if (r.status === 404) return { ok: false, error: 'Buildertrend does not recognise that form. Copy the embed code again from Lead Contact Form.' };
    if (!r.ok) return { ok: false, error: `Buildertrend answered ${r.status}.` };
    const form = (await r.json()) as FormDef;
    if (!form || typeof form.builderId !== 'number' || !Array.isArray(form.fields)) return { ok: false, error: 'Buildertrend sent back something that is not a contact form.' };
    return { ok: true, form };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Buildertrend could not be reached.' };
  }
}

export type BtStatus = { connected: boolean; builderId: number | null; captcha: boolean; error: string | null; connectedAt: string | null };

export async function buildertrendStatus(sb: SupabaseClient, clientEmail: string): Promise<BtStatus> {
  const { data } = await sb.from('client_integrations').select('status, error, meta, updated_at').eq('client_email', clientEmail).eq('provider', PROVIDER).maybeSingle();
  if (!data || data.status !== 'connected') return { connected: false, builderId: null, captcha: false, error: (data?.error as string | null) ?? null, connectedAt: null };
  const meta = (data.meta as Record<string, unknown>) ?? {};
  return { connected: true, builderId: (meta.builderId as number) ?? null, captcha: Boolean(meta.captcha), error: (data.error as string | null) ?? null, connectedAt: data.updated_at as string };
}

/** Save the connection after proving the token against Buildertrend. */
export async function connectBuildertrend(sb: SupabaseClient, clientEmail: string, embed: string, by: string): Promise<{ ok: true; builderId: number; captcha: boolean } | { ok: false; error: string }> {
  const token = tokenFromEmbed(embed);
  if (!token) return { ok: false, error: 'That does not look like a Buildertrend form. Paste the whole embed code, iframe and all.' };
  const read = await readForm(token);
  if (!read.ok) return read;
  const enc = encryptSecret(token);
  const captcha = Boolean(read.form.recaptchaKey);
  const { error } = await sb.from('client_integrations').upsert(
    {
      client_email: clientEmail,
      provider: PROVIDER,
      account_name: `Buildertrend builder ${read.form.builderId}`,
      access_ciphertext: enc.ciphertext,
      access_iv: enc.iv,
      access_tag: enc.tag,
      status: 'connected',
      error: null,
      meta: { builderId: read.form.builderId, captcha, connectedBy: by, fields: read.form.fields.map((f) => f.displayText) },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_email,provider' }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, builderId: read.form.builderId, captcha };
}

export async function disconnectBuildertrend(sb: SupabaseClient, clientEmail: string): Promise<void> {
  await sb.from('client_integrations').delete().eq('client_email', clientEmail).eq('provider', PROVIDER);
}

async function tokenFor(sb: SupabaseClient, clientEmail: string): Promise<string | null> {
  const { data } = await sb.from('client_integrations').select('access_ciphertext, access_iv, access_tag, status').eq('client_email', clientEmail).eq('provider', PROVIDER).maybeSingle();
  if (!data || data.status !== 'connected' || !data.access_ciphertext) return null;
  try {
    return decryptSecret(data.access_ciphertext as string, data.access_iv as string, data.access_tag as string);
  } catch {
    return null;
  }
}

export type LeadForCrm = {
  name: string | null;
  phone: string | null;
  email: string | null;
  town: string | null;
  project_type: string | null;
  land: string | null;
  message: string | null;
  page: string | null;
  /** The sign or ad they scanned, when the site remembered one. */
  campaign: string | null;
  source: string;
  referrer_name: string | null;
  answers: Array<{ q: string; a: string }> | null;
};

function splitName(name: string | null): { first: string; last: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: 'Website', last: 'Lead' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function notesFor(lead: LeadForCrm, via: string): string {
  const lines = [
    `Came in through the ${via} on the website${lead.page ? ` (${lead.page})` : ''}.`,
    lead.campaign ? `Scanned the QR code: ${lead.campaign}` : null,
    lead.project_type ? `Project: ${lead.project_type}` : null,
    lead.land ? `Starting point: ${lead.land}` : null,
    lead.referrer_name ? `Referred by: ${lead.referrer_name}` : null,
    lead.message ? `They said: ${lead.message}` : null,
    ...(lead.answers ?? []).map((a) => `${a.q}: ${a.a || '(blank)'}`),
    'Sent by the Modern Mustard Seed website system.',
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

/**
 * Push one lead into Buildertrend as a Lead Opportunity. Returns what
 * happened in words, never throws: the lead is already saved and notified
 * by the time this runs, so a CRM hiccup must not cost anyone the lead.
 */
export async function pushLeadToBuildertrend(sb: SupabaseClient, clientEmail: string, lead: LeadForCrm, via: string): Promise<{ ok: true; ref: string } | { ok: false; error: string; skipped?: boolean }> {
  const token = await tokenFor(sb, clientEmail);
  if (!token) return { ok: false, error: 'Buildertrend is not connected.', skipped: true };
  const read = await readForm(token);
  if (!read.ok) return { ok: false, error: read.error };
  const form = read.form;

  const { first, last } = splitName(lead.name);
  const byProp = (p: number) => form.fields.find((f) => f.propertyId === p);
  const body: Record<string, unknown> = { recaptchaToken: '', formTimestamp: form.formTimestamp, customFields: {} };
  if (byProp(PROP.leadName)) body.leadName = (lead.name ?? '').trim() || `${first} ${last}`.trim();
  if (byProp(PROP.firstName)) body.leadFirstName = first;
  if (byProp(PROP.lastName)) body.leadLastName = last || first;
  if (byProp(PROP.email) && lead.email) body.email = lead.email;
  if (byProp(PROP.phone) && lead.phone) body.phone = lead.phone;
  if (byProp(PROP.cell) && lead.phone && !byProp(PROP.phone)) body.cell = lead.phone;
  if (byProp(PROP.city) && lead.town) body.city = lead.town;
  if (byProp(PROP.suburb) && lead.town && !byProp(PROP.city)) body.suburb = lead.town;
  if (byProp(PROP.leadSource)) body.leadSource = 'Website';
  if (byProp(PROP.notes)) body.generalNotes = notesFor(lead, via);
  // A "your interests" style pick list: choose the option that names their
  // project type, otherwise leave it for a person.
  const cat = byProp(PROP.leadCategory);
  if (cat && lead.project_type) {
    const want = lead.project_type.toLowerCase();
    const opt = cat.options.find((o) => String(o.t ?? o.text ?? '').toLowerCase().includes(want.split(' ')[0]));
    if (opt) {
      body.leadCategoryId = Number(opt.v ?? opt.value) || null;
      body.leadCategoryText = String(opt.t ?? opt.text ?? '');
    }
  }
  // Required custom fields get the notes, so a required text box never blocks the hand-off.
  const custom: Record<string, string> = {};
  for (const f of form.fields) if (f.customFieldId && f.isRequired && f.fieldType === 'text') custom[String(f.customFieldId)] = lead.message ?? notesFor(lead, via).slice(0, 500);
  body.customFields = custom;

  const fd = new FormData();
  fd.append('request', JSON.stringify(body));
  try {
    const r = await fetch(`${API}/${encodeURIComponent(token)}`, { method: 'POST', headers: { Accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; ModernMustardSeed/1.0)' }, body: fd, signal: AbortSignal.timeout(20_000) });
    const text = await r.text();
    let j: { success?: boolean; message?: string; errors?: unknown } = {};
    try {
      j = JSON.parse(text) as typeof j;
    } catch {
      /* not json */
    }
    if (r.ok && j.success !== false) return { ok: true, ref: `builder ${form.builderId}, ${new Date().toISOString().slice(0, 16).replace('T', ' ')}` };
    const why = j.message || (typeof j.errors === 'string' ? j.errors : '') || text.slice(0, 200) || `HTTP ${r.status}`;
    const captcha = /captcha/i.test(why) || (form.recaptchaKey && r.status === 400);
    return { ok: false, error: captcha ? 'Buildertrend refused it because the contact form has a captcha turned on. Ask Buildertrend support to turn the captcha off for your Lead Contact Form; we screen every lead before it gets here.' : `Buildertrend said: ${why}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Buildertrend could not be reached.' };
  }
}
