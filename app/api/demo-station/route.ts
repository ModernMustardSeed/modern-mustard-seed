/**
 * THE DEMO STATION: self-serve version of the cockpit forge. A business owner
 * lands from an ad, gives us their details, and we forge their whole suite:
 * voice receptionist (instant) + business OS (instant) + website (queued to
 * the worker), fronted by their Demo Suite hub. Every signup is a lead on the
 * dial floor (source 'demo-station'), so the funnel is: ad -> station -> hub
 * -> order card, with the team following up on anyone who stalls.
 *
 * Never-leak guards (fail CLOSED):
 *   - ATOMIC global daily cap (claim_forge_slot RPC, migration 047): the check
 *     and the increment happen in one statement, so a burst of parallel
 *     requests cannot all read the same count and slip through. Every forge
 *     costs a real Vapi run plus a website build on the worker, so this is the
 *     spend guard that matters. Any error here = no forge.
 *   - best-effort per-instance IP throttle (3/hr) + honeypot field. Both are
 *     soft (serverless instances do not share the map, and the client IP is
 *     only as trustworthy as the proxy chain), which is exactly why the cap
 *     above is the real ceiling.
 *   - returning-business dedupe requires BOTH the phone and the email to match
 *     a previous SELF-SERVE signup. A phone number alone is public information,
 *     so matching on it alone would hand a stranger someone else's private hub
 *     (their business, contact, and demos). Never do that.
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { forgeLeadVoiceDemo, buildOsConfig, buildSiteBrief, ensureDemoHub } from '@/lib/outbound-demo';
import type { OutboundLead, Niche } from '@/lib/outbound';
import { resendClient } from '@/lib/send-email';
import { clientEmail } from '@/lib/email';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DAILY_CAP = 40;
const NICHES: Niche[] = ['restaurant', 'home_service', 'dental_medspa', 'real_estate', 'other'];

// Per-instance IP throttle (house pattern from /api/front-desk).
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 3600_000;
  const list = (hits.get(ip) || []).filter((t) => t > windowStart);
  if (list.length >= 3) return true;
  list.push(now);
  hits.set(ip, list);
  return false;
}

function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

/**
 * A business name is a business name. These fields flow into the brief that
 * drives the site-build worker (headless Claude Code with a filesystem), so
 * rather than sanitize an attack into something merely inert, refuse it at the
 * door: nothing here should ever read like an instruction, a prompt, a command,
 * or a code fence. lib/outbound-demo.ts sanitizes again downstream (belt and
 * suspenders, since cockpit-entered leads share that path).
 */
