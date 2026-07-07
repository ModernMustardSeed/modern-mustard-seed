/**
 * Cold-text campaign engine. A campaign freezes a personalized message per lead
 * at build time, then a drainer sends them in carrier-friendly batches with the
 * full compliance screen (opt-out, do-not-text, valid mobile, quiet hours, and
 * optional landline filtering). Stats are recomputed from the recipients table so
 * they are always accurate.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveAdminUser } from '@/lib/admin-auth';
import { buildLeadText } from '@/lib/lead-text';
import { normalizePhone, withinQuietHours, lineType, sendSms } from '@/lib/sms';
import type { Prospect } from '@/lib/prospects';

const BOOK_URL = 'modernmustardseed.com/book';

export type Audience = {
  rep_email?: string;        // limit to one rep, or omit for everyone
  city?: string;
  statuses?: string[];       // default: leads not yet won/lost
  auditedOnly?: boolean;     // only leads with a website audit
  source?: string;
  limit?: number;
};

export type CampaignStats = {
  total: number; queued: number; sent: number; delivered: number;
  failed: number; replied: number; opted_out: number; skipped: number;
};

/** The lead columns a campaign build reads. */
type RepRow = Pick<Prospect, 'id' | 'business' | 'city' | 'notes' | 'phone' | 'website' | 'audit_json' | 'audit_score' | 'status' | 'rep_email' | 'email'> & { do_not_text: boolean | null };

/**
 * Shallow view of the supabase filter builder. supabase-js parses the long
 * select-string literal into a type that explodes (TS2589) once it is chained
 * through several conditional filters; this keeps the build fast and the rest of
 * the file fully typed. It is thenable, so it can be awaited directly.
 */
type LeadQuery = PromiseLike<{ data: RepRow[] | null }> & {
  eq(col: string, val: unknown): LeadQuery;
  in(col: string, vals: unknown[]): LeadQuery;
  not(col: string, op: string, val: unknown): LeadQuery;
  limit(n: number): LeadQuery;
};

/** Build (or rebuild) the recipient set for a campaign. Returns how it screened. */
export async function buildRecipients(
  sb: SupabaseClient,
  campaign: { id: string; created_by: string | null; template_key: string | null; custom_template: string | null; audience: Audience | null }
): Promise<{ queued: number; skipped: number; total: number }> {
  const aud = campaign.audience || {};
  const senderName = campaign.created_by ? resolveAdminUser(campaign.created_by).name : 'Sarah';

  let q = sb.from('rep_prospects')
    .select('id,business,city,notes,phone,website,audit_json,audit_score,do_not_text,status,rep_email,email')
    .not('phone', 'is', null) as unknown as LeadQuery;
  if (aud.rep_email) q = q.eq('rep_email', aud.rep_email);
  if (aud.city) q = q.eq('city', aud.city);
  if (aud.statuses && aud.statuses.length) q = q.in('status', aud.statuses);
  else q = q.not('status', 'in', '(won,not-interested)');
  if (aud.auditedOnly) q = q.not('audit_score', 'is', null);
  q = q.limit(Math.min(aud.limit || 2000, 5000));
  const { data: leads } = await q;

  // Pull the global opt-out list once to screen against it.
  const { data: optOuts } = await sb.from('sms_opt_outs').select('phone');
  const suppressed = new Set((optOuts || []).map((o) => o.phone as string));

  const seen = new Set<string>();
  const rows: { campaign_id: string; prospect_id: string; business: string; phone: string; body: string; status: string; error: string | null }[] = [];
  let skippedNoPhone = 0;

  for (const p of leads || []) {
    const phone = normalizePhone(p.phone);
    if (!phone) { skippedNoPhone++; continue; }
    if (seen.has(phone)) continue;             // dedupe within the campaign
    seen.add(phone);

    const custom = campaign.custom_template?.trim();
    const body = custom
      ? renderTemplate(custom, p, senderName)
      : buildLeadText(p, senderName, BOOK_URL, { includeOptOut: true }).body;

    const blocked = p.do_not_text ? 'do-not-text' : suppressed.has(phone) ? 'opted-out' : null;
    rows.push({
      campaign_id: campaign.id,
      prospect_id: p.id,
      business: p.business,
      phone,
      body,
      status: blocked ? 'skipped' : 'queued',
      error: blocked,
    });
  }

  if (rows.length) {
    // Upsert so a rebuild is idempotent (unique on campaign_id, phone).
    await sb.from('sms_campaign_recipients').upsert(rows, { onConflict: 'campaign_id,phone', ignoreDuplicates: true });
  }

  const queued = rows.filter((r) => r.status === 'queued').length;
  const skipped = rows.filter((r) => r.status === 'skipped').length + skippedNoPhone;
  await sb.from('sms_campaigns').update({ total: rows.length, queued, skipped, status: 'ready' }).eq('id', campaign.id);
  return { queued, skipped, total: rows.length };
}

