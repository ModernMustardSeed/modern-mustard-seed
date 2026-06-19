import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { isSlotAvailable, displayForIso } from '@/lib/booking';
import { availability } from '@/data/availability';
import { buildIcsInvite } from '@/lib/ics';
import { getSupabase } from '@/lib/supabase';
import { bookingConfirmationEmail, leadNotification } from '@/lib/email';
import { randomUUID } from 'node:crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  name?: string;
  email?: string;
  business?: string;
  startIso?: string;
  focus?: string;       // what they want to work on (required)
  current?: string;     // where they are now
  success?: string;     // what success looks like
  timeline?: string;
};

/**
 * Direct booking with a prep questionnaire. Validates the slot, records it,
 * sends calendar invites to both sides, a confirmation to the visitor, and a
 * full questionnaire summary to Sarah so she can prepare for the call.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const name = (body.name ?? '').trim().slice(0, 120);
  const email = (body.email ?? '').trim().toLowerCase();
  const startIso = (body.startIso ?? '').trim();
  const focus = (body.focus ?? '').trim().slice(0, 2000);

  if (!name) return NextResponse.json({ error: 'Please add your name.' }, { status: 400 });
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please add a valid email.' }, { status: 400 });
  if (!startIso) return NextResponse.json({ error: 'Please choose a time.' }, { status: 400 });
  if (!focus) return NextResponse.json({ error: 'Tell me what you want to work on.' }, { status: 400 });

  const ok = await isSlotAvailable(startIso);
  if (!ok) return NextResponse.json({ error: 'That time was just taken. Pick another, please.' }, { status: 409 });

  const firstName = name.split(' ')[0] || 'there';
  const business = (body.business ?? '').trim();
  const { display, shortLabel } = displayForIso(startIso);
  const endIso = new Date(new Date(startIso).getTime() + availability.slotMinutes * 60 * 1000).toISOString();

  const summaryLines = [
    `Focus: ${focus}`,
    body.current ? `Where they are now: ${body.current.trim()}` : '',
    body.success ? `Success looks like: ${body.success.trim()}` : '',
    body.timeline ? `Timeline: ${body.timeline}` : '',
  ].filter(Boolean).join('\n');

  // Persist the booking.
  try {
    const client = getSupabase();
    if (client) {
      await client.from('leads').insert({
        type: 'contact',
        name,
        email,
        message: summaryLines,
        notes: `Discovery call (questionnaire) . ${display}${business ? ` . ${business}` : ''}`,
        timeline: startIso,
        status: 'booked',
        source: 'mustard-seed-booking',
        business_name: business || null,
      });
    }
  } catch (err) {
    console.error('book insert failed', err);
  }

  // Calendar invites + emails.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const ics = buildIcsInvite({
        uid: `${randomUUID()}@modernmustardseed.com`,
        startUtc: new Date(startIso),
        endUtc: new Date(endIso),
        summary: `Modern Mustard Seed discovery call . Sarah Scarano + ${name}`,
        description: `Discovery call with Sarah Scarano.\n\n${summaryLines}`,
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
        subject: `Booked: ${name} . ${shortLabel}`,
        html: leadNotification({
          type: 'Contact',
          name,
          email,
          fields: [
            { label: 'When', value: display },
            ...(business ? [{ label: 'Business', value: business }] : []),
            { label: 'Focus', value: focus },
            ...(body.current ? [{ label: 'Where they are now', value: body.current.trim() }] : []),
            ...(body.success ? [{ label: 'Success looks like', value: body.success.trim() }] : []),
            ...(body.timeline ? [{ label: 'Timeline', value: body.timeline }] : []),
          ],
          message: focus,
          suggestedAction: 'Calendar invite sent to both of you. Prep notes above.',
        }),
        attachments: [icsAttachment],
      });

      await resend.emails.send({
        from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: email,
        replyTo: 'sarah@modernmustardseed.com',
        subject: `${firstName}, you are on my calendar . ${shortLabel}`,
        html: bookingConfirmationEmail({
          firstName,
          whenDisplay: display,
          durationMinutes: availability.slotMinutes,
          painSummary: focus,
          conferenceLink: availability.conferenceLink || undefined,
        }),
        attachments: [icsAttachment],
      });
    } catch (err) {
      console.error('book email failed', err);
    }
  }

  return NextResponse.json({ ok: true, display });
}
