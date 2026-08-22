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
import { forgeLeadVoiceDemo, buildSiteBrief, ensureDemoHub } from '@/lib/outbound-demo';
import { ensurePresenceAudit } from '@/lib/presence-audit';
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

/**
 * WHAT HE FORGES IS NOW A CHOICE, NOT A FIXED SUITE.
 *
 * Sarah 2026-08-13: "it is currently making the whole demo forge, so even the
 * website and command center even if they just want a voice agent and not a
 * website. i want to make just the one thing they asked for, so have him ask
 * sales questions to see exactly what they need and just make that."
 *
 * Two reasons this matters beyond the obvious. A website build is the only
 * expensive leg (a headless builder plus a film cut, ~20-40 min of worker
 * floor), so forging one nobody asked for burns the daily ceiling on a lead who
 * will never look at it. And since 2026-08-13 the command center is billable
 * outside the bundle, so shipping it unasked contradicts the price he just
 * quoted on the phone.
 *
 * The wire words are his words; the values are the SAME keys the order card,
 * `quoteDemoOrder` and `demo-provision` already use, so a partial forge prices
 * and provisions itself with no translation layer.
 */
export const FORGE_PIECES = {
  voice_agent: 'voice',
  website: 'site',
} as const;

export type ForgePiece = (typeof FORGE_PIECES)[keyof typeof FORGE_PIECES];

/** What each piece is called out loud, for his instruction field and the email. */
const PIECE_LABEL: Record<ForgePiece, string> = {
  voice: 'voice agent',
  site: 'website',
};

/** Instant vs queued. Only the website goes to the worker floor, and only the
 *  website earns the "within the hour" promise or a walkthrough film. */
const INSTANT: Record<ForgePiece, boolean> = { voice: true, site: false };

function piecesFrom(build: unknown): ForgePiece[] {
  const raw = Array.isArray(build) ? build : typeof build === 'string' ? [build] : [];
  const out = new Set<ForgePiece>();
  for (const v of raw) {
    const k = String(v).trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (k in FORGE_PIECES) out.add(FORGE_PIECES[k as keyof typeof FORGE_PIECES]);
    // He is a language model on a phone line, so accept the obvious near misses
    // rather than bouncing a real request back at a live caller.
    else if (/^(voice|agent|phone)/.test(k)) out.add('voice');
    else if (/^(site|web)/.test(k)) out.add('site');
    // A command center request is DROPPED here on purpose (Sarah, 2026-08-22).
    // It is no longer a forgeable piece: it is sold on its own and built by
    // hand. Silently mapping it to a build would ship the one product she
    // pulled, so the request falls through to `pieces.length === 0`, which
    // makes him ask what they want instead of guessing.
  }
  return (['voice', 'site'] as ForgePiece[]).filter((p) => out.has(p));
}

/**
 * The one soft line naming what they did NOT take. It runs in the delivery
 * email and nowhere else: on the call he is told to close and stop selling, so
 * the other piece gets named here instead, at the reader's own pace, next to
 * the order card that can actually take the money.
 *
 * It names ONLY the two forgeable pieces. The command center is not mentioned
 * anywhere in this file any more (Sarah, 2026-08-22): it is sold on its own and
 * never suggested alongside something else.
 */
function upsellLine(pieces: ForgePiece[]): string {
  const has = (p: ForgePiece) => pieces.includes(p);
  if (has('voice') && has('site')) return '';
  const wrap = (s: string) => `<p>${s} Just reply to this email or call us back, and we will forge that one too.</p>`;
  const pair = 'and taken together they are built as one thing, for less than the two apart';
  if (has('voice')) return wrap(`If you ever want the website to match, ${pair}.`);
  if (has('site')) return wrap(`If you ever want it to answer its own phone too, ${pair}.`);
  return wrap('If you ever want the voice agent that feeds it, or the website to match, we can build either one.');
}

/** "a voice agent", "a website and a command center", "all three". */
function listPieces(pieces: ForgePiece[]): string {
  const names = pieces.map((p) => PIECE_LABEL[p]);
  if (names.length <= 1) return names[0] ?? 'nothing';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
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
  /** Which pieces they actually asked for. No default: an empty value bounces
   *  back and makes him ask, because silently building everything is the exact
   *  bug this parameter exists to kill. */
  build?: string[];
};

/**
 * How many times this caller has fired the forge with an empty build, in this
 * process. Deliberately in memory rather than the database: it only has to
 * survive the length of one phone call, and a serverless instance handles a
 * whole call. Entries clear themselves after fifteen minutes so a caller who
 * rings back tomorrow starts clean.
 */