function renderTemplate(tpl: string, p: RepRow, sender: string): string {
  return tpl
    .replace(/\{\{\s*business\s*\}\}/gi, p.business)
    .replace(/\{\{\s*city\s*\}\}/gi, p.city || 'town')
    .replace(/\{\{\s*sender\s*\}\}/gi, sender.split(' ')[0])
    .replace(/\{\{\s*score\s*\}\}/gi, p.audit_score != null ? String(p.audit_score) : '')
    .replace(/\{\{\s*book\s*\}\}/gi, BOOK_URL);
}

/** Live stats, recomputed from the recipients table. */
export async function computeStats(sb: SupabaseClient, campaignId: string): Promise<CampaignStats> {
  const { data } = await sb.from('sms_campaign_recipients').select('status').eq('campaign_id', campaignId);
  const s: CampaignStats = { total: 0, queued: 0, sent: 0, delivered: 0, failed: 0, replied: 0, opted_out: 0, skipped: 0 };
  for (const r of data || []) {
    s.total++;
    const k = String(r.status).replace('-', '_') as keyof CampaignStats;
    if (k in s) (s[k] as number)++;
  }
  return s;
}

/** Persist a fresh stats snapshot onto the campaign row. */
export async function snapshotStats(sb: SupabaseClient, campaignId: string): Promise<CampaignStats> {
  const s = await computeStats(sb, campaignId);
  await sb.from('sms_campaigns').update(s).eq('id', campaignId);
  return s;
}

/**
 * Send the next batch of a sending campaign. Screens each recipient at send time
 * (opt-out + quiet hours + optional landline check), logs the text on the lead's
 * conversation, and stamps the lead. Returns how many were sent this pass.
 */
export async function drainBatch(
  sb: SupabaseClient,
  campaign: { id: string; quiet_hours: boolean; verify_mobile: boolean; throttle_per_min: number },
  batchSize: number
): Promise<{ sent: number; remaining: number; done: boolean }> {
  const { data: queued } = await sb
    .from('sms_campaign_recipients')
    .select('id,prospect_id,phone,body,status')
    .eq('campaign_id', campaign.id)
    .eq('status', 'queued')
    .order('updated_at', { ascending: true })
    .limit(batchSize);

  // Re-screen the opt-out list right before sending (someone may have STOP'd).
  const { data: optOuts } = await sb.from('sms_opt_outs').select('phone');
  const suppressed = new Set((optOuts || []).map((o) => o.phone as string));

  let sent = 0;
  for (const r of queued || []) {
    const now = new Date().toISOString();
    if (suppressed.has(r.phone)) {
      await sb.from('sms_campaign_recipients').update({ status: 'opted_out', error: 'opted-out', updated_at: now }).eq('id', r.id);
      continue;
    }
    if (campaign.quiet_hours && !withinQuietHours(r.phone)) {
      continue; // leave queued; the next drain pass in-window will pick it up
    }
    if (campaign.verify_mobile) {
      const lt = await lineType(r.phone);
      if (lt === 'landline') {
        await sb.from('sms_campaign_recipients').update({ status: 'skipped', error: 'landline', updated_at: now }).eq('id', r.id);
        continue;
      }
    }

    const res = await sendSms(r.phone, r.body);
    if (res.ok) {
      await sb.from('sms_campaign_recipients').update({ status: 'sent', provider_sid: res.sid || null, error: null, sent_at: now, updated_at: now }).eq('id', r.id);
      if (r.prospect_id) {
        await sb.from('messages').insert({
          prospect_id: r.prospect_id, direction: 'outbound', channel: 'sms',
          from_addr: process.env.TWILIO_SMS_FROM || 'MMS', to_addr: r.phone,
          body: r.body, snippet: r.body.slice(0, 500), status: res.status || 'sent',
          provider_sid: res.sid || null, read: true, occurred_at: now,
        });
        await sb.from('rep_prospects').update({ last_sms_at: now }).eq('id', r.prospect_id);
      }
      sent++;
    } else {
      await sb.from('sms_campaign_recipients').update({ status: 'failed', error: (res.error || 'send failed').slice(0, 300), updated_at: now }).eq('id', r.id);
    }
  }

  const { count: remaining } = await sb
    .from('sms_campaign_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaign.id)
    .eq('status', 'queued');
  const done = (remaining ?? 0) === 0;
  await snapshotStats(sb, campaign.id);
  if (done) await sb.from('sms_campaigns').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', campaign.id);
  return { sent, remaining: remaining ?? 0, done };
}
