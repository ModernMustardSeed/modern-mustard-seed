import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { publishBlockerError } from '@/lib/site-asset-refs.mjs';

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
 *  - THE DEMO MUST BE PRESENTABLE: self-contained and carrying real imagery,
 *    not a page of blank placeholder fills (2026-08-03, Polly Thompson).
 *  - THE FILM MUST EXIST. This is the publish gate.
 *  - THE FILM MUST NOT PREDATE THE SITE, or it is a walkthrough of a page that
 *    no longer exists.
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
    .select('id,lead_id,business_name,status,kind,html,built_at')
    .eq('id', body.siteId)
    .maybeSingle();
  if (!site || site.status !== 'ready' || site.kind === 'edit' || site.kind === 'rebuild' || !site.lead_id) {
    return NextResponse.json({ ok: false, skipped: 'not a fresh ready lead demo' });
  }

  // status='ready' MEANS A BUILD FINISHED, NOT THAT IT IS WORTH SENDING.
  //
  // This route is the last thing between a build and a stranger's inbox, and on
  // 2026-08-03 it put Polly Thompson in front of a page whose photographs were
  // blank fills. The worker seal and the film both refuse that now, but this is
  // the surface with the irreversible consequence: a held email can be sent a
  // minute later, a sent one cannot be recalled. So it checks for itself rather
  // than trusting the two gates upstream.
  const unshowable = publishBlockerError(site.html as string | null);
  if (unshowable) {
    return NextResponse.json({ ok: false, skipped: 'the demo is not presentable', reason: unshowable });
  }

  const { data: lead } = await supabase
    .from('outbound_leads')
    .select('id,business_name,contact_name,email,phone,source,hub_demo_url,site_demo_url,suite_film_status,suite_film_at')
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

  // AND THE FILM MUST BE OF THE SITE THAT EXISTS NOW.
  //
  // The film records the live page at cut time, so anything that rewrites the
  // html afterwards leaves a 'ready' film showing footage of a page nobody can
  // visit any more (a hero swap did exactly this to Kylers Lawncare on
  // 2026-08-02). The email calls that video "a walkthrough of your own", so a
  // stale one is worse than none. Both timestamps already exist; no new column
  // is needed to tell which came last.
  const filmAt = lead.suite_film_at ? Date.parse(lead.suite_film_at as string) : NaN;
  const builtAt = site.built_at ? Date.parse(site.built_at as string) : NaN;
  if (!Number.isFinite(filmAt)) {
    return NextResponse.json({ ok: false, skipped: 'film has no timestamp, cannot prove it matches the site' });
  }
  if (Number.isFinite(builtAt) && builtAt > filmAt) {
    return NextResponse.json({
      ok: false,
      skipped: 'the film predates the current site; re-cut it before announcing',
      filmAt: lead.suite_film_at,
      builtAt: site.built_at,
    });
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

  // Texting was retired 2026-08-01, so email is the whole delivery here.
  return NextResponse.json({ ok: true, id: sent.id });
}
