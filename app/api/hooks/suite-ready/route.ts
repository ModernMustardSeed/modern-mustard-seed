import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { publishBlockerError } from '@/lib/site-asset-refs.mjs';
import { outreachOnly } from '@/lib/outreach-domain';
import { authorize, recordRefusal, recordSend } from '@/lib/acq/governor';
import { recordEvent, recordEventOnce } from '@/lib/acq/events';
import { startPostDemoSequence } from '@/lib/acq/post-demo';
import { getCampaign } from '@/lib/acq/settings';
import type { AcqProspect } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * THE SUITE-READY ANNOUNCEMENT (Sarah, 2026-07-30: "as soon as the website is
 * also done... it emails them with the total package").
 *
 * So this fires last, not first: the build worker knocks once the website is
 * banked. Nobody is ever pointed at a suite that is still being made.
 *
 * Guards, in order:
 *  - Bearer FORGE_NOTIFY_SECRET (its own secret; not CRON_SECRET, not a session).
 *  - Runtime kill switch in app_state ('suite_ready_emails' {enabled:true}) so
 *    Sarah can arm or stop sends WITHOUT a deploy.
 *  - Fresh demo builds only (no edits, no rebuilds, no paid projects).
 *  - THE DEMO MUST BE PRESENTABLE: self-contained and carrying real imagery,
 *    not a page of blank placeholder fills (2026-08-03, Polly Thompson).
 *  - One announcement per lead ever: the messages note is the dedupe record.
 *  - Not if Sarah already sent the suite by hand after this site was built.
 *  - A campaign prospect passes the outbound governor, like every other
 *    marketing email, and hears from the campaign's own sending address. A
 *    held announcement is written on the card and the daily sweep retries it.
 *
 * And after it sends, it says so where the board looks: `demo_emailed_at`,
 * the acq_sends ledger, the timeline, and the post-demo follow-ups.
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
  // blank fills. The worker seal refuses that now, but this is
  // the surface with the irreversible consequence: a held email can be sent a
  // minute later, a sent one cannot be recalled. So it checks for itself rather
  // than trusting the two gates upstream.
  const unshowable = publishBlockerError(site.html as string | null);
  if (unshowable) {
    return NextResponse.json({ ok: false, skipped: 'the demo is not presentable', reason: unshowable });
  }

  const { data: leadRow } = await supabase.from('outbound_leads').select('*').eq('id', site.lead_id).maybeSingle();
  const lead = leadRow as AcqProspect | null;
  if (!lead?.email) return NextResponse.json({ ok: false, skipped: 'lead has no email' });
  const hubUrl = lead.hub_demo_url || lead.site_demo_url;
  if (!hubUrl) return NextResponse.json({ ok: false, skipped: 'no hub url' });

  // Somebody who opted out is never announced to, whatever was built for them.
  // The Resend suppression list catches most of these downstream; this catches
  // the ones who said no to us directly.
  if (lead.unsubscribed_at || lead.dnc_checked || lead.status === 'dnc') {
    return NextResponse.json({ ok: false, skipped: 'they opted out' });
  }

  /*
   * THE FILM GATE IS GONE (Sarah, 2026-09-10: "no film needed, actually take
   * the film thing out altogether").
   *
   * A walkthrough video used to be the publish gate here: no film, no
   * announcement, and a film older than the site held it too. The intent was
   * right, that nobody is pointed at a half-made suite. The cost landed on the
   * wrong side. Cutting one drove a browser and placed a live call on Sarah's
   * own machine, and on 2026-09-10 one render hung for three and a half hours
   * while finished suites sat unsent behind it.
   *
   * What actually protects the recipient is still here, and it is stricter
   * than a video ever was: the build must be a fresh, ready, lead demo, the
   * page must be presentable, they must not have opted out, and the governor
   * still decides. A suite is finished when the website is built.
   */
  const builtAt = site.built_at ? Date.parse(site.built_at as string) : NaN;

  const { data: prior } = await supabase
    .from('messages')
    .select('id')
    .eq('outbound_lead_id', lead.id)
    .eq('subject', 'Demo suite emailed')
    .limit(1);
  if (prior?.length) return NextResponse.json({ ok: false, skipped: 'already emailed' });

  // AND NOT IF THEY ALREADY HAVE IT. Sarah can send a suite by hand from the
  // card before this ran. If that send went out AFTER this website was
  // built, it pointed at this website, and a second email announcing it is
  // the same news twice. A hand send from before the site existed is a
  // different email about a different suite, and the website is still news.
  const sentAt = lead.demo_emailed_at ? Date.parse(lead.demo_emailed_at) : NaN;
  if (Number.isFinite(sentAt) && Number.isFinite(builtAt) && sentAt >= builtAt) {
    return NextResponse.json({ ok: false, skipped: 'their suite was already sent by hand after this website was built', sentAt: lead.demo_emailed_at });
  }

  /*
   * THE GOVERNOR (2026-09-09).
   *
   * A campaign prospect is somebody we cold-emailed, and this announcement is
   * one more marketing email to them, so it goes through the same gate every
   * other marketing email does: the master switch, the toggle, the window, the
   * allowance, the brakes, and the person's own opt-out state. It used to skip
   * all of that and send from Sarah's personal address, which is exactly what
   * she paused the engine on 2026-09-08 to stop. It also sends from the
   * campaign's address, the outreach subdomain, for the same reason.
   *
   * A held announcement is not lost: the daily suite sweep knocks again, and
   * the hold is written on the prospect's card once a day so it is never a
   * silent no. Sarah can send it by hand from the card at any time, and that
   * send steps past the switches.
   *
   * A self-serve lead (no campaign) typed their own number in and asked for
   * this. That is a reply, not marketing, and it goes as it always has.
   */
  const campaign = lead.acq_campaign_id ? await getCampaign() : null;
  const campaignLead = Boolean(lead.acq_campaign_id && campaign);
  if (campaignLead && campaign) {
    const decision = await authorize({ db: supabase, lead, kind: 'demo', campaign });
    if (!decision.allowed) {
      const reason = decision.reason ?? 'Refused by the outbound governor.';
      await recordRefusal(supabase, lead, campaign.id, reason, 'demo');
      await recordEventOnce(
        supabase,
        {
          leadId: lead.id,
          campaignId: campaign.id,
          type: 'email_failed',
          label: `Their finished suite is waiting to be announced: ${reason}`,
          detail: { held: reason, hubUrl, siteId: site.id },
        },
        24 * 60,
      );
      return NextResponse.json({ ok: false, held: reason, retryAfter: decision.retryAfter });
    }
  }

  const first = (lead.contact_name || '').trim().split(/\s+/)[0] || 'there';
  const biz = lead.business_name || site.business_name || 'your business';
  const subject = `We built ${biz} a demo website (it talks)`;
  const text = [
    `Hi ${first},`,
    '',
    `We went ahead and built ${biz} a working demo: a brand-new website that answers its own phone, with a real voice agent behind it.`,
    '',
    `It is all here, and the short video at the top is a walkthrough of your own: your site and a real call with your own agent: ${hubUrl}`,
    '',
    // No "nothing to set up and nothing owed" here any more. Sarah, 2026-08-04:
    // this email should not talk about cost or effort at the moment we want
    // them valuing what they are looking at.
    `It is yours to poke at for as long as you like. Tap the gold button and talk to the website. If you want it live, or want anything changed, just reply. And if this is not for you, reply "no thanks" and that is the end of it.`,
    '',
    '❤️, Sarah',
    'Modern Mustard Seed · modernmustardseed.com',
  ].join('\n');

  // A campaign prospect hears from the outreach subdomain, and the guard in
  // lib/outreach-domain.ts throws before a byte moves if the campaign row ever
  // drifts back to the root domain. A walk-in asked for this, so it comes from
  // Sarah's own address, which is what the root domain is for.
  const fromName = campaignLead && campaign ? campaign.from_name : 'Sarah at Modern Mustard Seed';
  const fromEmail = campaignLead && campaign ? campaign.from_email : 'sarah@modernmustardseed.com';
  const replyTo = campaignLead && campaign ? campaign.reply_to : 'sarah@modernmustardseed.com';
  const from = campaignLead ? outreachOnly(`${fromName} <${fromEmail}>`) : `${fromName} <${fromEmail}>`;
  const sent = await sendViaResend({
    from,
    to: lead.email,
    replyTo,
    subject,
    text,
    leadId: lead.id,
  });
  if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error });

  const now = new Date().toISOString();
  await supabase.from('messages').insert({
    outbound_lead_id: lead.id,
    direction: 'outbound',
    channel: 'email',
    from_addr: fromEmail,
    to_addr: lead.email,
    subject: 'Demo suite emailed',
    snippet: `Suite-ready email sent (${subject}) with ${hubUrl}`,
    read: true,
    occurred_at: now,
  });

  /*
   * SAY SO WHERE THE BOARD LOOKS (2026-09-09).
   *
   * This route sent fifty-nine suites between July and September and told the
   * acquisition board about none of them. The board reads `demo_emailed_at`
   * for "sent", so every one of those sat under "Built, never sent" with a
   * live send button on it, and on 2026-09-03 four prospects were sent their
   * suite three times in one afternoon because of it. The stamp, the ledger
   * row the ceiling counts, the timeline line, and the follow-up sequence all
   * happen here now, exactly as they do for a send from the card.
   */
  await recordSend(supabase, {
    leadId: lead.id,
    campaignId: campaign?.id ?? null,
    cohortId: lead.acq_cohort_id ?? null,
    kind: 'demo',
    to: lead.email,
    from: fromEmail,
    subject,
    providerMessageId: sent.id,
  });
  await supabase
    .from('outbound_leads')
    .update({
      demo_emailed_at: lead.demo_emailed_at ?? now,
      ...(campaignLead && lead.acq_stage !== 'client' && lead.acq_stage !== 'lost' ? { acq_stage: 'demo_sent', reservoir_state: 'hot' } : {}),
    })
    .eq('id', lead.id);
  const chase = campaignLead && campaign
    ? await startPostDemoSequence(supabase, { leadId: lead.id, campaignId: campaign.id, messageId: sent.id, subject })
    : null;
  await recordEvent(supabase, {
    leadId: lead.id,
    campaignId: campaign?.id ?? null,
    type: 'demo_emailed',
    label: `Their finished suite was emailed to ${lead.email} (website and voice agent)`,
    detail: {
      hubUrl,
      siteId: site.id,
      messageId: sent.id,
      from: fromEmail,
      announcement: true,
      ...(chase
        ? {
            demoNumber: chase.demoNumber,
            followupsQueued: chase.queued,
            drip: chase.drip.enrolled ? `enrolled, next ${chase.drip.nextAt}` : `not enrolled: ${chase.drip.reason ?? 'unknown'}`,
          }
        : {}),
    },
  });

  // Texting was retired 2026-08-01, so email is the whole delivery here.
  return NextResponse.json({ ok: true, id: sent.id });
}
