/**
 * PARTNER-WIELDED FORGE: the shared mint. One code path serves both surfaces:
 *   - /api/partners/forge  (approved partner with can_forge, origin 'partner')
 *   - /api/admin/hq/forge  (internal team, origin 'rep')
 *
 * Modeled line-for-line on the Demo Station route (app/api/demo-station), the
 * proven self-serve mint. Differences, all deliberate:
 *   - Attribution: the minted lead carries affiliate_id + origin, so the demo
 *     hub renders "Presented by {Partner}" and the demo-order checkout resolves
 *     the partner's ref BEFORE the owning-rep fallback. Commissions fire on the
 *     existing recorders untouched.
 *   - Caps are PER MINTER (daily + weekly from the affiliates row) plus a
 *     global pool, all via claim_forge_slot (047), all atomic, all FAIL CLOSED.
 *     A later claim failing after an earlier claim succeeded burns a slot and
 *     never over-grants; that is the correct failure direction for spend.
 *   - Dedupe is FIRST-TOUCH-WINS against the ENTIRE dial floor (phone, website
 *     domain, name+city), not just prior self-serve signups: a partner must
 *     never hijack attribution on a lead the floor already owns. Partners get
 *     a flat "already in our pipeline" with NO lead data (floor status is
 *     private); reps get the existing lead id + hub so they can just dial it.
 *   - QA strip: a partner's first three mints are held (forge_qa 'pending');
 *     the hand-off email goes out only when an admin approves. Lifts itself
 *     at three approvals. Rep mints are never held.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { forgeLeadVoiceDemo, buildOsConfig, buildSiteBrief, ensureDemoHub } from '@/lib/outbound-demo';
import { syncLeadToPipeline } from '@/lib/outbound-pipeline';
import { recordDemoEvent } from '@/lib/demo-events';
import type { OutboundLead, Niche, ForgeOrigin } from '@/lib/outbound';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';

export const PARTNER_FORGE_GLOBAL_DAILY_CAP = 20;
export const PARTNER_FORGE_QA_LIFT = 3;

const NICHES: Niche[] = ['restaurant', 'home_service', 'dental_medspa', 'real_estate', 'other'];

/**
 * Same door-refusal posture as the Demo Station: these fields flow into the
 * brief that drives the site-build worker (headless Claude Code) and the Vapi
 * agent speaks business_name verbatim, so anything that reads like an
 * instruction is refused, not sanitized.
 */
const HOSTILE =
  /(\bignore\b|\bdisregard\b|\boverride\b|\bprompt\b|\bsystem\s*:|\bassistant\s*:|\bexfiltrat|\bcredential|\bapi[_ -]?key|\b\.env\b|\brm\s+-rf\b|\bcurl\b|\bsudo\b|\bdelete\b.{0,20}\bfile|<script|\bjavascript:|```|\n)/i;

const HOSTILE_NOTES =
  /(\bignore\b.{0,30}\b(previous|prior|above|instruction|rule|prompt)|\bdisregard\b.{0,30}\b(previous|prior|above|instruction|rule|prompt)|\bsystem\s*:|\bassistant\s*:|\bexfiltrat|\bcredential|\bapi[_ -]?key|\b\.env\b|\brm\s+-rf\b|\bsudo\b|<script|\bjavascript:|```)/i;

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function hostile(...fields: string[]): boolean {
  return fields.some((f) => HOSTILE.test(f));
}

/**
 * The website is REQUIRED on this surface (unlike the Demo Station): the whole
 * pitch of a partner mint is a suite forged from the business's real evidence.
 * A Facebook page counts. Our own properties, bare IPs, and local hosts do
 * not: the URL is handed to a headless agent with web tools.
 */
function validWebsite(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (!host.includes('.')) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host === 'localhost' || host.endsWith('.local')) return null;
  if (host.endsWith('modernmustardseed.com') || host.endsWith('.vercel.app')) return null;
  return url.toString();
}

