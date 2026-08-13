/**
 * MR. MUSTARD FORGES A DEMO SUITE LIVE ON A CALL.
 *
 * Sarah 2026-08-07: "i want him to offer to actually forge a demo for the
 * client, get all of their info and then have it built, suite, video and all,
 * and emailed to them... hes my ultimate sdr and right hand."
 *
 * This walks the same door as the public Demo Station (/api/demo-station):
 * lead on the dial floor, instant voice + command center demos, website queued
 * to the worker (which cuts the suite film and fires the armed suite-ready
 * email when it banks), hub, CRM sync, welcome email. Two differences, both
 * deliberate:
 *
 *   1. IT ANSWERS VAPI FAST. A tool that blocks for 15 seconds is dead air on
 *      a live phone call, so everything slow (Vapi voice forge, site queue,
 *      hub, emails) runs in `after()` once the response is on the wire. The
 *      caller hears the promise immediately; the forge keeps working.
 *   2. HIS OWN SPEND CAP, fail closed: `mrmustard:day:<date>`, 12 suites/day
 *      through the atomic claim_forge_slot RPC. A phone line that can spawn
 *      builds is a wallet with a public number, so the ceiling is not optional
 *      (never-leak-revenue).
 *
 * The "within the hour" promise is honest because the worker's own contract is
 * ~20-40 minutes per build and the suite-ready email is armed; if the worker
 * floor is down the lead still lands on the dial floor flagged for follow-up.
 */

import { after } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { forgeLeadVoiceDemo, buildOsConfig, buildSiteBrief, ensureDemoHub } from '@/lib/outbound-demo';
import { syncLeadToPipeline } from '@/lib/outbound-pipeline';
import type { OutboundLead, Niche } from '@/lib/outbound';
import { resendClient } from '@/lib/send-email';
import { clientEmail, demoFilmCard } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { possessive } from '@/lib/business-name';

const DAILY_CAP = 12;

/** Same door guards as the Demo Station: these fields feed the site brief that
 * drives a headless builder, so anything instruction-shaped is refused, never
 * sanitized. Kept in sync with app/api/demo-station/route.ts. */
