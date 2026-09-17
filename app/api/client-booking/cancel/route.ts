import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164 } from '@/lib/sms';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { describeSlot, zoneLabel, KINDS, type SlotKind } from '@/lib/client-booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * THE VISITOR CANCELS, FROM THE LINK IN THEIR OWN CONFIRMATION.
 *
 * No account, no login, no form. The token in the email is the authority, it
 * is a random 16 bytes, and it only ever cancels: it cannot read anything else
 * or change a time. A cancelled row frees the minute again, because the unique
 * index that holds a slot only covers live rows.
 *
 * GET shows a page and does nothing, because a mail client that prefetches
 * links must not be able to cancel somebody's appointment. The page posts back
 * to the same URL, which is the act.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Skin = { ink: string; paper: string; accent: string; accent2: string };
const MMS_SKIN: Skin = { ink: '#161616', paper: '#FBF6EA', accent: '#3f5d34', accent2: '#F5B700' };
/** The client's own colours, so their customer never sees our brand on this page. */
const skinFor = (p?: { office?: { colors: Skin } }): Skin => p?.office?.colors ?? MMS_SKIN;

function page(title: string, body: string, skin: Skin = MMS_SKIN, status = 200): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>
  :root{color-scheme:light;--ink:${skin.ink};--paper:${skin.paper};--accent:${skin.accent};--accent2:${skin.accent2}}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);font:400 16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}
  .card{background:#fff;border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);border-radius:8px;box-shadow:0 18px 50px -28px rgba(0,0,0,.35);padding:clamp(24px,5vw,40px);max-width:520px;width:100%}
  h1{font:700 clamp(24px,4vw,32px)/1.15 Georgia,"Times New Roman",serif;margin:0 0 14px}
  p{margin:0 0 12px}
  .muted{color:color-mix(in srgb,var(--ink) 65%,transparent);font-size:14px}
  button{font:700 13px/1 -apple-system,"Segoe UI",sans-serif;letter-spacing:.12em;text-transform:uppercase;background:var(--accent2);color:var(--ink);border:0;border-radius:3px;padding:16px 22px;min-height:44px;cursor:pointer}
  button:hover{filter:brightness(.93)}
  a{color:var(--accent)}
</style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } }
  );
}

type Appt = {
  id: string; project: string; client_email: string; kind: string; starts_at: string;
  minutes: number; place: string | null; name: string | null; phone: string | null;
  email: string | null; address: string | null; status: string; sms_consent: boolean;
};

async function load(token: string | null): Promise<Appt | null> {
  if (!token || !/^[0-9a-f]{32}$/.test(token)) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb
    .from('client_appointments')
    .select('id, project, client_email, kind, starts_at, minutes, place, name, phone, email, address, status, sms_consent')
    .eq('cancel_token', token)
    .maybeSingle();
  return (data as Appt) ?? null;
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('t');
  const appt = await load(token);
  if (!appt) return page('Link not found', '<h1>We could not find that appointment</h1><p>The link may have expired, or the appointment may already be cancelled. Call us and we will sort it out.</p>');

  const project = CLIENT_PROJECTS[appt.project];
  const at = new Date(appt.starts_at);
  const when = `${describeSlot(at)} ${zoneLabel(at)}`;
  const rule = KINDS[appt.kind as SlotKind];

  if (appt.status === 'cancelled') {
    return page('Already cancelled', `<h1>That one is already cancelled</h1><p>Nothing is in the diary for ${esc(when)}.</p>${project ? `<p class="muted">To book another time, go to <a href="${esc(project.publicUrl)}/book">${esc(project.publicUrl.replace(/^https?:\/\//, ''))}/book</a> or call ${esc(project.phone)}.</p>` : ''}`, skinFor(project));
  }
  if (at.getTime() < Date.now()) {
    return page('That time has passed', `<h1>That appointment has already passed</h1><p>It was ${esc(when)}.</p>${project ? `<p class="muted">Call ${esc(project.phone)} and we will find you another time.</p>` : ''}`, skinFor(project));
  }

  return page(
    'Cancel your appointment',
    `<h1>Cancel this appointment?</h1>
     <p><strong>${esc(rule?.label ?? 'Appointment')}</strong><br>${esc(when)}${appt.address ? `<br>${esc(appt.address)}` : ''}</p>
     <p>We will let ${esc(project?.answers ?? 'the office')} know, and the time goes back on the calendar for somebody else.</p>
     <form method="post"><input type="hidden" name="t" value="${esc(token ?? '')}"><button type="submit">Yes, cancel it</button></form>
     ${project ? `<p class="muted" style="margin-top:18px">Changed your mind? Just close this page. To move it instead, call ${esc(project.phone)}.</p>` : ''}`,
    skinFor(project)
  );
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  let token = url.searchParams.get('t');
  if (!token) {
    try {
      const form = await req.formData();
      token = String(form.get('t') ?? '') || null;
    } catch {
      token = null;
    }
  }
  const appt = await load(token);
  if (!appt) return page('Link not found', '<h1>We could not find that appointment</h1><p>The link may have expired. Call us and we will sort it out.</p>');

  const project = CLIENT_PROJECTS[appt.project];
  const at = new Date(appt.starts_at);
  const when = `${describeSlot(at)} ${zoneLabel(at)}`;
  const rule = KINDS[appt.kind as SlotKind];

  if (appt.status !== 'cancelled') {
    const sb = getSupabase();
    if (!sb) return page('Not right now', '<h1>We could not cancel that just now</h1><p>Call us and we will take it out of the diary.</p>', skinFor(project), 503);
    await sb
      .from('client_appointments')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'visitor', updated_at: new Date().toISOString() })
      .eq('id', appt.id);

    // The client hears about it, because an empty slot they do not know about
    // is a call they will make for nothing.
    if (project) {
      const line = `Cancelled: ${appt.name ?? 'Someone'} is no longer coming ${when}.${appt.phone ? ` Their number is ${appt.phone}.` : ''}`;
      if (project.notify.phone && toE164(project.notify.phone)) await sendSms(project.notify.phone, line);
      try {
        const resend = resendClient();
        await resend.emails.send({
          from: `${project.business} website <sarah@modernmustardseed.com>`,
          to: project.notify.emails,
          cc: ['sarah@modernmustardseed.com'],
          subject: `Cancelled: ${appt.name ?? 'Someone'}, ${when}`,
          html: `<div style="font:400 16px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:520px;"><p>${esc(line)}</p><p style="opacity:.6;font-size:13px;">They cancelled it themselves from the link in their confirmation. The time is open again.</p></div>`,
          text: `${line}\n\nThey cancelled it themselves from the link in their confirmation. The time is open again.`,
        });
      } catch {
        // the cancellation stands whether or not the note went out
      }
    }
  }

  return page(
    'Cancelled',
    `<h1>Cancelled</h1>
     <p>${esc(rule?.label ?? 'The appointment')} on ${esc(when)} is out of the diary, and ${esc(project?.answers ?? 'the office')} has been told.</p>
     ${project ? `<p>When you are ready, pick another time at <a href="${esc(project.publicUrl)}/book">${esc(project.publicUrl.replace(/^https?:\/\//, ''))}/book</a>, or call ${esc(project.phone)}.</p>` : ''}`,
    skinFor(project)
  );
}