const HOSTILE =
  /(\bignore\b|\bdisregard\b|\boverride\b|\bprompt\b|\bsystem\s*:|\bassistant\s*:|\bexfiltrat|\bcredential|\bapi[_ -]?key|\b\.env\b|\brm\s+-rf\b|\bcurl\b|\bsudo\b|\bdelete\b.{0,20}\bfile|<script|\bjavascript:|```|\n)/i;

function hostile(...fields: string[]): boolean {
  return fields.some((f) => HOSTILE.test(f));
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  // Honeypot: bots fill everything.
  if (clean(body.company_url, 10)) return NextResponse.json({ ok: true, url: SITE.url });

  const business = clean(body.business, 90);
  const name = clean(body.name, 80);
  const email = clean(body.email, 120).toLowerCase();
  const phone = clean(body.phone, 30).replace(/[^\d+() .-]/g, '');
  const digits = phone.replace(/\D/g, '');
  const city = clean(body.city, 60);
  const state = clean(body.state, 30).toUpperCase().slice(0, 2);
  const website = clean(body.website, 200);
  const niche = (NICHES.includes(body.niche as Niche) ? body.niche : 'other') as Niche;

  if (!business || !name || !/.+@.+\..+/.test(email) || digits.length < 10) {
    return NextResponse.json({ error: 'missing_fields', message: 'Business, your name, a real email, and a real phone number are required (the receptionist demo answers as your business).' }, { status: 400 });
  }
  if (hostile(business, name, city, website)) {
    return NextResponse.json(
      { error: 'bad_input', message: 'That does not look like a real business name. Type it the way it appears on your sign, or call us at (406) 312-1223.' },
      { status: 400 }
    );
  }

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (throttled(ip)) {
    return NextResponse.json({ error: 'slow_down', message: 'Easy there. Give it an hour or call us: (406) 312-1223.' }, { status: 429 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  // Returning business: hand back their existing suite, zero new spend. Both
  // the phone AND the email must match, and only a previous SELF-SERVE signup
  // qualifies. Phone-only matching would turn this route into a lookup service
  // for other people's private hubs (a phone number is public; the pairing with
  // the email is not, and cockpit-sourced prospects never came here at all).
  const { data: existing } = await supabase
    .from('outbound_leads')
    .select('hub_demo_url')
    .eq('source', 'demo-station')
    .eq('email', email)
    .like('phone', `%${digits.slice(-10)}%`)
    .limit(1)
    .maybeSingle();
  if (existing?.hub_demo_url) {
    return NextResponse.json({ ok: true, url: existing.hub_demo_url, returning: true });
  }

  // Global daily cap, ATOMIC and fail CLOSED: one statement checks and claims
  // the slot (migration 047), so a parallel burst cannot all pass the check.
  const capMessage = 'The forge hit today\'s limit. Come back tomorrow morning, or call (406) 312-1223 and we will save your spot.';
  const { data: claimed, error: capErr } = await supabase.rpc('claim_forge_slot', {
    p_key: `demostation:day:${new Date().toISOString().slice(0, 10)}`,
    p_cap: DAILY_CAP,
  });
  if (capErr || claimed !== true) {
    if (capErr) console.error('demo-station cap claim failed:', capErr.message);
    return NextResponse.json({ error: 'capacity', message: capMessage }, { status: 503 });
  }

  // The lead: this is the funnel's spine. source 'demo-station' marks it
  // self-serve; unassigned, so the whole floor sees it in the queue.
  const { data: leadRow, error: leadErr } = await supabase
    .from('outbound_leads')
    .insert({
      business_name: business,
      contact_name: name,
      email,
      phone,
      city: city || null,
      state: state || null,
      website: website || null,
      niche,
      status: 'new',
      source: 'demo-station',
      notes: `SELF-SERVE: forged their own demo suite from ${SITE.url}/demos.${website ? '' : '\nWEBSITE: none — they came without one.'}`,
      next_action: 'Self-serve signup: call while the demos are hot',
    })
    .select('*')
    .single();
  if (leadErr || !leadRow) {
    console.error('demo-station lead insert failed:', leadErr?.message);
    return NextResponse.json({ error: 'forge_failed' }, { status: 500 });
  }
  let lead = leadRow as OutboundLead;

  // Forge the instant pair. Voice first (the OS references it), OS second.
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

  // Queue the website build for the worker.
  const { data: siteRow } = await supabase
    .from('outbound_demo_sites')
    .insert({ lead_id: lead.id, business_name: lead.business_name, brief: buildSiteBrief(lead, lead.demo_url), status: 'queued' })
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

  lead = await ensureDemoHub(supabase, lead);
  if (!lead.hub_demo_url) {
    return NextResponse.json({ error: 'forge_failed' }, { status: 500 });
  }

  // Their return path + our heads-up.
  if (process.env.RESEND_API_KEY) {
    const resend = resendClient();
    const first = name.split(' ')[0];
    try {
      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${first}, ${business}'s demos are being forged right now`,
        html: clientEmail({
          preheader: 'Your receptionist and command center are ready now; the website lands within the hour.',
          eyebrow: 'YOUR DEMO SUITE',
          greeting: `${first}, it is happening.`,
          body: `<p>Your AI receptionist and your command center are <strong>ready right now</strong>, and a designer is building ${business} a complete demo website as you read this (usually within the hour).</p><p>Everything lives at your private hub. Bookmark it; the website appears there on its own when it is done.</p>`,
          cta: { label: 'Open your Demo Suite', url: lead.hub_demo_url },
          signature: 'Sarah',
        }),
      });
    } catch (err) {
      console.error('demo-station welcome email failed', err);
    }
    try {
      await resend.emails.send({
        from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
        to: ['sarah@modernmustardseed.com', 'makeourcitypretty@gmail.com'],
        subject: `SELF-SERVE FORGE: ${business} (${city || state || 'unknown'})`,
        html: clientEmail({
          preheader: 'Someone forged their own suite from an ad.',
          eyebrow: 'DEMO STATION',
          greeting: 'The station caught one.',
          body: `<p><strong>${business}</strong> (${name}, ${email}, ${phone}) forged their own suite from /demos.</p><p>They are on the dial floor unassigned, source demo-station, with "call while the demos are hot" as the next action. Hub: <a href="${lead.hub_demo_url}">${lead.hub_demo_url}</a></p>`,
          signature: 'The Demo Station',
        }),
      });
    } catch (err) {
      console.error('demo-station notify failed', err);
    }
  }

  return NextResponse.json({ ok: true, url: lead.hub_demo_url });
}