const EMPTY_FORGE_CALLS = new Map<string, number>();

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

  const wanted = piecesFrom(input.build);
  if (!wanted.length) {
    /**
     * ⚠️ THE SECOND BOUNCE IS A DIFFERENT PROBLEM FROM THE FIRST.
     *
     * On a real inbound call 2026-08-20 the agent called this tool FIVE times
     * with an empty body. Each bounce returned this same polite instruction, he
     * ignored it, and the caller heard the tool's waiting message five times
     * over before he gave up and apologised for a technical snag. Nothing was
     * built and she had already told him exactly what she wanted.
     *
     * The prompt now forbids repeat calls, but a prompt is a hope and this is a
     * guarantee. The server counts empty calls per phone line and escalates its
     * own wording: the first bounce coaches, the second orders him to stop
     * calling the tool and talk, and by the third it takes the decision away
     * and sends him to a human. An instruction the model has already ignored
     * twice will not work the third time by being repeated more politely.
     */
    const key = callerNumber || 'unknown';
    const seen = (EMPTY_FORGE_CALLS.get(key) ?? 0) + 1;
    EMPTY_FORGE_CALLS.set(key, seen);
    setTimeout(() => EMPTY_FORGE_CALLS.delete(key), 15 * 60_000).unref?.();

    if (seen >= 3) {
      return JSON.stringify({
        ok: false,
        instruction:
          'STOP. You have now called this tool three times with nothing filled in. Do not call it again on this call, whatever happens. Say to them, out loud and in your own words, that you are going to have Sarah build it by hand today rather than keep them waiting, then call reach_sarah with their name, number, business and exactly what they asked for. That is the close now.',
      });
    }
    if (seen === 2) {
      return JSON.stringify({
        ok: false,
        instruction:
          'DO NOT CALL THIS TOOL AGAIN UNTIL THEY HAVE ANSWERED YOU OUT LOUD. You just called it twice with an empty build. Stop calling and start talking: ask them plainly, in one short question, whether they want the voice agent that answers their phone, a website, or the back office board. Wait for the answer. Then call this once with that answer in `build`, along with the business name, their name, their email and their phone.',
      });
    }
    return JSON.stringify({
      ok: false,
      instruction:
        'You have not established WHAT to build yet, and the forge will not guess. If they have ALREADY told you (somebody who said "a voice agent and a website" has told you ["voice_agent","website"]), put that in `build` and call this once more with the rest of the fields filled. Only if they genuinely have not said, ask them plainly which piece they need: the voice agent that answers their phone, a website, or the command center that runs the back office. Never build a piece they did not ask for.',
    });
  }

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

  /* The same business coming back. This used to be a flat refusal, which was
   * right when every forge built all three: there was nothing left to add. Now
   * that he builds only what was asked for, the most valuable call in the
   * funnel is the one where a voice-agent lead rings back wanting the website
   * too. So: refuse only the pieces they ALREADY have, and forge the rest onto
   * the existing lead rather than minting a duplicate that would split their
   * hub, their drip state and their order card in two. */
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const { data: priors } = await supabase
    .from('outbound_leads')
    .select('*')
    .eq('email', email)
    .in('source', ['demo-station', 'mr-mustard'])
    .limit(50);
  const existing = ((priors ?? []) as OutboundLead[]).find(
    (p) =>
      p.hub_demo_url &&
      (p.phone ?? '').replace(/\D/g, '').slice(-10) === digits.slice(-10) &&
      norm(p.business_name ?? '') === norm(business),
  );

  // Present on the prior lead = already forged, whatever its build status.
  const alreadyHas = (lead: OutboundLead, piece: ForgePiece): boolean =>
    piece === 'voice' ? !!lead.demo_url : !!lead.site_demo_id;

  let addTo: OutboundLead | null = null;
  let pieces = wanted;
  if (existing) {
    const have = wanted.filter((p) => alreadyHas(existing, p));
    pieces = wanted.filter((p) => !alreadyHas(existing, p));
    if (!pieces.length) {
      return JSON.stringify({
        ok: true,
        returning: true,
        built: have,
        instruction: `They already have ${listPieces(have)} from an earlier forge, so nothing new was built and nothing was charged to the queue. Tell them it is already built and waiting at their hub, and use send_email with a short note pointing them back to the email we sent before. If they want a piece they do not have yet, ask which one and call this tool again with just that piece in \`build\`.`,
      });
    }
    addTo = existing;
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
        'The forge is at capacity for today. Tell them honestly the build queue is full, take their details with capture_lead, and tell them Sarah forges it first thing.',
    });
  }

  const asked = `THEY ASKED FOR: ${listPieces(pieces)}. Nothing else was built, on purpose.`;

  let leadRow: OutboundLead | null = addTo;
  if (addTo) {
    // Second call from a business that already forged. Append to the existing
    // lead so the hub, the drip state and the order card stay one record.
    const { data: appended } = await supabase
      .from('outbound_leads')
      .update({
        notes: [addTo.notes, `CALLED BACK AND ADDED: ${listPieces(pieces)} (forged live by Mr. Mustard).`].filter(Boolean).join('\n'),
        next_action: `Called back for ${listPieces(pieces)}: they are buying in pieces, follow up while it is hot`,
      })
      .eq('id', addTo.id)
      .select('*')
      .single();
    if (appended) leadRow = appended as OutboundLead;
  } else {
    const { data: inserted, error: leadErr } = await supabase
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
          asked,
          trade ? `TRADE (their words): ${trade}` : null,
          website ? null : 'WEBSITE: none, they came without one.',
          notes ? `OWNER NOTES: ${notes}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
        next_action: `Mr. Mustard forged ${listPieces(pieces)} on a live call: follow up while it is hot`,
      })
      .select('*')
      .single();
    if (leadErr || !inserted) {
      console.error('mr-mustard forge lead insert failed:', leadErr?.message);
      return JSON.stringify({ ok: false, instruction: 'The forge misfired. Apologize once, then capture the lead so Sarah can pick it up by hand.' });
    }
    leadRow = inserted as OutboundLead;
  }

  // Answer Vapi NOW; forge after the response is on the wire.
  after(async () => {
    try {
      let lead = leadRow as OutboundLead;
      const want = (p: ForgePiece) => pieces.includes(p);

      if (want('voice')) {
        const voice = await forgeLeadVoiceDemo(supabase, lead);
        if (voice.ok) lead = voice.lead;
      }

      if (want('site')) {
        // buildSiteBrief takes the voice demo url so the site can link its own
        // agent. On a website-only forge there is no agent, and null is the
        // honest argument: the brief must not invent one.
        const { data: siteRow } = await supabase
          .from('outbound_demo_sites')
          .insert({ lead_id: lead.id, business_name: lead.business_name, brief: buildSiteBrief(lead, lead.demo_url ?? null), status: 'queued' })
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
      }

      lead = await ensureDemoHub(supabase, lead);

      // The fifth door. Grading a website can take a minute and a half, and
      // this block already runs behind the call rather than during it, so the
      // caller never waits on it. Fail-soft: no audit is a smaller suite, not
      // a failed forge.
      await ensurePresenceAudit(supabase, lead as unknown as Record<string, unknown>);
      {
        const { data: withAudit } = await supabase.from('outbound_leads').select('*').eq('id', lead.id).single();
        if (withAudit) lead = withAudit as OutboundLead;
      }

      try {
        const synced = await syncLeadToPipeline(supabase, lead, { source: 'mr-mustard' });
        if (!synced.ok) console.error('mr-mustard forge pipeline sync failed:', synced.error);
      } catch (err) {
        console.error('mr-mustard forge pipeline sync threw', err);
      }

      if (process.env.RESEND_API_KEY && lead.hub_demo_url) {
        const resend = resendClient();
        const first = name.split(' ')[0];

        /* The email now describes ONLY what was forged. This is not cosmetic:
         * the old copy promised a website and a walkthrough film in every
         * send, and on a voice-only forge that is a promise nothing downstream
         * will ever keep (the film is cut by the site worker, so no site means
         * no film and no suite-ready email). A first touch that over-promises
         * is worse than a narrow one that lands. */
        const built = listPieces(pieces);
        const instant = pieces.filter((p) => INSTANT[p]);
        const queued = pieces.filter((p) => !INSTANT[p]);
        const one = pieces.length === 1;
        const timing = queued.length
          ? `${instant.length ? `Your ${listPieces(instant)} ${instant.length > 1 ? 'are' : 'is'} <strong>ready right now</strong>. Your website is the slow one, because it gets designed from scratch rather than poured into a template, and then we record you a short walkthrough film of it. That lands at the same hub <strong>within the hour</strong>.` : `Your website gets designed from scratch rather than poured into a template, and then we record you a short walkthrough film of it. It lands at your hub <strong>within the hour</strong>, usually much sooner.`}`
          : `Your ${built} ${one ? 'is' : 'are'} <strong>ready right now</strong>. Nothing to wait for.`;

        try {
          await resend.emails.send({
            from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
            to: email,
            replyTo: 'sarah@modernmustardseed.com',
            subject: one
              ? `${first}, ${possessive(business)} ${built} is ready`
              : `${first}, ${possessive(business)} demos are being forged right now`,
            html: clientEmail({
              preheader: queued.length
                ? `The ${listPieces(instant)} ${instant.length > 1 ? 'are' : 'is'} ready now; the website lands within the hour.`
                : `Your ${built} is live and waiting at your private hub.`,
              eyebrow: one ? `YOUR ${PIECE_LABEL[pieces[0]].toUpperCase()}` : 'YOUR DEMOS',
              greeting: `${first}, Mr. Mustard kept his word.`,
              body:
                `<p>You just talked to our AI, and he fired the forge while you were still on the line. You asked for ${one ? 'one thing' : 'these'}, so ${one ? 'that is what we built' : 'that is all we built'}: <strong>${built}</strong>, made for ${business} and nobody else.</p>` +
                `<p>${timing}</p>` +
                demoFilmCard({
                  film: 'demo-welcome',
                  href: lead.hub_demo_url,
                  caption: queued.length
                    ? `A first look while we finish ${possessive(business)} own walkthrough film.`
                    : `Sixty seconds on what you are looking at.`,
                }) +
                `<p>${one ? 'It lives' : 'It all lives'} at your private hub, and when you love it you can <strong>make it real right from that same page</strong>. No second meeting required.</p>` +
                // The upsell belongs HERE, in writing, not on the phone. He was
                // told on the call to close and stop selling, so this is where
                // the other pieces get named, at the reader's pace. When both
                // paid pieces would land it also says the command center comes
                // free with them, which is the signpost demo-order.ts requires
                // on every surface that can put a buyer in the dominated cart.
                upsellLine(pieces),
              cta: { label: one ? `Open your ${PIECE_LABEL[pieces[0]]}` : 'Open your Demo Suite', url: lead.hub_demo_url },
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
            subject: `MR. MUSTARD FORGED ${built.toUpperCase()}: ${business} (${city || state || 'unknown'})`,
            html: clientEmail({
              preheader: 'He qualified them on a call and forged only what they asked for.',
              eyebrow: 'THE SDR CLOSED',
              greeting: `Mr. Mustard forged ${built} on a live call.`,
              body:
                `<p><strong>${business}</strong> (${name}, ${email}, ${phone}) gave him everything on the phone and he fired the forge.</p>` +
                `<p><strong>They asked for ${built}</strong>${addTo ? ', on a call back, added to the lead they already had' : ''}. Nothing else was built, so anything missing from their hub is an upsell you still have, not a bug.</p>` +
                `<p>They are on the dial floor, source mr-mustard, flagged hot, and the demo drip is now armed for them. Hub: <a href="${lead.hub_demo_url}">${lead.hub_demo_url}</a></p>`,
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

  /* His script, generated from what is ACTUALLY on the floor. He follows this
   * field word for word, so anything it names had better exist: promising a
   * website on a voice-only forge is how a perfect call turns into an angry
   * inbox an hour later. */
  const built = listPieces(pieces);
  const hasSite = pieces.includes('site');
  const instantPieces = pieces.filter((p) => INSTANT[p]);
  const timingLine = hasSite
    ? `${instantPieces.length ? `their ${listPieces(instantPieces)} ${instantPieces.length > 1 ? 'are' : 'is'} being built right now, and ` : ''}the custom website plus a short walkthrough film follow, with everything in their inbox at ${email} within the hour, usually much sooner`
    : `their ${built} ${pieces.length > 1 ? 'are' : 'is'} being built right now and lands in their inbox at ${email} in the next few minutes`;

  return JSON.stringify({
    ok: true,
    built: pieces,
    instruction:
      `The forge is running on exactly what they asked for: ${built}. Tell them in your own words that ${timingLine}. ⚠️ Name ONLY ${built}. Do NOT mention any piece they did not ask for, and do not describe it as a suite or a bundle unless all three are in that list. When they love it, they can order it right from that same page. Then confirm the email address once more, slowly, in the spelled-out format, so they know where to look. ⚠️ Do NOT offer Sarah's calendar: the forge is the close and the email is the next step. If they later mention wanting another piece, ask which one and call this tool again with only that piece in \`build\`.`,
  });
}
