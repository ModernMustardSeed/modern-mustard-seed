import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import {
  clientEmail,
  bookingConfirmationEmail,
  bookingNotificationEmail,
  leadNotification,
  p,
} from '@/lib/email';
import { insertLead, getSupabase } from '@/lib/supabase';
import { getNextAvailableSlots, isSlotAvailable, displayForIso } from '@/lib/booking';
import { availability } from '@/data/availability';
import { buildIcsInvite } from '@/lib/ics';
import { randomUUID } from 'node:crypto';

/**
 * Vapi server webhook for Mr. Mustard, the MMS voice agent.
 *
 * Voice calls book through the SAME engine as the site chat: lib/booking
 * slots (Mountain Time, Supabase double-booking guard), Resend emails with
 * ICS invites, and the shared leads inbox. One calendar, one source of truth.
 *
 * Handles:
 *  - tool-calls            → get_available_slots / book_discovery_call / capture_lead
 *  - end-of-call-report    → emails Sarah the call summary + transcript
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

/* ───────── Tool implementations (mirrors /api/mustard-chat) ───────── */

async function getSlots(): Promise<string> {
  if (!availability.enabled) {
    return JSON.stringify({
      ok: false,
      error:
        'Booking is paused right now. Offer to take their email instead and Sarah will reach out to schedule directly.',
    });
  }
  const slots = await getNextAvailableSlots();
  if (slots.length === 0) {
    return JSON.stringify({
      ok: false,
      error:
        'No slots are open in the next two weeks. Take their email and Sarah will reach out to schedule.',
    });
  }
  return JSON.stringify({
    ok: true,
    timezoneNote: 'All times are Mountain Time.',
    slots: slots.map((s, i) => ({ index: i + 1, startIso: s.startIso, display: s.display })),
    instruction:
      'Offer the caller two or three of these naturally in speech, like "I have Wednesday at eleven or Thursday at one thirty, Mountain Time." When they pick one, confirm their name and email out loud, then call book_discovery_call with the matching startIso.',
  });
}

async function bookSlot(input: {
  startIso: string;
  name: string;
  email: string;
  business?: string;
  painSummary: string;
}): Promise<string> {
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
        notes: `Discovery call · ${display}${business ? ` · ${business}` : ''} · booked by Mr. Mustard (voice)`,
        timeline: input.startIso,
        status: 'booked',
        source: 'mustard-seed-booking',
        business_name: business ?? null,
      });
    }
  } catch (err) {
    console.error('voice booking insert failed', err);
  }

  // Calendar invites to both sides.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const ics = buildIcsInvite({
        uid: `${randomUUID()}@modernmustardseed.com`,
        startUtc: new Date(input.startIso),
        endUtc: new Date(endIso),
        summary: `Modern Mustard Seed discovery call — Sarah Scarano + ${name}`,
        description: `Discovery call with Sarah Scarano, Modern Mustard Seed.\n\nBooked by Mr. Mustard (voice agent).\n\nWhat the caller said: ${painSummary}\n\nThe Work: https://modernmustardseed.com/work`,
        location: availability.conferenceLink || 'Video link will be sent before the call',
        organizerName: 'Sarah Scarano',
        organizerEmail: 'sarah@modernmustardseed.com',
        attendeeName: name,
        attendeeEmail: email,
      });
      const icsAttachment = { filename: 'discovery-call.ics', content: Buffer.from(ics) };

      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
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

      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName}, you are on my calendar — ${shortLabel}`,
        html: bookingConfirmationEmail({
          firstName,
          whenDisplay: display,
          durationMinutes: availability.slotMinutes,
          painSummary,
          conferenceLink: availability.conferenceLink || undefined,
        }),
        attachments: [icsAttachment],
      });
    } catch (err) {
      console.error('voice booking email failed', err);
    }
  }

  return JSON.stringify({
    ok: true,
    display,
    instruction: `Booked. Confirm warmly and briefly: the call is ${display}, the calendar invite is already in their inbox, and Sarah will see them there. Then ask if there is anything else.`,
  });
}

async function captureLead(input: {
  name?: string;
  email: string;
  painSummary: string;
  business?: string;
}): Promise<string> {
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
      notes: business ? `Business: ${business}` : null,
    });

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
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
          ],
          message: painSummary,
          suggestedAction: 'Speed to lead. Reply or call back today while it is warm.',
        }),
      });
      await resend.emails.send({
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

/* ───────── End-of-call report → Sarah's inbox ───────── */

async function handleEndOfCallReport(message: Record<string, unknown>) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    const summary = (message.summary as string) || 'No summary generated.';
    const transcript = (message.transcript as string) || '';
    const call = (message.call ?? {}) as Record<string, unknown>;
    const customer = (call.customer ?? {}) as Record<string, unknown>;
    const callerNumber = (customer.number as string) || 'Web call';
    const endedReason = (message.endedReason as string) || (call.endedReason as string) || '';
    const durationSeconds = Math.round(Number(message.durationSeconds ?? 0)) || undefined;

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: 'sarah@modernmustardseed.com',
      subject: `Mr. Mustard call summary · ${callerNumber}`,
      html: leadNotification({
        type: 'Contact',
        name: 'Mr. Mustard voice call',
        email: 'sarah@modernmustardseed.com',
        fields: [
          { label: 'Caller', value: callerNumber },
          ...(durationSeconds ? [{ label: 'Duration', value: `${durationSeconds}s` }] : []),
          ...(endedReason ? [{ label: 'Ended', value: endedReason }] : []),
        ],
        message: `${summary}${transcript ? `\n\n--- Transcript ---\n${transcript.slice(0, 6000)}` : ''}`,
        suggestedAction: 'Review the call. Follow up if Mr. Mustard did not close the booking.',
      }),
    });
  } catch (err) {
    console.error('voice end-of-call report email failed', err);
  }
}

/* ───────── Webhook entry ───────── */

type VapiToolCall = {
  id: string;
  name?: string;
  arguments?: unknown;
  function?: { name: string; arguments: unknown };
};

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
  // Shared-secret check (set VAPI_WEBHOOK_SECRET in Vercel and on the assistant).
  const secret = process.env.VAPI_WEBHOOK_SECRET;
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
    // Vapi sends toolCallList (new) or toolCalls (older payloads). Handle both.
    const rawCalls = (message.toolCallList ?? message.toolCalls ?? []) as VapiToolCall[];
    const results: { toolCallId: string; result: string }[] = [];

    for (const call of rawCalls) {
      const fnName = call.function?.name ?? call.name ?? '';
      const args = parseArgs(call.function?.arguments ?? call.arguments);
      let result: string;
      try {
        if (fnName === 'get_available_slots') {
          result = await getSlots();
        } else if (fnName === 'book_discovery_call') {
          result = await bookSlot(args as Parameters<typeof bookSlot>[0]);
        } else if (fnName === 'capture_lead') {
          result = await captureLead(args as Parameters<typeof captureLead>[0]);
        } else {
          result = JSON.stringify({ ok: false, error: `Unknown tool: ${fnName}` });
        }
      } catch (err) {
        console.error(`voice tool ${fnName} failed`, err);
        result = JSON.stringify({ ok: false, error: 'Tool crashed. Apologize and continue without it.' });
      }
      results.push({ toolCallId: call.id, result });
    }

    return NextResponse.json({ results });
  }

  if (type === 'end-of-call-report') {
    await handleEndOfCallReport(message);
    return NextResponse.json({ ok: true });
  }

  // status-update, transcript, hang, etc. Acknowledge and move on.
  return NextResponse.json({ ok: true });
}
