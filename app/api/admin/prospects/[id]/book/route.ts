import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { randomUUID } from 'node:crypto';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { isSlotAvailable, displayForIso } from '@/lib/booking';
import { availability } from '@/data/availability';
import { buildIcsInvite } from '@/lib/ics';
import { bookingConfirmationEmail, leadNotification } from '@/lib/email';
import { convertProspectToLead } from '@/lib/prospect-lead';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Book a discovery/demo call for a prospect straight from the call card. Reuses
 * the same booking engine as the public site (slot validation, ICS invites,
 * confirmation email), marks the prospect Booked, and promotes it into the
 * pipeline so the appointment shows up in the CRM with the rest of the loop.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { startIso?: string; name?: string; focus?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const startIso = (body.startIso ?? '').trim();
  if (!startIso) return NextResponse.json({ error: 'Pick a time.' }, { status: 400 });

  const { data, error } = await supabase.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const prospect = data as Prospect;

  const email = prospect.email?.trim();
  if (!email) return NextResponse.json({ error: 'Add their email first, then book.' }, { status: 400 });

  const ok = await isSlotAvailable(startIso);
  if (!ok) return NextResponse.json({ error: 'That time was just taken. Pick another.' }, { status: 409 });

  const contactName = (body.name ?? '').trim() || prospect.business;
  const firstName = contactName.split(' ')[0] || 'there';
  const focus =
    (body.focus ?? '').trim() ||
    (prospect.audit_score != null
      ? `Demo after the website audit (scored ${prospect.audit_score}/100). Walk through the top fixes and the AI phone/booking system.`
      : 'Quick demo of the AI phone and booking system for their business.');
  const { display, shortLabel } = displayForIso(startIso);
  const endIso = new Date(new Date(startIso).getTime() + availability.slotMinutes * 60 * 1000).toISOString();

  // Mark Booked on the Tracker.
  await supabase
    .from('rep_prospects')
    .update({ status: 'booked', updated_at: new Date().toISOString() })
    .eq('id', id);

  // Promote into the pipeline as a booked lead, then enrich with the appointment.
  const conv = await convertProspectToLead(supabase, { ...prospect, status: 'booked' }, { status: 'booked' });
  if (conv.ok) {
    await supabase
      .from('leads')
      .update({
        timeline: startIso,
        notes: `Demo booked from the Tracker for ${display}.${prospect.audit_score != null ? ` Site audit: ${prospect.audit_score}/100.` : ''}`,
        follow_up_at: null,
      })
      .eq('id', conv.leadId);
  }

  // Calendar invites + confirmation, same as the public booking flow.
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const ics = buildIcsInvite({
        uid: `${randomUUID()}@modernmustardseed.com`,
        startUtc: new Date(startIso),
        endUtc: new Date(endIso),
        summary: `Modern Mustard Seed demo . Sarah Scarano + ${contactName}`,
        description: `Demo call with Sarah Scarano.\n\n${focus}`,
        location: availability.conferenceLink || 'Video link will be sent before the call',
        organizerName: 'Sarah Scarano',
        organizerEmail: 'sarah@modernmustardseed.com',
        attendeeName: contactName,
        attendeeEmail: email,
      });
      const icsAttachment = { filename: 'demo-call.ics', content: Buffer.from(ics) };

      await resend.emails.send({
        from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
        to: 'sarah@modernmustardseed.com',
        replyTo: email,
        subject: `Booked from Tracker: ${prospect.business} . ${shortLabel}`,
        html: leadNotification({
          type: 'Contact',
          name: contactName,
          email,
          fields: [
            { label: 'When', value: display },
            { label: 'Business', value: prospect.business },
            ...(prospect.city ? [{ label: 'City', value: prospect.city }] : []),
            ...(prospect.audit_score != null ? [{ label: 'Site audit', value: `${prospect.audit_score}/100` }] : []),
            { label: 'Focus', value: focus },
          ],
          message: focus,
          suggestedAction: 'Calendar invite sent to both of you. This came off the cold-call Tracker.',
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
      console.error('prospect book email failed', err);
    }
  }

  return NextResponse.json({ ok: true, display, leadId: conv.ok ? conv.leadId : undefined });
}
