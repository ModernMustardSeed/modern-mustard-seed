/**
 * THE DEMO STATION: self-serve version of the cockpit forge. A business owner
 * lands from an ad, gives us their details, and we forge their whole suite:
 * voice receptionist (instant) + business OS (instant) + website (queued to
 * the worker), fronted by their Demo Suite hub. Every signup is a lead on the
 * dial floor (source 'demo-station'), so the funnel is: ad -> station -> hub
 * -> order card, with the team following up on anyone who stalls.
 *
 * Never-leak guards (fail CLOSED):
 *   - per-instance IP throttle (3/hr) + honeypot field
 *   - global daily cap on signups via app_state (site builds are the scarce
 *     resource: the worker builds them one at a time on the Max plan)
 *   - phone dedupe: a returning business gets its EXISTING hub back, no new
 *     forge spend
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

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (throttled(ip)) {
    return NextResponse.json({ error: 'slow_down', message: 'Easy there. Give it an hour or call us: (406) 312-1223.' }, { status: 429 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  // Returning business: hand back the existing suite, zero new spend.
  const { data: existing } = await supabase
    .from('outbound_leads')
    .select('*')
    .like('phone', `%${digits.slice(-10)}%`)
    .limit(1)
    .maybeSingle();
  if (existing?.hub_demo_url) {
    return NextResponse.json({ ok: true, url: existing.hub_demo_url, returning: true });
  }

  // Global daily cap, fail CLOSED: any error counting = no forge.
  const dayKey = `demostation:day:${new Date().toISOString().slice(0, 10)}`;
  const { data: capRow, error: capReadErr } = await supabase.from('app_state').select('value').eq('key', dayKey).maybeSingle();
  if (capReadErr) return NextResponse.json({ error: 'capacity', message: 'The forge is at capacity today. Leave your number at (406) 312-1223 and we will build yours by hand.' }, { status: 503 });
  const used = Number((capRow?.value as { n?: number } | null)?.n ?? 0);
  if (used >= DAILY_CAP) {
    return NextResponse.json({ error: 'capacity', message: 'The forge hit today\'s limit. Come back tomorrow morning, or call (406) 312-1223 and we will save your spot.' }, { status: 503 });
  }
  const { error: capWriteErr } = capRow
    ? await supabase.from('app_state').update({ value: { n: used + 1 } }).eq('key', dayKey)
    : await supabase.from('app_state').insert({ key: dayKey, value: { n: 1 } });
  if (capWriteErr) return NextResponse.json({ error: 'capacity' }, { status: 503 });

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
