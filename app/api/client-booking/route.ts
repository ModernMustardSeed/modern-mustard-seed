import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { getSupabase } from '@/lib/supabase';
import { resendClient } from '@/lib/send-email';
import { sendSms, toE164, smsConfigured } from '@/lib/sms';
import { CLIENT_PROJECTS } from '@/lib/client-leads';
import { checkAnswer } from '@/lib/human-check';
import { creditLead, isCode } from '@/lib/campaigns';
import { KINDS, slotIsOpen, describeSlot, zoneLabel, icsFor, type SlotKind } from '@/lib/client-booking';
import { SITE } from '@/lib/seo';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * A VISITOR BOOKS A TIME WITH THE CLIENT.
 *
 * The appointment row is written first, and the unique index on
 * (project, starts_at) over live rows is what actually prevents a double
 * booking: two people pressing the same slot in the same second means one
 * insert wins and the other is told plainly to pick again. Checking
 * availability before inserting is a courtesy, not the guard.
 *
 * Then a lead row, because a person who books is a lead and belongs in the
 * same pipeline as everyone else. Then the client is told twice, and the
 * visitor gets a confirmation with a calendar file and a link that cancels it
 * without needing an account.
 *
 * Nothing here sets a status a person owns. `booked` is the visitor's own act;
 * done, no-show and cancelled are marks the desk or the portal makes.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cors(res: NextResponse, origin: string | null): NextResponse {
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Vary', 'Origin');
  }
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  return res;
}
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') ?? '';
  for (const p of Object.values(CLIENT_PROJECTS)) if (p.origins.includes(origin)) return origin;
  return null;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return cors(NextResponse.json({ ok: false, error: 'origin not allowed' }, { status: 403 }), null);
  const reply = (body: Record<string, unknown>, status = 200) => cors(NextResponse.json(body, { status }), origin);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return reply({ ok: false, error: 'We could not read that.' }, 400);
  }
  const str = (k: string, max = 400) => {
    const v = body[k];
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
  };

  const projectKey = str('project') ?? '';
  const project = CLIENT_PROJECTS[projectKey];
  if (!project) return reply({ ok: false, error: 'unknown project' }, 400);
  if (!project.origins.includes(origin)) return reply({ ok: false, error: 'origin not allowed for this project' }, 403);

  const kind = (str('kind') ?? 'consult') as SlotKind;
  const rule = KINDS[kind];
  if (!rule) return reply({ ok: false, error: 'unknown kind' }, 400);

  // The same one-question check every form on the site carries.
  const human = checkAnswer(body.human_token, body.human_answer);
  if (!human.ok) return reply({ ok: false, error: human.reason, human: true }, 400);

  const name = str('name', 120);
  const phone = str('phone', 40);
  const email = str('email', 160);
  if (!name) return reply({ ok: false, error: 'We need a name for the appointment.' }, 400);
  if (!phone && !email) return reply({ ok: false, error: 'A phone number or an email, whichever you prefer.' }, 400);

  const place = str('place', 40) ?? rule.places[0].key;
  if (!rule.places.some((p) => p.key === place)) return reply({ ok: false, error: 'unknown place' }, 400);
  const address = str('address', 240);
  if (rule.needsAddress && !address) return reply({ ok: false, error: 'We need the address of the property so we know where to meet you.' }, 400);

  const at = new Date(str('at', 40) ?? '');
  if (Number.isNaN(at.getTime())) return reply({ ok: false, error: 'That is not a time we can read.' }, 400);

  const sb = getSupabase();
  if (!sb) return reply({ ok: false, error: 'Booking is not available right now. Call us and we will put it in the diary.' }, 503);

  const open = await slotIsOpen(sb, { project: projectKey, clientEmail: project.clientEmail, kind, at });
  if (!open.ok) return reply({ ok: false, error: open.why, taken: true }, 409);

  const campaignRaw = str('campaign', 40);
  const campaign = campaignRaw && isCode(campaignRaw) ? campaignRaw : null;
  const smsConsent = body.sms_consent === 'yes' || body.sms_consent === true;
  const ipHash = createHash('sha256').update(`${req.headers.get('x-forwarded-for') ?? ''}|${projectKey}`).digest('hex').slice(0, 24);

  // The lead first, so the appointment can point at it and the person shows up
  // in the pipeline like anyone else who came through the website.
  let leadId: string | null = null;
  try {
    const { data: lead } = await sb
      .from('client_leads')
      .insert({
        client_email: project.clientEmail,
        project: projectKey,
        source: 'contact',
        sources: ['booking'],
        name, phone, email,
        town: str('town', 80),
        project_type: str('project_type', 80),
        message: [`Booked ${rule.label.toLowerCase()} for ${describeSlot(at)} ${zoneLabel(at)}.`, address ? `At ${address}.` : null, str('notes', 900)].filter(Boolean).join('\n'),
        page: str('page', 200),
        campaign,
        sms_consent: smsConsent,
        ip_hash: ipHash,
        ua: (req.headers.get('user-agent') ?? '').slice(0, 300),
      })
      .select('id')
      .single();
    leadId = (lead?.id as string) ?? null;
    if (campaign && leadId) await creditLead(sb, project.clientEmail, campaign);
  } catch {
    leadId = null; // a lead we could not write must not cost the visitor their appointment
  }

  const { data: appt, error } = await sb
    .from('client_appointments')
    .insert({
      project: projectKey,
      client_email: project.clientEmail,
      lead_id: leadId,
      kind,
      starts_at: at.toISOString(),
      minutes: rule.minutes,
      place,
      name, phone, email,
      town: str('town', 80),
      project_type: str('project_type', 80),
      address,
      notes: str('notes', 900),
      sms_consent: smsConsent,
      campaign,
      ip_hash: ipHash,
      ua: (req.headers.get('user-agent') ?? '').slice(0, 300),
    })
    .select('id, cancel_token')
    .single();

  // 23505 is the unique index doing its job: somebody else took this minute
  // between the check and the insert.
  if (error?.code === '23505') return reply({ ok: false, error: 'Somebody took that time a moment before you. Pick another and it is yours.', taken: true }, 409);
  if (error || !appt) return reply({ ok: false, error: 'We could not save that. Call us and we will put it in the diary.' }, 500);

  const when = `${describeSlot(at)} ${zoneLabel(at)}`;
  const placeLabel = rule.places.find((p) => p.key === place)?.label ?? place;
  const cancelUrl = `${SITE.url}/api/client-booking/cancel?t=${appt.cancel_token}`;
  const notified: Record<string, unknown> = {};

  // Tell the client, twice.
  const short = [`Booked: ${name}, ${rule.label.toLowerCase()}, ${when}.`, placeLabel, phone ? `Call ${phone}` : email ? `Email ${email}` : null, address ? address : null]
    .filter(Boolean)
    .join(' ');
  if (project.notify.phone && toE164(project.notify.phone)) {
    const sms = await sendSms(project.notify.phone, short);
    notified.sms = sms.ok ? { ok: true, sid: sms.sid } : { ok: false, error: sms.error, configured: sms.configured };
  }

  const lines = [
    `${name} booked ${rule.label.toLowerCase()}.`,
    `When: ${when}`,
    `Where: ${placeLabel}${address ? `, ${address}` : ''}`,
    phone ? `Phone: ${phone}` : null,
    email ? `Email: ${email}` : null,
    str('project_type', 80) ? `Project: ${str('project_type', 80)}` : null,
    str('notes', 900) ? `They said: ${str('notes', 900)}` : null,
    smsConsent ? 'They said yes to texts.' : null,
  ].filter(Boolean) as string[];

  try {
    const resend = resendClient();
    // When a text could not go, the email says so, because a notification
    // nobody is told about is the same as no notification at all.
    const smsNote = !project.notify.phone
      ? null
      : (notified.sms as { ok?: boolean; configured?: boolean } | undefined)?.ok
        ? null
        : (notified.sms as { configured?: boolean } | undefined)?.configured === false
          ? 'Texting is not switched on yet, so this email is the only notice that went out.'
          : 'The text did not go through, so this email is the only notice that went out.';
    const sent = await resend.emails.send({
      from: `${project.business} website <sarah@modernmustardseed.com>`,
      to: project.notify.emails,
      cc: ['sarah@modernmustardseed.com'],
      replyTo: email ? [email] : ['sarah@modernmustardseed.com'],
      subject: `Booked: ${name}, ${when}`,
      html: `<div style="font:400 16px/1.55 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:560px;">
        ${lines.map((l) => `<p style="margin:0 0 10px;">${esc(l)}</p>`).join('')}
        ${smsNote ? `<p style="margin:16px 0 0;padding:10px 12px;border-left:4px solid #6d3418;background:#f7efe9;color:#6d3418;">${esc(smsNote)}</p>` : ''}
        <p style="margin:16px 0 0;color:#161616;opacity:.6;font-size:13px;">Every appointment is in your portal at ${SITE.url}/portal, where you can mark it done or move it.</p>
      </div>`,
      text: [...lines, ...(smsNote ? ['', smsNote] : [])].join('\n'),
      attachments: [{
        filename: 'appointment.ics',
        content: Buffer.from(icsFor({
          uid: `${appt.id}@modernmustardseed.com`,
          start: at, minutes: rule.minutes,
          title: `${rule.label} with ${name}`,
          description: lines.join('\n'),
          location: address ?? placeLabel,
          organizer: project.business, organizerEmail: 'sarah@modernmustardseed.com',
        })).toString('base64'),
      }],
    });
    notified.email = { ok: !sent.error, id: sent.data?.id ?? null, error: sent.error?.message ?? null };
  } catch (err) {
    notified.email = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // The visitor hears back at once, with the time, the place, a calendar file
  // and a way out that needs no account.
  const confirmed: Record<string, unknown> = {};
  const first = name.split(/\s+/)[0];
  if (email) {
    try {
      const resend = resendClient();
      const sent = await resend.emails.send({
        from: `${project.business} <sarah@modernmustardseed.com>`,
        to: [email],
        replyTo: [project.notify.emails[0]],
        subject: `You are booked for ${when}`,
        html: `<div style="font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#161616;max-width:520px;">
          <p style="margin:0 0 14px;">${esc(first)}, you are booked.</p>
          <p style="margin:0 0 6px;"><strong>${esc(rule.label)}</strong></p>
          <p style="margin:0 0 6px;">${esc(when)}</p>
          <p style="margin:0 0 14px;">${esc(placeLabel)}${address ? `, ${esc(address)}` : ''}</p>
          <p style="margin:0 0 14px;">The calendar file on this email puts it straight on your calendar. If something changes, call ${esc(project.phone)} or <a href="${cancelUrl}">cancel here</a> and pick another time.</p>
          <p style="margin:0;color:#161616;opacity:.7;">${esc(project.answers)}<br>${esc(project.business)}<br>${esc(project.phone)}</p>
        </div>`,
        text: `${first}, you are booked.\n\n${rule.label}\n${when}\n${placeLabel}${address ? `, ${address}` : ''}\n\nIf something changes, call ${project.phone} or cancel here: ${cancelUrl}\n\n${project.answers}\n${project.business}\n${project.phone}`,
        attachments: [{
          filename: 'appointment.ics',
          content: Buffer.from(icsFor({
            uid: `${appt.id}@modernmustardseed.com`,
            start: at, minutes: rule.minutes,
            title: `${rule.label} with ${project.business}`,
            description: `${placeLabel}${address ? `, ${address}` : ''}. Questions: ${project.phone}.`,
            location: address ?? placeLabel,
            organizer: project.business, organizerEmail: 'sarah@modernmustardseed.com',
          })).toString('base64'),
        }],
      });
      confirmed.email = { ok: !sent.error, id: sent.data?.id ?? null, error: sent.error?.message ?? null };
    } catch (err) {
      confirmed.email = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  if (smsConsent && phone && toE164(phone)) {
    const sms = await sendSms(phone, `${first}, you are booked with ${project.business}: ${when}. ${placeLabel}. Questions, call ${project.phone}.`);
    confirmed.sms = sms.ok ? { ok: true, sid: sms.sid } : { ok: false, error: sms.error, configured: sms.configured };
  }

  await sb.from('client_appointments').update({ notified, confirmed: { ...confirmed, at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', appt.id);

  return reply({
    ok: true,
    id: appt.id,
    when,
    place: placeLabel,
    minutes: rule.minutes,
    cancelUrl,
    // So the page can say something true about what the visitor will receive.
    emailed: Boolean((confirmed.email as { ok?: boolean } | undefined)?.ok),
    texted: Boolean((confirmed.sms as { ok?: boolean } | undefined)?.ok),
    smsLive: smsConfigured(),
  });
}