const HOSTILE =
  /(\bignore\b|\bdisregard\b|\boverride\b|\bprompt\b|\bsystem\s*:|\bassistant\s*:|\bexfiltrat|\bcredential|\bapi[_ -]?key|\b\.env\b|\brm\s+-rf\b|\bcurl\b|\bsudo\b|\bdelete\b.{0,20}\bfile|<script|\bjavascript:|```|\n)/i;

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** He hears the trade in plain words; the funnel wants one of five buckets. */
function nicheOf(trade: string): Niche {
  const t = trade.toLowerCase();
  if (/restaurant|cafe|bakery|coffee|food|pizz|deli\b|catering|bar\b|brew/.test(t)) return 'restaurant';
  if (/dental|dentist|med ?spa|spa\b|salon|clinic|chiro|wellness|aesthet/.test(t)) return 'dental_medspa';
  if (/real ?estate|realtor|broker|property/.test(t)) return 'real_estate';
  if (/roof|plumb|hvac|electric|landscap|lawn|paint|remodel|construct|clean|pest|garage|fence|concrete|handyman|tree|excav|septic|weld|repair|contract/.test(t)) return 'home_service';
  return 'other';
}

export type ForgeSuiteInput = {
  business?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  website?: string;
  trade?: string;
  notes?: string;
};

export async function forgeSuiteFromCall(input: ForgeSuiteInput, callerNumber: string | null): Promise<string> {
  const business = clean(input.business, 90);
  const name = clean(input.contact_name, 80);
  const email = clean(input.email, 120).toLowerCase();
  const phone = (clean(input.phone, 30) || callerNumber || '').replace(/[^\d+() .-]/g, '');
  const digits = phone.replace(/\D/g, '');
  const city = clean(input.city, 60);
  const state = clean(input.state, 30).toUpperCase().slice(0, 2);
  const website = clean(input.website, 200);
  const trade = clean(input.trade, 80);
  const notes = clean(input.notes, 600);

  const missing: string[] = [];
  if (!business) missing.push('the business name');
  if (!name) missing.push('their name');
  if (!/.+@.+\..+/.test(email)) missing.push('a confirmed email (spell it back first)');
  if (digits.length < 10) missing.push('a ten digit phone number');
  if (missing.length) {
    return JSON.stringify({
      ok: false,
      instruction: `Do not apologize; just collect what is missing before forging: ${missing.join(', ')}. Then call this tool again.`,
    });
  }
  if (HOSTILE.test([business, name, city, website, trade].join(' ')) || HOSTILE.test(notes.replace(/\n/g, ' '))) {
    return JSON.stringify({
      ok: false,
      instruction:
        'Those details did not read like a plain business description, so the forge refused them. Ask them to describe the business in plain words and try once more.',
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return JSON.stringify({ ok: false, instruction: 'The forge is unreachable right now. Offer to book them with Sarah instead.' });
  }

  // The same business coming back gets its existing suite, zero new spend.
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const { data: priors } = await supabase
    .from('outbound_leads')
    .select('hub_demo_url, business_name, phone')
    .eq('email', email)
    .in('source', ['demo-station', 'mr-mustard'])
    .limit(50);
  const existing = (priors ?? []).find(
    (p) =>
      p.hub_demo_url &&
      (p.phone ?? '').replace(/\D/g, '').slice(-10) === digits.slice(-10) &&
      norm(p.business_name ?? '') === norm(business),
  );
  if (existing?.hub_demo_url) {
    return JSON.stringify({
      ok: true,
      returning: true,
      instruction:
        'Their suite already exists from a previous forge. Tell them it is already built and waiting, and use send_email with a short note pointing them back to the email we sent before, or offer to book Sarah.',
    });
  }

  // His own daily ceiling, atomic, fail closed.
  const { data: claimed, error: capErr } = await supabase.rpc('claim_forge_slot', {
    p_key: `mrmustard:day:${new Date().toISOString().slice(0, 10)}`,
    p_cap: DAILY_CAP,
  });
  if (capErr || claimed !== true) {
    if (capErr) console.error('mr-mustard forge cap claim failed:', capErr.message);
    return JSON.stringify({
      ok: false,
      instruction:
        'The forge is at capacity for today. Tell them honestly the build queue is full, take their details with capture_lead, and offer to book Sarah so the suite gets forged first thing.',
    });
  }

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
      niche: nicheOf(trade),
      status: 'new',
      source: 'mr-mustard',
      notes: [
        'FORGED LIVE ON A CALL: Mr. Mustard took their details and fired the forge himself.',
        trade ? `TRADE (their words): ${trade}` : null,
        website ? null : 'WEBSITE: none, they came without one.',
        notes ? `OWNER NOTES: ${notes}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
      next_action: 'Mr. Mustard forged their suite on a live call: follow up while it is hot',
    })
    .select('*')
    .single();
  if (leadErr || !leadRow) {
    console.error('mr-mustard forge lead insert failed:', leadErr?.message);
    return JSON.stringify({ ok: false, instruction: 'The forge misfired. Apologize once, then capture the lead and offer to book Sarah.' });
  }

  // Answer Vapi NOW; forge after the response is on the wire.
  after(async () => {
    try {
      let lead = leadRow as OutboundLead;

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

      try {
        const synced = await syncLeadToPipeline(supabase, lead, { source: 'mr-mustard' });
        if (!synced.ok) console.error('mr-mustard forge pipeline sync failed:', synced.error);
      } catch (err) {
        console.error('mr-mustard forge pipeline sync threw', err);
      }

      if (process.env.RESEND_API_KEY && lead.hub_demo_url) {
        const resend = resendClient();
        const first = name.split(' ')[0];
        try {
          await resend.emails.send({
            from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
            to: email,
            replyTo: 'sarah@modernmustardseed.com',
            subject: `${first}, ${possessive(business)} demos are being forged right now`,
            html: clientEmail({
              preheader: 'Your voice agent and command center are ready now; the rest lands within the hour.',
              eyebrow: 'YOUR DEMO SUITE',
              greeting: `${first}, Mr. Mustard kept his word.`,
              body:
                `<p>You just talked to our AI, and he fired the forge while you were still on the line. Your voice agent and your command center are <strong>ready right now</strong>. Your website is the slow one, because it gets designed from scratch rather than poured into a template, and then we record you a short walkthrough film of the finished suite. It all lands at the same hub <strong>within the hour</strong>.</p>` +
                demoFilmCard({
                  film: 'demo-welcome',
                  href: lead.hub_demo_url,
                  caption: `A first look while we finish ${possessive(business)} own walkthrough film.`,
                }) +
                `<p>Everything lives at your private hub, and when you love what you see, you can <strong>make it real right from that same page</strong>. No second meeting required.</p>`,
              cta: { label: 'Open your Demo Suite', url: lead.hub_demo_url },
              signature: 'Sarah',
            }),
          });
        } catch (err) {
          console.error('mr-mustard forge welcome email failed', err);
        }
        try {
          await resend.emails.send({
            from: 'Modern Mustard Seed <hello@modernmustardseed.com>',
            to: OWNER_NOTIFY_TO,
            subject: `MR. MUSTARD FORGED ONE LIVE: ${business} (${city || state || 'unknown'})`,
            html: clientEmail({
              preheader: 'He took their details on a call and fired the forge himself.',
              eyebrow: 'THE SDR CLOSED',
              greeting: 'Mr. Mustard forged a suite on a live call.',
              body: `<p><strong>${business}</strong> (${name}, ${email}, ${phone}) gave him everything on the phone and he fired the forge. They were told the suite lands in their inbox within the hour.</p><p>They are on the dial floor, source mr-mustard, flagged hot. Hub: <a href="${lead.hub_demo_url}">${lead.hub_demo_url}</a></p>`,
              signature: 'The Voice Line',
            }),
          });
        } catch (err) {
          console.error('mr-mustard forge notify failed', err);
        }
      }
    } catch (err) {
      console.error('mr-mustard forge after() failed', err);
    }
  });

  return JSON.stringify({
    ok: true,
    instruction:
      `The forge is running. Tell them, in your own words: their voice agent and command center are being built right now, the custom website and a walkthrough film follow, and the whole suite lands in their email inbox at ${email} within the hour, usually much sooner. When they love it, they can order it right from that same page. Then confirm the email address once more so they know where to look, and offer to also book a call with Sarah while the forge works.`,
  });
}
