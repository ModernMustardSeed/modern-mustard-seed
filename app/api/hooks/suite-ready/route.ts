import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { sendSms, smsSendable, normalizePhone, isOptedOut, withinQuietHours } from '@/lib/sms';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * THE SUITE-READY ANNOUNCEMENT (Sarah, 2026-07-30: "as soon as the website is
 * also done... it emails them with the total package and the video about their
 * stuff", refined 2026-08-01: the video must be a real recording of THEIR site
 * and agent and command center, and cutting it is the FINAL STEP before the
 * suite is published and shown to the client).
 *
 * So this fires last, not first. The forge worker knocks after the film has
 * been cut and uploaded; if the film is not ready the announcement is held,
 * and the worker knocks again on the next attempt. Nobody is ever pointed at a
 * suite whose walkthrough is still being made.
 *
 * Guards, in order:
 *  - Bearer FORGE_NOTIFY_SECRET (its own secret; not CRON_SECRET, not a session).
 *  - Runtime kill switch in app_state ('suite_ready_emails' {enabled:true}) so
 *    Sarah can arm or stop sends WITHOUT a deploy.
 *  - Fresh demo builds only (no edits, no rebuilds, no paid projects).
 *  - THE FILM MUST EXIST. This is the publish gate.
 *  - One announcement per lead ever: the messages note is the dedupe record.
 *
 * The text message is deliberately narrower than the email: it only goes to
 * SELF-SERVE leads, who typed their own number into the demo station asking us
 * to build this. Texting an outbound-sourced lead would be cold SMS, which our
 * A2P registration does not cover (memory: mms-a2p-blocks-cold-texting).
 */
export async function POST(req: Request) {
  const secret = process.env.FORGE_NOTIFY_SECRET;
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL || process.env.supabase_url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.supabase_service_role_key;
  if (!url || !key) return NextResponse.json({ error: 'no supabase config' }, { status: 500 });
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: flag } = await supabase.from('app_state').select('value').eq('key', 'suite_ready_emails').maybeSingle();
  if (!(flag?.value as { enabled?: boolean } | null)?.enabled) {
    return NextResponse.json({ ok: false, disabled: true });
  }

  const body = (await req.json().catch(() => ({}))) as { siteId?: string };
  if (!body.siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const { data: site } = await supabase
    .from('outbound_demo_sites')
    .select('id,lead_id,business_name,status,kind')
    .eq('id', body.siteId)
    .maybeSingle();
  if (!site || site.status !== 'ready' || site.kind === 'edit' || site.kind === 'rebuild' || !site.lead_id) {
    return NextResponse.json({ ok: false, skipped: 'not a fresh ready lead demo' });
  }

  const { data: lead } = await supabase
    .from('outbound_leads')
    .select('id,business_name,contact_name,email,phone,source,hub_demo_url,site_demo_url,suite_film_status')
    .eq('id', site.lead_id)
    .maybeSingle();
  if (!lead?.email) return NextResponse.json({ ok: false, skipped: 'lead has no email' });
  const hubUrl = lead.hub_demo_url || lead.site_demo_url;
  if (!hubUrl) return NextResponse.json({ ok: false, skipped: 'no hub url' });

  // THE PUBLISH GATE. The walkthrough is the last thing made and the first
  // thing they will watch, so the suite is not announced without it.
  if (lead.suite_film_status !== 'ready') {
    return NextResponse.json({ ok: false, skipped: 'suite film not cut yet', filmStatus: lead.suite_film_status ?? null });
  }

  const { data: prior } = await supabase
    .from('messages')
    .select('id')
    .eq('outbound_lead_id', lead.id)
    .eq('subject', 'Demo suite emailed')
    .limit(1);
  if (prior?.length) return NextResponse.json({ ok: false, skipped: 'already emailed' });

  const first = (lead.contact_name || '').trim().split(/\s+/)[0] || 'there';
  const biz = lead.business_name || site.business_name || 'your business';
  const subject = `We built ${biz} a demo website (it talks)`;
  const text = [
    `Hi ${first},`,
    '',
    `We went ahead and built ${biz} a working demo: a brand-new website that answers its own phone, plus a command center that shows every call and booking in one place.`,
    '',
    `It is all here, and the short video at the top is a walkthrough of your own: your site, a real call with your own agent, and your command center: ${hubUrl}`,
    '',
    `Nothing to set up and nothing owed. Look around, tap the gold button, and talk to the website. If you want it live, or want anything changed, just reply. And if this is not for you, reply "no thanks" and that is the end of it.`,
    '',
    '❤️, Sarah',
    'Modern Mustard Seed · modernmustardseed.com',
  ].join('\n');

  const sent = await sendViaResend({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: lead.email,
    replyTo: 'sarah@modernmustardseed.com',
    subject,
    text,
    leadId: lead.id,
  });
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error });

  await supabase.from('messages').insert({
    outbound_lead_id: lead.id,
    direction: 'outbound',
    channel: 'email',
    from_addr: 'sarah@modernmustardseed.com',
    to_addr: lead.email,
    subject: 'Demo suite emailed',
    snippet: `Suite-ready email sent (${subject}) with ${hubUrl}`,
    read: true,
    occurred_at: new Date().toISOString(),
  });

  // The text, for people who asked us for this themselves. Everything about it
  // fails quiet: a suppressed number, a quiet hour, or an unarmed A2P campaign
  // must never turn a delivered suite into a 500.
  let texted: string | null = null;
  const phone = normalizePhone(lead.phone);
  if (phone && lead.source === 'demo-station' && smsSendable() && !withinQuietHours(phone) && !(await isOptedOut(phone))) {
    const smsBody =
      `Hi ${first}, Sarah at Modern Mustard Seed. ${biz}'s demo suite is finished, ` +
      `including a short walkthrough of your own site and a real call with your agent: ${hubUrl} ` +
      `Nothing owed. Reply STOP to opt out.`;
    const res = await sendSms(phone, smsBody).catch(() => ({ ok: false }) as { ok: boolean });
    if (res.ok) {
      texted = phone;
      await supabase.from('messages').insert({
        outbound_lead_id: lead.id,
        direction: 'outbound',
        channel: 'sms',
        to_addr: phone,
        subject: 'Demo suite texted',
        snippet: `Suite-ready text sent with ${hubUrl}`,
        read: true,
        occurred_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ ok: true, id: sent.id, texted });
}
