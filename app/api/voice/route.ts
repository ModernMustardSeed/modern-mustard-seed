import { NextResponse, after } from 'next/server';
import { resendClient } from '@/lib/send-email';
import {
  clientEmail,
  bookingConfirmationEmail,
  bookingNotificationEmail,
  leadNotification,
  p,
} from '@/lib/email';
import { getAffiliateByCode } from '@/lib/affiliate';
import { partnerForLine } from '@/lib/vapi-lines';
import { insertLead, getSupabase } from '@/lib/supabase';
import { recallCaller, rememberFromTool, rememberSummary } from '@/lib/voice-memory';
import { getNextAvailableSlots, isSlotAvailable, displayForIso, bookingWindow } from '@/lib/booking';
import { availability } from '@/data/availability';
import { buildIcsInvite } from '@/lib/ics';
import { sendMetaEvent } from '@/lib/meta-capi';
import { randomUUID } from 'node:crypto';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { recordEndOfCall } from '@/lib/voice-calls';
import { buildSuiteFromCall } from '@/lib/voice-build-suite';
import { DEMO_BOOKING_TOOL_NAMES, runDemoBookingTool } from '@/lib/demo-booking-tools';
import { getRun } from '@/lib/demo-run-store';
import { afterWhiteLabelCall } from '@/lib/white-label/after-call';
import { notifyDemoBooking } from '@/lib/demo-booking-notify';
import { demoAppointmentsFor } from '@/lib/demo-booking';
import {
  acqContext,
  handleBuildProspectAgent,
  handleEmailProspectDemo,
  handleSendCheckoutLink,
  handleLogCallOutcome,
  handleStopContacting,
  handleAcqEndOfCall,
} from '@/lib/acq/voice-tools';
import { cancelPendingFor } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';
import { env } from '@/lib/env';
import { checkSpokenEmail } from '@/lib/spoken-email';
import { PRESENCE_AUDIT_TOOL, requestAuditFromCall } from '@/lib/voice-audit-request';
import { sendLoud, sendResourceEmail } from '@/lib/mustard-send';
import { noteFollowUpOutcome, queueInboxExtraction } from '@/lib/mustard-inbox';
import { clearSpeech, controlUrlOf, guardToolSilence, noteSpeech, noteToolCall } from '@/lib/voice-dead-air';


/**
 * Vapi server webhook for Mr. Mustard, the MMS voice agent.
 *
 * Voice calls book through the SAME engine as the site chat: lib/booking
 * slots (Mountain Time, Supabase double-booking guard), Resend emails with
 * ICS invites, and the shared leads inbox. One calendar, one source of truth.
 *
 * Handles:
 *  - tool-calls            → recall_caller / get_available_slots / book_discovery_call / capture_lead /
 *                            request_presence_audit (lib/voice-audit-request.ts)
 *  - end-of-call-report    → emails Sarah the call summary + transcript, saves caller memory
 *
 * Persistent memory: a returning caller is recognized by phone (inbound) or
 * email (web) via lib/voice-memory. recall_caller reads it at the start of a
 * call; bookings, lead captures, and the end-of-call summary write it back. All
 * memory ops degrade gracefully if migration 028 has not been run yet.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ───────── Tool implementations (mirrors /api/mustard-chat) ───────── */

/**
 * recall_caller: at the start of a call, check whether we have spoken with this
 * person before. Matches on the caller's phone (inbound) or an email they give
 * (web). Returns what we remember so the agent can greet them and pick up the
 * thread instead of starting cold.
 */
async function recallForCall(
  callerNumber: string | null,
  input: { email?: string },
): Promise<string> {
  const mem = await recallCaller({ phone: callerNumber, email: input?.email });
  if (!mem) {
    return JSON.stringify({
      ok: true,
      known: false,
      instruction:
        'No prior record for this caller. Treat them as new and greet normally. Do not mention that you checked.',
    });
  }
  const remembered: string[] = [];
  if (mem.name) remembered.push(`their name is ${mem.name}`);
  if (mem.business) remembered.push(`their business is ${mem.business}`);
  if (mem.pain_summary) remembered.push(`last time they were focused on: ${mem.pain_summary}`);
  if (mem.booked) remembered.push('they have already booked a call with Sarah before');
  if (mem.last_summary) remembered.push(`summary of the last call: ${mem.last_summary}`);
  return JSON.stringify({
    ok: true,
    known: true,
    caller: {
      name: mem.name ?? null,
      business: mem.business ?? null,
      pain: mem.pain_summary ?? null,
      booked: !!mem.booked,
      timesSpoken: mem.call_count ?? null,
      lastSummary: mem.last_summary ?? null,
    },
    instruction:
      'You have spoken with this caller before. Greet them warmly by name and naturally reference what you remember so it feels like you know them (' +
      remembered.join('; ') +
      '). Do NOT re-ask anything you already know. Pick up the thread, then help them with whatever they need today.',
  });
}

