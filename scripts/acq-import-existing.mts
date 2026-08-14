/**
 * BRING THE PROSPECTS WE ALREADY HAVE INTO THE CAMPAIGN.
 *
 *   npx tsx scripts/acq-import-existing.mts            # do it
 *   npx tsx scripts/acq-import-existing.mts --dry      # say what it would do
 *   npx tsx scripts/acq-import-existing.mts --no-queue # enroll without queueing
 *
 * Sarah already has thousands of prospects across three tables that grew at
 * different times. This does five things to them, in order, and never a sixth:
 *
 *   1. NORMALIZE  every row gets its dedupe keys, so the Lead Finder can never
 *                 re-source a business we already hold.
 *   2. CLASSIFY   trade is read off the business name and the notes, using the
 *                 same strict test the Lead Finder uses, so a bar never becomes
 *                 an HVAC lead.
 *   3. MERGE      rep_prospects and harvest_prospects rows that are NOT already
 *                 in outbound_leads are folded in as real prospects. Anything
 *                 that matches an existing business is left alone.
 *   4. SCORE      every row gets a lead score with its reasons attached.
 *   5. QUALIFY    eligibility is evaluated and written with a plain-English
 *                 reason, and the eligible ones get email one queued.
 *
 * It never emails anybody. It never un-suppresses anybody. Running it twice
 * changes nothing the second time.
 */
import { readFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const { keysFor, buildDedupeIndex, checkDuplicate, claim, emailKey } = await import('../lib/acq/dedupe');
const { scoreLead } = await import('../lib/acq/score');
const { evaluate } = await import('../lib/acq/eligibility');
const { matchesTrade } = await import('../lib/acq/source');
const { CAMPAIGN_SLUG } = await import('../lib/acq/types');
const { idempotencyKey } = await import('../lib/acq/queue');

type Trade = 'hvac' | 'plumbing' | 'roofing' | 'other';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry');
const NO_QUEUE = argv.includes('--no-queue');

const db: SupabaseClient = createClient(
  process.env.SUPABASE_URL || process.env.supabase_url!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function page<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** The same strict test the Lead Finder uses, applied to what we already hold. */
function classify(name: string, notes: string | null, niche: string | null): Trade {
  const haystack = `${name} ${notes ?? ''}`;
  for (const t of ['hvac', 'plumbing', 'roofing'] as const) {
    if (matchesTrade(name, t)) return t;
  }
  // The notes carry the sourcing label ("HVAC trade", "Roofing trade"), which is
  // weaker evidence than the name but better than nothing.
  for (const t of ['hvac', 'plumbing', 'roofing'] as const) {
    if (matchesTrade(haystack, t)) return t;
  }
  void niche;
  return 'other';
}

type Lead = Record<string, unknown> & {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  niche: string | null;
  notes: string | null;
  trade: string | null;
  rating: number | null;
  review_count: number | null;
  hours: Record<string, string> | null;
  open_24_7: boolean;
  emergency_service: boolean;
  email_status: string | null;
  lead_score: number | null;
  acq_eligible: boolean;
  is_test: boolean;
  status: string;
  dnc_checked: boolean;
  unsubscribed_at: string | null;
  bounced: boolean;
  client_status: string | null;
  duplicate_of: string | null;
  acq_stage: string;
  email_stage: number;
  imported_at: string | null;
  acq_campaign_id: string | null;
  consent_status: string | null;
  reply_at: string | null;
};

async function main() {
  console.log(`\nIMPORT EXISTING PROSPECTS${DRY ? ' (dry run)' : ''}\n`);

  const { data: campaign } = await db.from('acq_campaigns').select('id').eq('slug', CAMPAIGN_SLUG).maybeSingle();
  const campaignId = (campaign?.id as string) ?? null;
  if (!campaignId) throw new Error('No MEET MR. MUSTARD campaign row. Apply migration 094.');

  const { data: settingsRow } = await db.from('acq_settings').select('min_lead_score').eq('id', true).maybeSingle();
  const minLeadScore = Number(settingsRow?.min_lead_score ?? 40);

  /* ── the suppression truth, read once and never widened ── */
  const suppressed = new Set<string>();
  const [optOuts, bounces, clients] = await Promise.all([
    db.from('suppression').select('contact'),
    db.from('email_suppressions').select('email,resolved'),
    db.from('clients').select('email'),
  ]);
  if (optOuts.error || bounces.error) throw new Error('The suppression lists could not be read. Refusing to import.');
  for (const r of optOuts.data ?? []) {
    const k = emailKey((r as { contact: string }).contact);
    if (k) suppressed.add(k);
  }
  for (const r of (bounces.data ?? []) as { email: string; resolved: boolean }[]) {
    if (!r.resolved) {
      const k = emailKey(r.email);
      if (k) suppressed.add(k);
    }
  }
  const clientEmails = new Set<string>();
  for (const r of (clients.data ?? []) as { email: string | null }[]) {
    const k = emailKey(r.email);
    if (k) {
      suppressed.add(k);
      clientEmails.add(k);
    }
  }
  console.log(`Suppressed or client addresses that will never be mailed: ${suppressed.size}`);

  /* ── 1 to 5, over the existing outbound CRM ── */

  const leads = await page<Lead>('outbound_leads', '*');
  console.log(`outbound_leads: ${leads.length}`);

  const stats = { normalized: 0, classified: 0, scored: 0, eligible: 0, held: 0, queued: 0, byTrade: {} as Record<string, number>, reasons: {} as Record<string, number> };
  const updates: Record<string, unknown>[] = [];
  const queueRows: Record<string, unknown>[] = [];

  for (const lead of leads) {
    const keys = keysFor(lead);
    const trade = (lead.trade as Trade | null) ?? classify(lead.business_name, lead.notes, lead.niche);
    const scored = scoreLead({
      business_name: lead.business_name,
      trade,
      website: lead.website,
      email: lead.email,
      email_status: lead.email_status ?? inferEmailStatus(lead),
      phone: lead.phone,
      rating: lead.rating,
      review_count: lead.review_count,
      hours: lead.hours,
      open_24_7: lead.open_24_7,
      emergency_service: lead.emergency_service,
      city: lead.city,
      state: lead.state,
      blurb: lead.notes ?? '',
    });

    const patch: Record<string, unknown> = {
      id: lead.id,
      // Upsert takes the INSERT path through PostgREST, so every NOT NULL column
      // has to ride along even though this only ever updates an existing row.
      // They are echoed back unchanged.
      business_name: lead.business_name,
      phone: lead.phone,
      niche: lead.niche ?? 'other',
      status: lead.status,
      dnc_checked: lead.dnc_checked,
      ...keys,
      trade,
      email_status: lead.email_status ?? inferEmailStatus(lead),
      email_confidence: lead.email_status ? undefined : inferConfidence(lead),
      lead_score: scored.score,
      call_volume_score: scored.callVolume,
      missed_call_score: scored.missedCall,
      score_reasons: scored.reasons,
      priority: scored.priority,
      imported_at: lead.imported_at ?? lead.created_at ?? new Date().toISOString(),
      client_status: lead.client_status ?? (clientEmails.has(emailKey(lead.email)) ? 'client' : null),
    };
    for (const k of Object.keys(patch)) if (patch[k] === undefined) delete patch[k];

    const proposed = { ...lead, ...patch } as unknown as Parameters<typeof evaluate>[0];
    const verdict = evaluate(proposed, { suppressed, minLeadScore });

    patch.acq_eligible = verdict.eligible;
    patch.acq_ineligible_reason = verdict.eligible ? null : verdict.reason;
    if (verdict.eligible) {
      patch.acq_campaign_id = lead.acq_campaign_id ?? campaignId;
      stats.eligible++;
      stats.byTrade[trade] = (stats.byTrade[trade] ?? 0) + 1;
      if (!NO_QUEUE && (lead.email_stage ?? 0) === 0 && lead.acq_stage !== 'client') {
        queueRows.push({
          campaign_id: campaignId,
          lead_id: lead.id,
          kind: 'email',
          step: 1,
          idempotency_key: idempotencyKey('email', lead.id, 1),
        });
      }
    } else {
      stats.held++;
      stats.reasons[verdict.reason] = (stats.reasons[verdict.reason] ?? 0) + 1;
    }

    stats.normalized++;
    stats.classified++;
    stats.scored++;
    updates.push(patch);
  }

  if (!DRY) {
    console.log(`Writing ${updates.length} prospect updates...`);
    for (let i = 0; i < updates.length; i += 500) {
      const batch = updates.slice(i, i + 500);
      const { error } = await db.from('outbound_leads').upsert(batch, { onConflict: 'id' });
      if (error) throw new Error(`update batch ${i}: ${error.message}`);
      process.stdout.write(`  ${Math.min(i + 500, updates.length)}/${updates.length}\r`);
    }
    console.log('');
  }

  /* ── fold in the rep tracker and the harvest table ── */

  const index = await buildDedupeIndex(db);
  const merged = { rep: 0, harvest: 0, skipped: 0 };
  const inserts: Record<string, unknown>[] = [];

  type Rep = { business: string | null; city: string | null; phone: string | null; website: string | null; email: string | null; notes: string | null; do_not_call: boolean | null };
  for (const r of await page<Rep>('rep_prospects', 'business,city,phone,website,email,notes,do_not_call')) {
    if (!r.business || !r.phone) { merged.skipped++; continue; }
    const keys = keysFor({ business_name: r.business, city: r.city, website: r.website, phone: r.phone, email: r.email });
    if (checkDuplicate(index, keys).duplicate) { merged.skipped++; continue; }
    const trade = classify(r.business, r.notes, null);
    if (trade === 'other') { merged.skipped++; continue; }
    claim(index, keys);
    inserts.push(buildInsert({ business_name: r.business, city: r.city, state: null, phone: r.phone, website: r.website, email: r.email, notes: r.notes, trade, source: 'rep-tracker', dnc: Boolean(r.do_not_call) }, keys, campaignId));
    merged.rep++;
  }

  type Harvest = { name: string | null; city: string | null; phone: string | null; website: string | null; email: string | null; address: string | null; rating: number | null; review_count: number | null; category: string | null; notes: string | null };
  for (const h of await page<Harvest>('harvest_prospects', 'name,city:geo,phone,website,email,address,rating,review_count,category,notes')) {
    if (!h.name || !h.phone) { merged.skipped++; continue; }
    const keys = keysFor({ business_name: h.name, city: h.city, website: h.website, phone: h.phone, email: h.email });
    if (checkDuplicate(index, keys).duplicate) { merged.skipped++; continue; }
    const trade = classify(h.name, `${h.category ?? ''} ${h.notes ?? ''}`, null);
    if (trade === 'other') { merged.skipped++; continue; }
    claim(index, keys);
    inserts.push(
      buildInsert(
        { business_name: h.name, city: h.city, state: null, phone: h.phone, website: h.website, email: h.email, notes: h.notes, trade, source: 'harvest', rating: h.rating, review_count: h.review_count, address: h.address },
        keys,
        campaignId,
      ),
    );
    merged.harvest++;
  }

  if (inserts.length && !DRY) {
    for (let i = 0; i < inserts.length; i += 250) {
      const { error } = await db.from('outbound_leads').insert(inserts.slice(i, i + 250));
      if (error) console.warn(`  ! merge insert batch ${i}: ${error.message}`);
    }
  }

  /* ── queue email one, exactly once each ── */

  if (queueRows.length && !DRY) {
    for (let i = 0; i < queueRows.length; i += 500) {
      const { error } = await db
        .from('acq_queue')
        .upsert(queueRows.slice(i, i + 500), { onConflict: 'idempotency_key', ignoreDuplicates: true });
      if (error) console.warn(`  ! queue batch ${i}: ${error.message}`);
    }
    const { count } = await db.from('acq_queue').select('id', { count: 'exact', head: true }).eq('kind', 'email').eq('status', 'pending');
    stats.queued = count ?? 0;
  }

  console.log('\n─── RESULT ───');
  console.log(`  normalized and scored: ${stats.scored}`);
  console.log(`  campaign eligible:     ${stats.eligible}`);
  console.log(`  held back:             ${stats.held}`);
  console.log(`  by trade:              ${JSON.stringify(stats.byTrade)}`);
  console.log(`  merged from rep tracker:      ${merged.rep}`);
  console.log(`  merged from harvest:          ${merged.harvest}`);
  console.log(`  left alone (dupe or off-trade): ${merged.skipped}`);
  console.log(`  first emails pending in the queue: ${stats.queued}`);
  console.log('\n  why the rest are held:');
  for (const [reason, n] of Object.entries(stats.reasons).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(5)}  ${reason}`);
  }
  console.log(DRY ? '\n(dry run: nothing was written)\n' : '\nDone.\n');
}

/** A row that came in before email grading existed still deserves an honest label. */
function inferEmailStatus(lead: { email: string | null }): string {
  const e = emailKey(lead.email);
  if (!e) return 'unknown';
  // It was collected off a real business page by an earlier sourcing script, so
  // "publicly listed" is the honest description. It is mailable, and a bounce
  // will demote it the first time it fails.
  return 'public';
}

function inferConfidence(lead: { email: string | null }): number {
  return emailKey(lead.email) ? 45 : 0;
}

function buildInsert(
  src: { business_name: string; city: string | null; state: string | null; phone: string; website: string | null; email: string | null; notes: string | null; trade: Trade; source: string; dnc?: boolean; rating?: number | null; review_count?: number | null; address?: string | null },
  keys: Record<string, unknown>,
  campaignId: string,
): Record<string, unknown> {
  const scored = scoreLead({
    business_name: src.business_name,
    trade: src.trade,
    website: src.website,
    email: src.email,
    email_status: src.email ? 'public' : 'unknown',
    phone: src.phone,
    rating: src.rating ?? null,
    review_count: src.review_count ?? null,
    city: src.city,
    state: src.state,
    blurb: src.notes ?? '',
  });
  return {
    business_name: src.business_name.slice(0, 200),
    phone: src.phone.slice(0, 40),
    email: src.email,
    website: src.website,
    city: src.city,
    state: src.state,
    address: src.address ?? null,
    niche: 'home_service',
    trade: src.trade,
    rating: src.rating ?? null,
    review_count: src.review_count ?? null,
    email_status: src.email ? 'public' : 'unknown',
    email_confidence: src.email ? 45 : 0,
    email_source: src.source,
    lead_score: scored.score,
    call_volume_score: scored.callVolume,
    missed_call_score: scored.missedCall,
    score_reasons: scored.reasons,
    priority: scored.priority,
    status: src.dnc ? 'dnc' : 'new',
    dnc_checked: Boolean(src.dnc),
    source: `merged:${src.source}`,
    acq_campaign_id: campaignId,
    acq_stage: 'prospect',
    imported_at: new Date().toISOString(),
    notes: [`MERGED INTO ACQUISITION from ${src.source}.`, src.notes].filter(Boolean).join('\n').slice(0, 6000),
    ...keys,
  };
}

await main();