export function isoWeekKey(d: Date): string {
  // ISO-8601 week: Thursday of the current week decides the year.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export type ForgeMinter = {
  /** affiliates.id when the minter has a partner identity; null for plain admins. */
  affiliateId: string | null;
  code: string | null;
  email: string;
  name: string;
  dailyCap: number;
  weeklyCap: number;
  qaApproved: number;
};

export type ForgeMintInput = {
  business?: unknown;
  contact?: unknown;
  phone?: unknown;
  email?: unknown;
  city?: unknown;
  state?: unknown;
  website?: unknown;
  niche?: unknown;
  notes?: unknown;
};

export type ForgeMintResult =
  | { ok: true; duplicate: false; lead: OutboundLead; qaHeld: boolean }
  | { ok: true; duplicate: true; message: string; existing?: { leadId: string; hubUrl: string | null } }
  | { ok: false; status: number; error: string; message: string };

export async function mintForgedSuite(
  supabase: SupabaseClient,
  origin: ForgeOrigin,
  minter: ForgeMinter,
  raw: ForgeMintInput
): Promise<ForgeMintResult> {
  const business = clean(raw.business, 90);
  const contact = clean(raw.contact, 80);
  const phone = clean(raw.phone, 30).replace(/[^\d+() .-]/g, '');
  const digits = phone.replace(/\D/g, '');
  const email = clean(raw.email, 120).toLowerCase();
  const city = clean(raw.city, 60);
  const state = clean(raw.state, 30).toUpperCase().slice(0, 2);
  const websiteRaw = clean(raw.website, 200);
  const notes = clean(raw.notes, 600);
  const niche = (NICHES.includes(raw.niche as Niche) ? raw.niche : 'other') as Niche;

  if (!business || !contact || digits.length < 10) {
    return {
      ok: false, status: 400, error: 'missing_fields',
      message: 'Business name, the owner\'s name, and a real phone number are required (the receptionist demo answers as their business).',
    };
  }
  const website = validWebsite(websiteRaw);
  if (!website) {
    return {
      ok: false, status: 400, error: 'missing_website',
      message: 'A real website or Facebook page URL is required: the forge builds from their actual business, not from guesses.',
    };
  }
  if (email && !/.+@.+\..+/.test(email)) {
    return { ok: false, status: 400, error: 'bad_email', message: 'That email does not look real. Leave it blank if you do not have it.' };
  }
  if (hostile(business, contact, city, websiteRaw)) {
    return { ok: false, status: 400, error: 'bad_input', message: 'That does not look like a real business name. Type it the way it appears on their sign.' };
  }
  if (notes && HOSTILE_NOTES.test(notes)) {
    return { ok: false, status: 400, error: 'bad_input', message: 'Those notes did not look like a description of a business. Plain words about what they do.' };
  }

  // FIRST-TOUCH-WINS dedupe against the whole floor. Three probes, cheapest
  // first; any hit stops the mint before a cap slot or a dollar is spent.
  // Every ilike/like pattern built from user text gets LIKE metacharacters
  // escaped first ('100% Natural Cafe' must not wildcard-match the floor),
  // and every coarse SQL net is confirmed exactly in code before a duplicate
  // is declared. (Ship-gate findings, 2026-07-14.)
  const escLike = (s: string) => s.replace(/[%_\\]/g, '\\$&');
  const last10 = digits.slice(-10);
  let host = '';
  let pathSeg = '';
  try {
    const u = new URL(website);
    host = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    pathSeg = (u.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  } catch { /* validated above */ }
  // Hosts where the PATH is the business identity: two facebook.com pages are
  // two different businesses, so hostname equality alone is not a duplicate.
  const SHARED_HOSTS = new Set(['facebook.com', 'instagram.com', 'linktr.ee', 'sites.google.com', 'yelp.com', 'business.site', 'square.site']);
  type DupeHit = { id: string; hub_demo_url: string | null } | null;
  let existing: DupeHit = null;
  {
    // Phones are stored FORMATTED ('(406) 555-0142'), so a LIKE on the bare
    // digit string misses them. The last four digits survive every common
    // format contiguously; use them as the coarse net (paged, so a true
    // duplicate past the first page cannot slip through), then compare
    // normalized digits in code. (Found by the e2e verify, 2026-07-14.)
    const PAGE = 100;
    for (let from = 0; from < 1000 && !existing; from += PAGE) {
      const { data } = await supabase
        .from('outbound_leads')
        .select('id, hub_demo_url, phone')
        .like('phone', `%${last10.slice(-4)}%`)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      const rows = data || [];
      const hit = rows.find((r) => (r.phone || '').replace(/\D/g, '').slice(-10) === last10);
      if (hit) existing = { id: hit.id, hub_demo_url: hit.hub_demo_url };
      if (rows.length < PAGE) break;
    }
  }
  if (!existing && host) {
    // Coarse net on the escaped host, then EXACT hostname equality in code;
    // shared hosts additionally require the same first path segment. An
    // unanchored substring here once collapsed every facebook.com mint into
    // one business and cross-wired rep results (ship-gate blocker).
    const { data } = await supabase
      .from('outbound_leads')
      .select('id, hub_demo_url, website')
      .ilike('website', `%${escLike(host)}%`)
      .order('created_at', { ascending: true })
      .limit(20);
    const hit = (data || []).find((r) => {
      if (!r.website) return false;
      try {
        const u = new URL(/^https?:\/\//i.test(r.website) ? r.website : `https://${r.website}`);
        const rowHost = u.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
        if (rowHost !== host) return false;
        if (!SHARED_HOSTS.has(host)) return true;
        const rowSeg = (u.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
        return Boolean(pathSeg) && rowSeg === pathSeg;
      } catch {
        return false;
      }
    });
    if (hit) existing = { id: hit.id, hub_demo_url: hit.hub_demo_url };
  }
  if (!existing && city) {
    const { data } = await supabase
      .from('outbound_leads')
      .select('id, hub_demo_url, business_name, city')
      .ilike('business_name', escLike(business))
      .ilike('city', escLike(city))
      .order('created_at', { ascending: true })
      .limit(5);
    const hit = (data || []).find(
      (r) => (r.business_name || '').trim().toLowerCase() === business.toLowerCase() && (r.city || '').trim().toLowerCase() === city.toLowerCase()
    );
    if (hit) existing = { id: hit.id, hub_demo_url: hit.hub_demo_url };
  }
  if (existing) {
    // Partners learn nothing beyond "we know them" (floor status is private).
    // Reps get the pointer so the right move is one click away.
    return origin === 'rep'
      ? { ok: true, duplicate: true, message: 'Already on the dial floor. Open the lead and work it from there.', existing: { leadId: existing.id, hubUrl: existing.hub_demo_url } }
      : { ok: true, duplicate: true, message: 'That business is already in our pipeline. Great instinct, though: pick another one you know.' };
  }

  // Caps, all atomic, all fail CLOSED (claim_forge_slot, migration 047).
  // Per-minter daily -> per-minter weekly -> global pool.
  const day = new Date().toISOString().slice(0, 10);
  const minterKey = minter.affiliateId || `rep:${minter.email}`;
  const claims: Array<{ key: string; cap: number; error: string; message: string }> = [
    { key: `partnerforge:${minterKey}:day:${day}`, cap: minter.dailyCap, error: 'daily_cap', message: `You have used all ${minter.dailyCap} of today's forges. The forge resets at midnight UTC.` },
    { key: `partnerforge:${minterKey}:week:${isoWeekKey(new Date())}`, cap: minter.weeklyCap, error: 'weekly_cap', message: `You have used all ${minter.weeklyCap} forges for this week. It resets Monday.` },
    { key: `partnermint:day:${day}`, cap: PARTNER_FORGE_GLOBAL_DAILY_CAP, error: 'capacity', message: 'The forge hit today\'s global limit. Your slot is safe tomorrow morning.' },
  ];
  for (const c of claims) {
    const { data: claimed, error: capErr } = await supabase.rpc('claim_forge_slot', { p_key: c.key, p_cap: c.cap });
    if (capErr || claimed !== true) {
      if (capErr) console.error(`partner-forge cap claim failed (${c.key}):`, capErr.message);
      return { ok: false, status: 429, error: c.error, message: c.message };
    }
  }

  const qaHeld = origin === 'partner' && minter.qaApproved < PARTNER_FORGE_QA_LIFT;
  const minterLine = origin === 'partner'
    ? `PARTNER FORGE: minted by partner ${minter.name}${minter.code ? ` (${minter.code})` : ''} for a business they personally know.`
    : `REP FORGE: pre-forged by ${minter.name} from the Partner Hub.`;

  const { data: leadRow, error: leadErr } = await supabase
    .from('outbound_leads')
    .insert({
      business_name: business,
      contact_name: contact,
      email: email || null,
      phone,
      city: city || null,
      state: state || null,
      website,
      niche,
      status: 'new',
      source: origin === 'partner' ? 'partner-forge' : 'rep-forge',
      origin,
      affiliate_id: minter.affiliateId,
      forge_qa: qaHeld ? 'pending' : null,
      notes: [minterLine, notes ? `OWNER NOTES: ${notes}` : null].filter(Boolean).join('\n'),
      next_action: origin === 'partner'
        ? 'Partner-minted warm intro: call while the demos are hot'
        : 'Pre-forged by the team: dial with the suite live',
    })
    .select('*')
    .single();
  if (leadErr || !leadRow) {
    console.error('partner-forge lead insert failed:', leadErr?.message);
    return { ok: false, status: 500, error: 'forge_failed', message: 'The forge choked on that one. Try again in a minute.' };
  }
  let lead = leadRow as OutboundLead;

  // Forge order proven by the Demo Station: voice (the OS references it),
  // OS (instant), website (queued to the worker), then the hub.
  const voice = await forgeLeadVoiceDemo(supabase, lead);
  if (voice.ok) lead = voice.lead;

  const { data: osRow } = await supabase
    .from('outbound_demo_os')
    .insert({ lead_id: lead.id, business_name: lead.business_name, config: buildOsConfig(lead) })
    .select('id')
    .single();
  if (osRow) {
    const { data: updated } = await supabase
      .from('outbound_leads')
      .update({ os_demo_id: osRow.id, os_demo_url: `${SITE.url}/demo/os/${osRow.id}`, os_demo_status: 'ready' })
      .eq('id', lead.id)
      .select('*')
      .single();
    if (updated) lead = updated as OutboundLead;
  }

  const { data: siteRow } = await supabase
    .from('outbound_demo_sites')
    .insert({
      lead_id: lead.id,
      business_name: lead.business_name,
      brief: buildSiteBrief(lead, lead.demo_url),
      status: 'queued',
      affiliate_id: minter.affiliateId,
      origin,
    })
    .select('id')
    .single();
  if (siteRow) {
    const { data: updated } = await supabase
      .from('outbound_leads')
      .update({ site_demo_id: siteRow.id, site_demo_url: `${SITE.url}/demo/site/${siteRow.id}`, site_demo_status: 'queued' })
      .eq('id', lead.id)
      .select('*')
      .single();
    if (updated) lead = updated as OutboundLead;
  }

  // The lead already exists with its demos by this point, so a hub-mint
  // failure must NOT read as "try again": a retry would dedupe against the
  // half-minted lead with a burned cap slot and no link. The mint succeeds
  // without a hub; the internal notify flags it for a human to finish.
  lead = await ensureDemoHub(supabase, lead);
  const hubMissing = !lead.hub_demo_url;
  if (hubMissing) console.error(`partner-forge: hub mint failed for lead ${lead.id}; flagged in internal notify`);

  await recordDemoEvent(supabase, {
    event: origin === 'partner' ? 'partner_mint' : 'rep_mint',
    leadId: lead.id,
    hubId: lead.hub_demo_id,
    origin,
    affiliateId: minter.affiliateId,
    meta: { qaHeld },
  });

  try {
    const synced = await syncLeadToPipeline(supabase, lead, { source: lead.source || 'partner-forge' });
    if (!synced.ok) console.error('partner-forge pipeline sync failed:', synced.error);
  } catch (err) {
    console.error('partner-forge pipeline sync threw', err);
  }

  if (process.env.RESEND_API_KEY) {
    const resend = resendClient();
    // Internal heads-up always fires (fail-soft). sarah@ is suppressed in
    // Resend, so the gmail recipient is the one that actually lands.
    try {
      await resend.emails.send({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `${origin === 'partner' ? 'PARTNER' : 'REP'} FORGE: ${business} (${minter.name}${qaHeld ? ', QA HOLD' : ''})`,
        html: clientEmail({
          preheader: `${minter.name} minted a suite for ${business}.`,
          eyebrow: 'FORGE UNDER YOUR FLAG',
          greeting: `${minter.name} just minted one.`,
          body:
            `<p><strong>${business}</strong> (${contact}, ${phone}${city ? `, ${city}` : ''}) was forged by ${minter.name} with origin <strong>${origin}</strong>.</p>` +
            (hubMissing
              ? `<p><strong>NEEDS A HAND:</strong> the demos forged but the HUB MINT FAILED (lead ${lead.id}). Open the lead in the cockpit and re-forge the hub, then send the minter their hand-off.</p>`
              : `<p>Hub: <a href="${lead.hub_demo_url}">${lead.hub_demo_url}</a></p>`) +
            (qaHeld
              ? `<p><strong>QA HOLD:</strong> this partner has ${minter.qaApproved} of ${PARTNER_FORGE_QA_LIFT} approvals. Review it on the Partner Admin QA strip; the partner gets their hand-off email when you approve.</p>`
              : hubMissing
                ? `<p>No hand-off email went out (there is no hub link yet); the minter was told the team is finishing it.</p>`
                : `<p>The hand-off email went to ${minter.email} automatically.</p>`),
          signature: 'The Forge',
        }),
      });
    } catch (err) {
      console.error('partner-forge internal notify failed', err);
    }

    if (!qaHeld && lead.hub_demo_url) {
      try {
        await sendForgeHandoffEmail(resend, { minterEmail: minter.email, minterName: minter.name, business, contact, hubUrl: lead.hub_demo_url });
      } catch (err) {
        console.error('partner-forge hand-off email failed', err);
      }
    }
  }

  return { ok: true, duplicate: false, lead, qaHeld };
}

/**
 * The hand-off: three lines the minter can forward or read out loud. Sent at
 * mint for cleared minters, or from the QA approval route once a held mint
 * clears review.
 */
export async function sendForgeHandoffEmail(
  resend: ReturnType<typeof resendClient>,
  args: { minterEmail: string; minterName: string; business: string; contact: string; hubUrl: string }
): Promise<void> {
  const first = args.minterName.split(' ')[0];
  const ownerFirst = args.contact.split(' ')[0];
  await resend.emails.send({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: args.minterEmail,
    replyTo: 'sarah@modernmustardseed.com',
    subject: `${first}, the suite you forged for ${args.business} is live`,
    html: clientEmail({
      preheader: 'Their receptionist and command center are ready now; the website lands at the same link.',
      eyebrow: 'YOUR FORGE, THEIR FLAG',
      greeting: `${first}, it is ready.`,
      body:
        `<p>The demo suite you minted for <strong>${args.business}</strong> is live at their private hub. The AI receptionist and the command center are ready right now; the custom website is designed from scratch and lands at the same link about twenty minutes in.</p>` +
        `<p>Hand it off in your own words, or use these three lines:</p>` +
        `<p style="padding:12px 16px;border-left:4px solid #F5B700;background:#FBF6EA;">` +
        `"${ownerFirst}, I had something built for ${args.business}. A team I trust makes AI receptionists and websites, and I asked them to make yours first so you could see it real, not as a pitch. It is at this link, with your name on it, and it took me two minutes: have a look before you talk to anyone."` +
        `</p>` +
        `<p>Send them the hub link below. If they buy, the commission lands on your partner ledger automatically.</p>`,
      cta: { label: `Open ${args.business}'s Demo Suite`, url: args.hubUrl },
      signature: 'Sarah',
    }),
  });
}