async function getSlots(fromDate?: string): Promise<string> {
  if (!availability.enabled) {
    return JSON.stringify({
      ok: false,
      error:
        'Booking is paused right now. Offer to take their email instead and Sarah will reach out to schedule directly.',
    });
  }
  const from = (fromDate ?? '').trim();
  const validFrom = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined;
  const win = bookingWindow();
  let slots = await getNextAvailableSlots(validFrom);
  let note = '';
  if (slots.length === 0 && validFrom) {
    // Nothing at the asked-for stretch (or it is beyond the window): offer the
    // nearest real times instead of a dead end.
    slots = await getNextAvailableSlots();
    note =
      validFrom > win.lastDateStr
        ? `The caller asked about ${validFrom}, which is past the booking window; Sarah currently books up to ${win.lastDateLabel}. Say that plainly and offer the times below, or capture their email so Sarah can schedule it by hand.`
        : `Nothing is open right around ${validFrom}. Offer the nearest open times below instead.`;
  }
  if (slots.length === 0) {
    return JSON.stringify({
      ok: false,
      error: 'No slots are open right now. Take their email and Sarah will reach out to schedule.',
    });
  }
  return JSON.stringify({
    ok: true,
    timezoneNote: 'All times are Mountain Time.',
    bookingWindowNote: `Bookings are open up to ${win.lastDateLabel}. If the caller wants a later week or month, call this tool again with fromDate set to where they want to start.`,
    ...(note ? { note } : {}),
    slots: slots.map((s, i) => ({ index: i + 1, startIso: s.startIso, display: s.display })),
    instruction:
      'Offer the caller a couple of these across different days, naturally in speech, like "I could do Tuesday at nine, or Thursday at one thirty, Mountain Time." Let them pick the day and time that works for them. Do not comment on how open or busy the calendar is. When they pick one, confirm their name and email out loud, then call book_discovery_call with the matching startIso.',
  });
}

async function bookSlot(
  input: {
    startIso: string;
    name: string;
    email: string;
    business?: string;
    painSummary: string;
  },
  callerNumber?: string | null,
  line: LineCredit | null = null,
): Promise<string> {
  const ok = await isSlotAvailable(input.startIso);
  if (!ok) {
    return JSON.stringify({
      ok: false,
      error: 'That slot just got taken. Call get_available_slots again and offer fresh times.',
    });
  }
  const name = (input.name || '').trim();
  const email = (input.email || '').trim();
  if (!name || !email || !email.includes('@')) {
    return JSON.stringify({
      ok: false,
      error: 'Name and a valid email are required. Confirm them with the caller, spelling the email back, then try again.',
    });
  }
  const firstName = name.split(' ')[0] || 'there';
  const business = input.business?.trim();
  const painSummary = (input.painSummary || 'Voice call booking').trim();
  const { display, shortLabel } = displayForIso(input.startIso);
  const endIso = new Date(
    new Date(input.startIso).getTime() + availability.slotMinutes * 60 * 1000
  ).toISOString();

  // Persist to the shared leads inbox (same shape as chat bookings).
  try {
    const client = getSupabase();
    if (client) {
      await client.from('leads').insert({
        type: 'contact',
        name,
        email,
        message: painSummary,
        notes: `Discovery call · ${display}${business ? ` · ${business}` : ''} · booked by Mr. Mustard (voice)${line ? ` · ${creditNote(line)}` : ''}`,
        timeline: input.startIso,
        status: 'booked',
        source: 'mustard-seed-booking',
        business_name: business ?? null,
        owner: line?.name ?? null,
      });
    }
  } catch (err) {
    console.error('voice booking insert failed', err);
  }

  // Calendar invites to both sides.
  let emailStatus: { sarah?: string; client?: string } = { sarah: 'skipped', client: 'skipped' };
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = resendClient();
      const ics = buildIcsInvite({
        uid: `${randomUUID()}@modernmustardseed.com`,
        startUtc: new Date(input.startIso),
        endUtc: new Date(endIso),
        summary: `Modern Mustard Seed discovery call: Sarah Scarano + ${name}`,
        description: `Discovery call with Sarah Scarano, Modern Mustard Seed.\n\nBooked by Mr. Mustard (voice agent).\n\nWhat the caller said: ${painSummary}\n\nThe Work: https://modernmustardseed.com/work`,
        location: availability.conferenceLink || 'Video link will be sent before the call',
        organizerName: 'Sarah Scarano',
        organizerEmail: 'sarah@modernmustardseed.com',
        attendeeName: name,
        attendeeEmail: email,
      });
      const icsAttachment = { filename: 'discovery-call.ics', content: Buffer.from(ics) };

      const rSarah = await sendLoud(resend, 'booking-notify-sarah', {
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Voice booking: ${name} · ${shortLabel}`,
        html: bookingNotificationEmail({
          name,
          email,
          business,
          whenDisplay: display,
          painSummary: `${painSummary}\n\n(Booked live by Mr. Mustard on a voice call.)`,
          recommendedSteps: [],
        }),
        attachments: [icsAttachment],
      });

      const rClient = await sendLoud(resend, 'booking-confirm-visitor', {
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName}, you are on our calendar for ${shortLabel}`,
        html: bookingConfirmationEmail({
          firstName,
          whenDisplay: display,
          durationMinutes: availability.slotMinutes,
          painSummary,
          conferenceLink: availability.conferenceLink || undefined,
        }),
        attachments: [icsAttachment],
      });

      console.log(
        `BOOKING EMAILS SUMMARY | sarah=${rSarah.ok ? rSarah.id : 'FAIL:' + rSarah.error} | client[${email}]=${rClient.ok ? rClient.id : 'FAIL:' + rClient.error}`
      );
      emailStatus = { sarah: rSarah.ok ? rSarah.id : `FAIL:${rSarah.error}`, client: rClient.ok ? rClient.id : `FAIL:${rClient.error}` };
    } catch (err) {
      console.error('voice booking email failed', err);
      emailStatus = { sarah: 'THREW', client: 'THREW' };
    }
  }

  // Meta CAPI: a booked call is the highest-value conversion, and it happens
  // entirely server-side (no browser Pixel can see a voice booking).
  await sendMetaEvent({
    eventName: 'Schedule',
    eventId: `voice-book-${input.startIso}-${email}`,
    email,
    eventSourceUrl: 'https://modernmustardseed.com/voice-agents',
    customData: { lead_source: 'mr-mustard-voice', booking_time: input.startIso },
  });

  // Remember this caller for next time (recognized by phone or email).
  await rememberFromTool({
    phone: callerNumber,
    name,
    email,
    business,
    pain: painSummary,
    booked: true,
  });

  return JSON.stringify({
    ok: true,
    display,
    // Webhook-only diagnostic (caller already holds the shared secret).
    _emails: emailStatus,
    instruction: `Booked. Confirm warmly and briefly: the call is ${display}, the calendar invite is already in their inbox, and Sarah will see them there. Then ask if there is anything else.`,
  });
}

async function captureLead(
  input: {
    name?: string;
    email: string;
    painSummary: string;
    business?: string;
  },
  callerNumber?: string | null,
  line: LineCredit | null = null,
): Promise<string> {
  const name = input.name?.trim() || 'Voice caller';
  const firstName = name.split(' ')[0];
  const email = (input.email || '').trim();
  if (!email.includes('@')) {
    return JSON.stringify({
      ok: false,
      error: 'That email does not look valid. Spell it back to the caller and try again.',
    });
  }
  const painSummary = (input.painSummary || '').trim().slice(0, 2000);
  const business = input.business?.trim();

  try {
    await insertLead({
      type: 'contact',
      name,
      email,
      message: painSummary,
      source: 'mr-mustard-voice',
      notes: [business ? `Business: ${business}` : null, creditNote(line)].filter(Boolean).join(' · ') || null,
      owner: line?.name ?? null,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = resendClient();
      await sendLoud(resend, 'lead-notify-sarah', {
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: email,
        subject: `Voice lead: ${name}`,
        html: leadNotification({
          type: 'Contact',
          name,
          email,
          fields: [
            { label: 'Email', value: email },
            ...(business ? [{ label: 'Business', value: business }] : []),
            { label: 'Source', value: 'Mr. Mustard voice call' },
            ...creditField(line),
          ],
          message: painSummary,
          suggestedAction: 'Speed to lead. Reply or call back today while it is warm.',
        }),
      });
      await sendLoud(resend, 'lead-followup-visitor', {
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName}, great talking with you`,
        html: clientEmail({
          preheader: 'Here is your next step from our call.',
          greeting: `Hi ${firstName},`,
          body:
            p('This is Mr. Mustard from Modern Mustard Seed. Great talking with you just now.') +
            p(
              `Here is what I heard: ${painSummary || 'you are exploring what AI could do for your business.'}`
            ) +
            p(
              'Sarah personally reads every one of these and will reply within one business day. If you want to skip the line, grab a discovery call slot below.'
            ),
          cta: { label: 'Book a 30-min call with Sarah', url: 'https://modernmustardseed.com/book' },
          secondary: { label: 'Run the free Website Audit', url: 'https://modernmustardseed.com/website-audit' },
        }),
      });
    }
    await sendMetaEvent({
      eventName: 'Lead',
      eventId: `voice-lead-${email}-${Math.round(Date.now() / 1000)}`,
      email,
      eventSourceUrl: 'https://modernmustardseed.com/voice-agents',
      customData: { lead_source: 'mr-mustard-voice' },
    });
    // Remember this caller for next time (recognized by phone or email).
    await rememberFromTool({
      phone: callerNumber,
      name: input.name,
      email,
      business,
      pain: painSummary,
      booked: false,
    });

    return JSON.stringify({
      ok: true,
      instruction:
        'Lead captured and the follow-up email is already in their inbox. Tell them that briefly and offer to book the call right now if they want to skip the wait.',
    });
  } catch (err) {
    console.error('voice capture_lead failed', err);
    return JSON.stringify({
      ok: false,
      error: 'Capture failed. Apologize briefly and give them sarah@modernmustardseed.com directly.',
    });
  }
}

/* ───────── reach_sarah: a caller asked for Sarah; notify her now ───────── */

/**
 * reach_sarah: the caller wants Sarah personally and either the live transfer
 * did not connect, the caller preferred a callback, or this is a web/desk call
 * with no phone leg to bridge. Ping Sarah immediately so she can call back.
 *
 * Email (Resend/Zoho to OWNER_NOTIFY_TO) is the only channel since texting was
 * retired 2026-08-01. It was already the guaranteed one; the text was
 * best-effort and carrier-filtered while A2P sat unapproved.
 */
async function reachSarah(
  input: { name?: string; phone?: string; reason?: string; email?: string },
  callerNumber: string | null,
  line: LineCredit | null = null,
): Promise<string> {
  const name = (input.name || '').trim() || 'A caller';
  /**
   * A Vapi variable is substituted in the SYSTEM PROMPT before the model sees
   * it, so on a real call he reads a real number. In any context where that
   * substitution has not happened, he copies the placeholder through verbatim,
   * and Sarah gets a lead telling her to ring "{{customer.number}}". Seen in a
   * harness on 2026-08-20. Two characters of defence, and the caller ID is
   * better information than a template string in every case where they differ.
   */
  const phoneRaw = (input.phone || '').trim();
  const phone = (/\{\{|\}\}/.test(phoneRaw) ? '' : phoneRaw) || callerNumber || '';
  const reason = (input.reason || '').trim();
  /**
   * ⚠️ THE ADDRESS GETS ITS OWN FIELD AND ITS OWN CHECK.
   *
   * It used to arrive buried in `reason` as free prose, which meant nothing
   * could validate it and nothing could read it back. On 2026-08-20 Lucy began
   * an address, corrected herself mid-sentence, and the lead reached Sarah as
   * `bellavalentinaMAY22@gmail.com`: a blend of the abandoned first attempt and
   * the corrected one. He had read the correct version back out loud twice.
   *
   * A blend like that is a VALID address at a real domain, so no format check
   * can catch it. What catches it is making him say the stored value back, so
   * the one person who knows it is wrong hears it while the call is still live.
   */
  const emailRaw = (input.email || '').trim();
  const emailVerdict = emailRaw ? await checkSpokenEmail(emailRaw) : null;
  const email = emailVerdict?.ok ? emailVerdict.address : '';

  let emailed = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = resendClient();
      const r = await sendLoud(resend, 'reach-sarah', {
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: OWNER_NOTIFY_TO,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `Someone asked for you: ${name}`,
        html: leadNotification({
          type: 'Contact',
          name,
          email: 'sarah@modernmustardseed.com',
          fields: [
            { label: 'Who', value: name },
            ...(phone ? [{ label: 'Call them back at', value: phone }] : []),
            ...(email ? [{ label: 'Email (he read this back on the call)', value: email }] : []),
            { label: 'Source', value: 'Mr. Mustard voice call (they asked for you by name)' },
            ...creditField(line),
          ],
          message: reason || 'A caller asked to speak with you directly.',
          suggestedAction: 'They asked for you personally. Call them back as soon as you can.',
        }),
      });
      emailed = r.ok;
    } catch (err) {
      console.error('reach_sarah email failed', err);
    }
  }

  if (!emailed) {
    return JSON.stringify({
      ok: false,
      error:
        'Could not reach Sarah automatically. Take the caller\'s name and number, tell them she will call back today, and give them sarah@modernmustardseed.com.',
    });
  }
  return JSON.stringify({
    ok: true,
    ...(email ? { sentWithEmail: email } : {}),
    instruction: email
      ? `Sarah has been notified, and the address on the record is ${email}. Say that address back to them ONCE, anchored, and ask if it is right. This is the last moment anybody can catch it, because after this call it is just a line in her inbox. If it is wrong, take the correction and call reach_sarah again with the fixed address. Then tell them warmly she will get right back to them.`
      : 'Sarah has just been notified (email now, and a text as backup). Tell them warmly she will get right back to them, confirm the best number to reach them, and offer to book a specific time with her too.',
  });
}

/* ───────── End-of-call report → Sarah's inbox ───────── */

async function handleEndOfCallReport(message: Record<string, unknown>) {
  const summary = (message.summary as string) || 'No summary generated.';
  const transcript = (message.transcript as string) || '';
  const call = (message.call ?? {}) as Record<string, unknown>;
  const customer = (call.customer ?? {}) as Record<string, unknown>;
  const phoneNumber = (customer.number as string) || null; // null for web calls
  const callerNumber = phoneNumber || 'Web call';
  const endedReason = (message.endedReason as string) || (call.endedReason as string) || '';
  const durationSeconds = Math.round(Number(message.durationSeconds ?? 0)) || undefined;
  const line = await lineCreditFor(call, message);

  // The call log: one row per call, written the moment it ends so /admin/calls
  // is never behind the phone. Best effort; the email below goes out regardless.
  const loggedId = await recordEndOfCall(message);
  const logUrl = loggedId ? `https://modernmustardseed.com/admin/calls?call=${loggedId}` : 'https://modernmustardseed.com/admin/calls';

  // If this was an outbound Mr. Mustard call to a tracked prospect, log the full
  // transcript (both sides) onto that lead's correspondence thread so Sarah can
  // read exactly how it went.
  const meta = ((call.metadata as Record<string, unknown>) ||
    ((call.assistantOverrides as Record<string, unknown>)?.metadata as Record<string, unknown>) || {}) as Record<string, unknown>;
  const prospectId = typeof meta.prospectId === 'string' ? meta.prospectId : null;
  const outboundLeadId = typeof meta.outboundLeadId === 'string' ? meta.outboundLeadId : null;

  // An acquisition demo call banks its own record: the call row, the funnel
  // stage, and whichever follow-up the outcome earns. Idempotent, because Vapi
  // retries this webhook and a retry must not add a second conversation to the
  // funnel or fire the follow-ups twice.
  const acq = acqContext(meta);
  if (acq) {
    try {
      await handleAcqEndOfCall(acq, {
        summary,
        transcript,
        durationSeconds,
        endedReason,
        vapiCallId: typeof call.id === 'string' ? call.id : undefined,
      });
    } catch (err) {
      console.error('acq end-of-call failed', err);
    }
  }
  // A prospect who dials Mr. Mustard's line themselves is the warmest signal
  // the campaign has, and until now it left no mark on their record. Match the
  // caller id against the acquisition prospects and put it on their timeline.
  if (!acq && phoneNumber && (call.type === 'inboundPhoneCall' || !call.type)) {
    try {
      await noteInboundFromProspect(phoneNumber, { summary, durationSeconds, endedReason }, line);
    } catch (err) {
      console.error('acq inbound match failed', err);
    }
  }
  if (prospectId || outboundLeadId) {
    try {
      const sb = getSupabase();
      if (sb) {
        // outbound_lead_id only when set, so this insert keeps working on a
        // database that has not applied migration 038 yet.
        await sb.from('messages').insert({
          prospect_id: prospectId, ...(outboundLeadId ? { outbound_lead_id: outboundLeadId } : {}), direction: 'outbound', channel: 'call',
          from_addr: 'Mr. Mustard (AI)', to_addr: phoneNumber || 'lead',
          subject: `AI call${durationSeconds ? ` (${durationSeconds}s)` : ''}${endedReason ? ` · ${endedReason}` : ''}`,
          snippet: summary.slice(0, 500),
          body: `Summary: ${summary}\n\n--- Transcript ---\n${transcript}`.slice(0, 20000),
          read: true, occurred_at: new Date().toISOString(),
        });
        if (prospectId) {
          await sb.from('rep_prospects').update({ status: 'contacted', updated_at: new Date().toISOString() }).eq('id', prospectId).eq('status', 'to-contact');
        }
        // The outbound lead's status is not touched here: they called us, and
        // contacted means Sarah reached them. The transcript in the thread is the record.
      }
    } catch (err) {
      console.error('voice transcript log failed', err);
    }
  }

  // Save the call summary to persistent memory (phone callers). Runs regardless
  // of email config so recall keeps working even if Resend is down.
  await rememberSummary({ phone: phoneNumber, summary });

  /* ── A DEMO CALL IS NOT AN ANONYMOUS "WEB CALL" ────────────────────────────
   *
   * Sarah, 2026-08-25: "def needs to be known if i have a demo booking or cal
   * or anything!!!"
   *
   * Every one of these already reached her, which was the problem: a built
   * demo call arrived titled "Mr. Mustard call summary · Web call", identical
   * whether somebody poked at it for five seconds or booked a job. The signal
   * was landing in the inbox dressed as noise. So a demo call now says whose
   * demo it was in the subject, and says whether the agent actually booked
   * anything, which is the only thing she needs to read to know if it matters.
   *
   * A booking also fires its own immediate alert from the tool call (see
   * notifyDemoBooking). That is deliberate duplication: the alert is the
   * "phone them today", this is the record of how the call went. */
  let demoLine: { business: string; booked: Awaited<ReturnType<typeof demoAppointmentsFor>> } | null = null;
  if (meta.kind === 'demo-agent' && typeof meta.runId === 'string' && UUID.test(meta.runId)) {
    try {
      const sb = getSupabase();
      if (sb) {
        const run = await getRun(sb, meta.runId);
        const bookedOnThisCall = (await demoAppointmentsFor(sb, meta.runId, 5)).filter(
          // Only what this call produced, not everything the demo has ever taken.
          (a) => Date.parse(a.created_at) >= Date.now() - Math.max(durationSeconds ?? 0, 60) * 1000 - 120_000,
        );
        demoLine = { business: run?.business || (meta.business as string) || 'a built demo', booked: bookedOnThisCall };
      }
    } catch (err) {
      console.error('demo call summary lookup failed', err);
    }
  }

  // A white label demo that rang someone's real phone: text them the summary
  // the owner would get, in the agency's name. Never throws.
  if (meta.kind === 'demo-agent' && meta.whiteLabel && meta.ringTo) {
    await afterWhiteLabelCall(meta as Record<string, unknown>, durationSeconds);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const resend = resendClient();
    const bookedCount = demoLine?.booked.length ?? 0;
    const subject = demoLine
      ? bookedCount
        ? `DEMO CALL, BOOKED: ${demoLine.business}`
        : `Demo call: ${demoLine.business}${durationSeconds ? ` · ${durationSeconds}s` : ''}`
      : `Mr. Mustard call summary · ${callerNumber}${line ? ` · ${line.label}` : ''}`;

    await sendLoud(resend, 'end-of-call-report', {
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: OWNER_NOTIFY_TO,
      subject,
      html: leadNotification({
        type: 'Contact',
        name: demoLine ? `${demoLine.business} demo agent` : 'Mr. Mustard voice call',
        email: 'sarah@modernmustardseed.com',
        fields: [
          { label: 'Caller', value: callerNumber },
          ...creditField(line),
          ...(demoLine ? [{ label: 'Demo', value: demoLine.business }] : []),
          ...(demoLine
            ? [
                {
                  label: 'Booked on this call',
                  value: bookedCount
                    ? demoLine.booked
                        .map((b) => `${b.customer_name || 'a caller'}${b.service ? `, ${b.service}` : ''}`)
                        .join('; ')
                    : 'nothing',
                },
              ]
            : []),
          ...(durationSeconds ? [{ label: 'Duration', value: `${durationSeconds}s` }] : []),
          ...(endedReason ? [{ label: 'Ended', value: endedReason }] : []),
        ],
        message: `${summary}${transcript ? `\n\n--- Transcript ---\n${transcript.slice(0, 6000)}` : ''}`,
        suggestedAction: demoLine
          ? bookedCount
            ? 'They tested the booking and it worked. Call them today, this is the hottest signal in the funnel.'
            : 'Somebody tried the demo. Read what they asked for; if the agent could not answer it, that is the next fix.'
          : `Review the call. Follow up if Mr. Mustard did not close the booking. Full transcript and recording: ${logUrl}`,
      }),
    });
  } catch (err) {
    console.error('voice end-of-call report email failed', err);
  }
}

/**
 * Find the acquisition prospect behind an inbound caller id and record the
 * call on their timeline. Phones in outbound_leads arrive in every format a
 * scraper can produce, so match on the last ten digits in code after a cheap
 * suffix filter in the database.
 */
async function noteInboundFromProspect(
  callerNumber: string,
  info: { summary: string; durationSeconds?: number; endedReason: string },
  line: LineCredit | null = null,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const digits = callerNumber.replace(/\D/g, '');
  if (digits.length < 10) return;
  const last10 = digits.slice(-10);
  const { data } = await sb
    .from('outbound_leads')
    .select('id,phone,acq_campaign_id,business_name,affiliate_id')
    .not('acq_campaign_id', 'is', null)
    .like('phone', `%${last10.slice(-4)}`)
    .limit(50);
  const lead = ((data ?? []) as { id: string; phone: string | null; acq_campaign_id: string | null; affiliate_id?: string | null }[]).find(
    (l) => (l.phone ?? '').replace(/\D/g, '').slice(-10) === last10,
  );
  if (!lead) return;
  const stamp = new Date().toISOString();
  await recordEvent(sb, {
    leadId: lead.id,
    campaignId: lead.acq_campaign_id,
    type: 'call_inbound',
    label: `Called Mr. Mustard's line themselves${info.durationSeconds ? ` (${info.durationSeconds}s)` : ''}`,
    detail: { from: callerNumber, endedReason: info.endedReason, summary: info.summary.slice(0, 600) },
  });
  await sb
    .from('outbound_leads')
    .update({ last_seen_at: stamp, reservoir_state: 'engaged', needs_human: `Called Mr. Mustard's line ${stamp.slice(0, 10)}. Call them back.` })
    .eq('id', lead.id)
    .in('reservoir_state', ['queued', 'contacted', 'engaged', 'ready', 'verified', 'email_found', 'qualified']);
  // A prospect who rang a partner's line becomes that partner's lead, unless
  // somebody already owns them. Never steals; the filter is the rule.
  if (line && !lead.affiliate_id) {
    await sb
      .from('outbound_leads')
      .update({ affiliate_id: line.affiliateId, origin: 'partner' })
      .eq('id', lead.id)
      .is('affiliate_id', null);
  }
}

/* ───────── Whose line rang ───────── */

/**
 * THE LINE A CALL CAME IN ON, AND WHOSE IT IS.
 *
 * Mr. Mustard answers more than one number. A line printed on a partner's cards
 * is that partner's line (lib/vapi-lines.ts LINE_PARTNERS), and a call that
 * arrives on it credits them everywhere the call leaves a mark: the lead's
 * owner, the built demo's affiliate_id, the ref code on every emailed link, and
 * Sarah's summary. Vapi puts the number's id on the call object as
 * `phoneNumberId` (older payloads nest it under `phoneNumber.id`, and some
 * server messages carry `phoneNumber` at the top level), so all three are read.
 * Web calls and calls on the studio line resolve to null and nothing changes.
 */
type LineCredit = { code: string; affiliateId: string; name: string; label: string };

function lineIdOf(callObj: Record<string, unknown>, message: Record<string, unknown>): string | null {
  const direct = callObj.phoneNumberId;
  if (typeof direct === 'string' && direct) return direct;
  const nested = (callObj.phoneNumber as Record<string, unknown> | undefined)?.id;
  if (typeof nested === 'string' && nested) return nested;
  const top = (message.phoneNumber as Record<string, unknown> | undefined)?.id;
  return typeof top === 'string' && top ? top : null;
}

async function lineCreditFor(
  callObj: Record<string, unknown>,
  message: Record<string, unknown>,
): Promise<LineCredit | null> {
  const partner = partnerForLine(lineIdOf(callObj, message));
  if (!partner) return null;
  try {
    // Approved rows only: a paused partner's line stops crediting without a deploy.
    const aff = await getAffiliateByCode(partner.code);
    if (!aff?.code) return null;
    return { code: aff.code, affiliateId: aff.id, name: aff.name || aff.code, label: partner.label };
  } catch {
    return null;
  }
}

const creditNote = (line: LineCredit | null): string | null =>
  line ? `Partner: ${line.name} (${line.code}), call came in on the ${line.label}` : null;
const creditField = (line: LineCredit | null): { label: string; value: string }[] =>
  line ? [{ label: 'Partner credit', value: `${line.name} (${line.code}). The call came in on the ${line.label}.` }] : [];

/* ───────── Webhook entry ───────── */

type VapiToolCall = {
  id: string;
  name?: string;
  arguments?: unknown;
  function?: { name: string; arguments: unknown };
};

/**
 * The acquisition toolbelt (lib/acq/voice-tools.ts). Listed here rather than
 * chained onto the if/else above so the studio line's own seven tools stay
 * visibly untouched: this whole branch is unreachable without acq metadata.
 */
const ACQ_TOOLS = new Set([
  'forge_prospect_agent',
  'email_prospect_demo',
  'send_checkout_link',
  'log_call_outcome',
  'stop_contacting',
]);

/**
 * Carry a booking made on an acquisition call onto the prospect: stage, meeting
 * time, and a stop on every queued sales chase. Best effort by design, because a
 * failure here must never turn a successful booking into a tool error the caller
 * hears about.
 */
async function noteAcqBooking(
  acq: NonNullable<ReturnType<typeof acqContext>>,
  args: { startIso?: string },
  toolResult: string,
): Promise<void> {
  try {
    if (!/"ok"\s*:\s*true/.test(toolResult)) return;
    const sb = getSupabase();
    if (!sb) return;
    await sb
      .from('outbound_leads')
      .update({
        meeting_status: 'booked',
        meeting_at: args.startIso ?? null,
        acq_stage: 'meeting',
        needs_human: null,
      })
      .eq('id', acq.leadId);
    await cancelPendingFor(sb, acq.leadId, ['email', 'followup'], 'They booked Sarah. Sales chasing stops.');
    await recordEvent(sb, {
      leadId: acq.leadId,
      campaignId: acq.campaignId,
      type: 'meeting_booked',
      label: `Booked Sarah${args.startIso ? ` for ${args.startIso}` : ''}`,
      detail: { startIso: args.startIso ?? null },
    });
  } catch (err) {
    console.error('acq booking note failed', err);
  }
}

async function runAcqTool(
  name: string,
  ctx: NonNullable<ReturnType<typeof acqContext>>,
  args: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case 'forge_prospect_agent':
      return handleBuildProspectAgent(ctx, args);
    case 'email_prospect_demo':
      return handleEmailProspectDemo(ctx, args);
    case 'send_checkout_link':
      return handleSendCheckoutLink(ctx, args);
    case 'log_call_outcome':
      return handleLogCallOutcome(ctx, args);
    case 'stop_contacting':
      return handleStopContacting(ctx, args);
    default:
      return JSON.stringify({ ok: false, error: `Unknown tool: ${name}` });
  }
}

/** Vapi call metadata is attacker-shaped until proven otherwise, and `runId`
 *  goes straight into a database lookup. Anything that is not a uuid is not a
 *  demo. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * THE BUILT DEMO BOOKS THE BUSINESS IT IS ROLE-PLAYING.
 *
 * Resolves the demo from its stored run and hands the tool call to
 * lib/demo-booking-tools.ts. Never throws: a thrown error here is dead air on a
 * live call, so every failure comes back as a sentence the agent can say.
 */
async function runDemoBooking(
  runId: string,
  vapiCallId: string | undefined,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const sb = getSupabase();
  if (!sb) {
    return JSON.stringify({
      ok: false,
      instruction: 'The schedule is unreachable. Take their name and number and carry on warmly.',
    });
  }

  /* ⚠️ ALWAYS THROUGH getRun.
   *
   * That table exists and is permanently EMPTY: migration 036 calls itself "the
   * OPTIONAL future upgrade", and the live store is app_state under the key
   * `demo:run:<uuid>`. Reading the table compiles, runs, returns null for
   * every demo ever built, and puts the agent straight back to "the owner will
   * confirm", which is the exact bug this feature exists to kill. */
  const run = await getRun(sb, runId);
  if (!run) {
    return JSON.stringify({
      ok: false,
      instruction: 'This demo has no schedule attached. Take their name and number and carry on warmly.',
    });
  }

  /* ⚠️ THE TIMEZONE IS THE STUDIO'S, NOT THE DEMO BUSINESS'S, AND THAT IS A
   * KNOWN LIMIT. A demo has no verified address, and guessing a zone from a
   * scraped city name is how an agent offers a Nevada roofer a 6am Tuesday. The
   * only consequence inside a demo is which words the agent reads out for a
   * slot it invented from generic hours, and Mountain is the house default
   * everywhere else in this codebase. A PAYING office sets its own real zone at
   * provision time, so nothing a customer relies on inherits this. */
  return runDemoBookingTool(
    sb,
    { id: runId, business: run.business || 'this business', city: run.city || null, hours: run.hours || null },
    'America/Denver',
    vapiCallId ?? null,
    name,
    args,
    /* Sarah finds out the moment it lands, and the lead moves itself onto the
     * dial floor. Behind `after()` so none of it sits in front of the caller's
     * next sentence: a booking alert that adds a second of dead air to the call
     * that produced it is a bad trade. */
    (booked) => after(() => notifyDemoBooking(sb, booked)),
  );
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw as Record<string, unknown>;
}

export async function POST(req: Request) {
  /*
   * Shared-secret check. Vapi sends it as x-vapi-secret, configured either on
   * the assistant or org-wide in the dashboard.
   *
   * env() rather than process.env, because a `vercel env pull` writes the
   * literal string "[SENSITIVE]" over sensitive values and that is TRUTHY. A
   * deploy that picked one up would compare every incoming header against
   * "[SENSITIVE]", 401 every request, and Mr. Mustard would keep answering the
   * phone while silently losing the ability to book, build, transfer or log
   * anything. The call would sound fine and do nothing, which is the worst
   * possible failure mode for a receptionist.
   *
   * A placeholder therefore means "no secret configured", exactly like absent.
   */
  const secret = env('VAPI_WEBHOOK_SECRET');
  if (secret) {
    const got = req.headers.get('x-vapi-secret');
    if (got !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: { message?: Record<string, unknown> };
  try {
    body = (await req.json()) as { message?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const message = body.message ?? {};
  const type = message.type as string;

  if (type === 'tool-calls') {
    // The caller's phone number (inbound calls) is the persistent-memory key.
    const callObj = (message.call ?? {}) as Record<string, unknown>;
    const customer = (callObj.customer ?? {}) as Record<string, unknown>;
    const callerNumber = (customer.number as string) || null;

    // Call metadata rides along on web/desk calls (built with assistantOverrides.metadata).
    // The desk lines carry the surface (admin/client/partner) and the signed-in
    // person's authenticated email, so send_email can target them without re-asking.
    const meta = ((callObj.metadata as Record<string, unknown>) ||
      ((callObj.assistantOverrides as Record<string, unknown>)?.metadata as Record<string, unknown>) ||
      {}) as Record<string, unknown>;
    const deskKind = typeof meta.desk === 'string' ? meta.desk : null;
    const authedEmail = typeof meta.email === 'string' ? meta.email : null;

    // Whose line rang. Null on the studio line, on web calls and on demos.
    const line = await lineCreditFor(callObj, message);

    // An acquisition call carries acq:true plus the prospect it belongs to. His
    // five extra tools only resolve on those calls; on the studio line and every
    // built web demo this is null and nothing below changes.
    const acq = acqContext(meta);

    /* A BUILT DEMO CALL CAN BOOK THE BUSINESS IT IS ROLE-PLAYING.
     *
     * Demos run on Mr. Mustard's assistant with per-call overrides, so the
     * front-office webhook cannot help: it resolves an office by
     * `vapi_assistant_id` and every demo carries HIS id. The demo identity
     * arrives the only way it can, in the metadata lib/demo-agent.ts already
     * attaches, and `runId` is the stored run the persona was built
     * from (business, city, hours).
     *
     * ⚠️ Null on the studio line, on desk calls and on acquisition calls, so
     * check_availability and book_appointment simply do not resolve there. That
     * is deliberate: those three tool names belong to a role-play, and Mr.
     * Mustard must never book a roofing job into anybody's calendar. */
    const demoRunId =
      meta.kind === 'demo-agent' && typeof meta.runId === 'string' && UUID.test(meta.runId)
        ? meta.runId
        : null;

    // Vapi sends toolCallList (new) or toolCalls (older payloads). Handle both.
    const rawCalls = (message.toolCallList ?? message.toolCalls ?? []) as VapiToolCall[];
    const results: { toolCallId: string; result: string }[] = [];
    const liveCallId = typeof callObj.id === 'string' ? callObj.id : null;
    // Off the hot path: the stamp only has to beat a guard that waits seconds.
    if (liveCallId) after(() => noteToolCall(liveCallId));

    for (const call of rawCalls) {
      const fnName = call.function?.name ?? call.name ?? '';
      const args = parseArgs(call.function?.arguments ?? call.arguments);
      let result: string;
      try {
        if (fnName === 'recall_caller') {
          result = await recallForCall(callerNumber, args as { email?: string });
        } else if (fnName === 'get_available_slots') {
          result = await getSlots((args as { fromDate?: string }).fromDate);
        } else if (fnName === 'book_discovery_call') {
          result = await bookSlot(args as Parameters<typeof bookSlot>[0], callerNumber, line);
          // A booking made on an acquisition call is a funnel stage, so it is
          // carried onto the prospect. Without this the Command Center would
          // show a lead stuck at "Mr. Mustard called" who is already on Sarah's
          // calendar, and the chase emails would keep going out.
          if (acq) await noteAcqBooking(acq, args as { startIso?: string }, result);
        } else if (fnName === 'capture_lead') {
          result = await captureLead(args as Parameters<typeof captureLead>[0], callerNumber, line);
        } else if (fnName === 'send_email') {
          result = await sendResourceEmail(args as Parameters<typeof sendResourceEmail>[0], {
            deskKind,
            authedEmail,
            lineRefCode: line?.code ?? null,
          });
        } else if (fnName === 'reach_sarah') {
          result = await reachSarah(args as Parameters<typeof reachSarah>[0], callerNumber, line);
        } else if (fnName === PRESENCE_AUDIT_TOOL) {
          // The free Online Presence Audit, filed through the same code as the
          // /presence-audit form, and the page link texted when a text can go.
          result = await requestAuditFromCall(args as Parameters<typeof requestAuditFromCall>[0], {
            callerNumber,
            callId: typeof callObj.id === 'string' ? callObj.id : null,
            extraFields: creditField(line),
          });
        } else if (fnName === 'forge_demo_suite') {
          result = await buildSuiteFromCall(
            args as Parameters<typeof buildSuiteFromCall>[0],
            callerNumber,
            line ? { affiliateId: line.affiliateId, code: line.code } : null,
          );
        } else if (DEMO_BOOKING_TOOL_NAMES.has(fnName)) {
          result = demoRunId
            ? await runDemoBooking(demoRunId, callObj.id as string | undefined, fnName, args)
            : JSON.stringify({
                ok: false,
                error: 'That tool only exists on a built demo call. Continue without it.',
              });
        } else if (ACQ_TOOLS.has(fnName)) {
          result = acq
            ? await runAcqTool(fnName, acq, args)
            : JSON.stringify({
                ok: false,
                error: 'That tool only exists on an acquisition call. Continue without it.',
              });
        } else {
          result = JSON.stringify({ ok: false, error: `Unknown tool: ${fnName}` });
        }
      } catch (err) {
        console.error(`voice tool ${fnName} failed`, err);
        result = JSON.stringify({ ok: false, error: 'Tool crashed. Apologize and continue without it.' });
      }
      results.push({ toolCallId: call.id, result });
    }

    // If Vapi drops the follow-up turn, the caller hears nothing. The guard
    // runs after this response is sent and nudges the live call if he has not
    // spoken since. lib/voice-dead-air.ts has the incident.
    // Only when this assistant sends speech-update: without those stamps every
    // call would look silent and he would be nudged after every tool.
    const controlUrl = controlUrlOf(callObj);
    const hears = ((message.assistant as { serverMessages?: unknown } | undefined)?.serverMessages ?? []) as unknown[];
    if (liveCallId && controlUrl && results.length && hears.includes('speech-update')) {
      const respondedAt = Date.now();
      const named = rawCalls.map((c, i) => ({
        name: c.function?.name ?? c.name ?? 'tool',
        result: results[i]?.result ?? '',
      }));
      after(() => guardToolSilence({ callId: liveCallId, controlUrl, respondedAt, results: named }));
    }

    return NextResponse.json({ results });
  }

  if (type === 'speech-update') {
    await noteSpeech(message);
    return NextResponse.json({ ok: true });
  }

  if (type === 'end-of-call-report') {
    const ended = (message.call ?? {}) as Record<string, unknown>;
    after(() => clearSpeech(typeof ended.id === 'string' ? ended.id : null));
    // His inbox: what he owes this caller, and the outcome of a call he placed from it.
    after(() => queueInboxExtraction(message));
    after(() => noteFollowUpOutcome(message));
    await handleEndOfCallReport(message);
    return NextResponse.json({ ok: true });
  }

  // status-update, transcript, hang, etc. Acknowledge and move on.
  return NextResponse.json({ ok: true });
}
