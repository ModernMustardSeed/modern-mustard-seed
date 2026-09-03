import { NextResponse } from 'next/server';
import { normalizeFacebookUrl } from '@/lib/acq/facebook';
import { requireAcqAdmin, suppressedAddresses } from '@/lib/acq/server';
import { timelineFor, recordEvent } from '@/lib/acq/events';
import { getCampaign, getAcqSettings, getVariants, pickVariant } from '@/lib/acq/settings';
import { buildCampaignEmail } from '@/lib/acq/campaign';
import { enqueue, cancelPendingFor } from '@/lib/acq/queue';
import { evaluate, sequenceLength } from '@/lib/acq/eligibility';
import { buildProspectAgent } from '@/lib/acq/build';
import { buildProspectSuite, queueProspectSite, suiteState } from '@/lib/acq/suite';
import { sendDemoEmail, sendSuiteEmail, sendCheckoutLink, checkoutUrlFor } from '@/lib/acq/send';
import { buildPrepBrief } from '@/lib/acq/brief';
import type { AcqProspect } from '@/lib/acq/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Every send on this route is one named person, chosen by hand, on a card
 * somebody had to open first. The governor's pacing exists to stop a MACHINE
 * from running away: the adaptive allowance, the hourly cap, the send window
 * and the minimum gap between emails. None of them describe Sarah picking a
 * prospect and pressing send, and until now they blocked her while the bulk
 * "send demos now" button sailed straight through with an override. That was
 * backwards.
 *
 * This lifts the pacing and NOTHING else. An unsubscribe, a suppression, a
 * previous hard bounce, a do-not-contact flag, an unmailable address and the
 * hard rolling ceiling all still refuse, exactly as they do everywhere else.
 * See `override` in lib/acq/governor.ts for the full list.
 */
const BY_HAND = { reason: 'Sent by hand from the prospect card.' } as const;

/** Everything about one prospect: the record, the timeline, the calls, the
 *  exact email that would go out next, and Sarah's prep brief. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;
  const { id } = await params;

  const { data, error } = await db.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
  const lead = data as AcqProspect;

  const campaign = await getCampaign();
  const [timeline, calls, queued, variants] = await Promise.all([
    timelineFor(id),
    db.from('acq_calls').select('*').eq('lead_id', id).order('requested_at', { ascending: false }).limit(20),
    db.from('acq_queue').select('*').eq('lead_id', id).order('run_after', { ascending: true }).limit(30),
    campaign ? getVariants(campaign.id) : Promise.resolve([]),
  ]);

  const { data: consents } = await db.from('acq_consents').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(10);
  const { data: messages } = await db
    .from('messages')
    .select('id,direction,channel,subject,snippet,occurred_at,status')
    .eq('outbound_lead_id', id)
    .order('occurred_at', { ascending: false })
    .limit(40);

  // The next email, rendered exactly as it would ship, so nothing is a surprise.
  let nextEmail: { subject: string; html: string; step: number; variant: string } | null = null;
  if (campaign && lead.email) {
    const step = (lead.email_stage ?? 0) + 1;
    const variant = pickVariant(variants, step, lead.id);
    if (variant) {
      const built = buildCampaignEmail({
        lead,
        variant,
        step,
        fromName: campaign.from_name,
        fromEmail: campaign.from_email,
        replyTo: campaign.reply_to,
      });
      if (built) nextEmail = { subject: built.subject, html: built.html, step, variant: variant.key };
    }
  }

  const callRows = (calls.data ?? []) as { summary: string | null; transcript: string | null; intel: unknown; duration_sec: number | null; roleplay_scenario: string | null }[];

  return NextResponse.json({
    lead,
    timeline,
    calls: callRows,
    queue: queued.data ?? [],
    consents: consents ?? [],
    messages: messages ?? [],
    nextEmail,
    checkoutUrl: checkoutUrlFor(lead),
    suite: suiteState(lead),
    brief: buildPrepBrief(lead, callRows),
  });
}

/** Per-prospect actions and edits. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireAcqAdmin();
  if ('error' in gate) return gate.error;
  const { db } = gate;
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? '');

  const { data } = await db.from('outbound_leads').select('*').eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Prospect not found.' }, { status: 404 });
  const lead = data as AcqProspect;
  const campaign = await getCampaign();

  switch (action) {
    case 'patch': {
      const patch: Record<string, unknown> = {};
      for (const k of ['business_name', 'contact_name', 'contact_title', 'email', 'phone', 'website', 'city', 'state', 'trade', 'service_area', 'assigned_to', 'rep_notes', 'needs_human']) {
        if (body[k] !== undefined) patch[k] = body[k] === '' ? null : String(body[k]).slice(0, 2000);
      }
      if (body.facebook_url !== undefined) {
        // A hand paste is the strongest source there is. Anything that is not a
        // page (a search, a post, a group) is refused rather than stored wrong.
        const raw = String(body.facebook_url ?? '').trim();
        if (!raw) {
          patch.facebook_url = null;
          patch.facebook_source = null;
        } else {
          const page = normalizeFacebookUrl(raw);
          if (!page) return NextResponse.json({ error: 'That is not a Facebook page link. Paste the page URL, like https://www.facebook.com/theirpage' }, { status: 400 });
          patch.facebook_url = page;
          patch.facebook_source = 'hand';
        }
      }
      if (body.lead_score !== undefined) patch.lead_score = Math.max(0, Math.min(100, Number(body.lead_score)));
      if (body.is_test !== undefined) patch.is_test = Boolean(body.is_test);
      if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
      await db.from('outbound_leads').update(patch).eq('id', id);
      await recordEvent(db, { leadId: id, type: 'note', label: `Edited by hand: ${Object.keys(patch).join(', ')}` });
      break;
    }
    case 'recheck-eligibility': {
      const settings = await getAcqSettings();
      const suppressed = await suppressedAddresses(db);
      const { data: fresh } = await db.from('outbound_leads').select('*').eq('id', id).single();
      const verdict = evaluate(fresh as AcqProspect, { suppressed, minLeadScore: settings.min_lead_score });
      await db
        .from('outbound_leads')
        .update({ acq_eligible: verdict.eligible, acq_ineligible_reason: verdict.eligible ? null : verdict.reason })
        .eq('id', id);
      return NextResponse.json({ ok: true, verdict });
    }
    case 'queue-email': {
      if (!campaign) return NextResponse.json({ error: 'No campaign.' }, { status: 500 });
      const step = Math.max(
        1,
        Math.min(sequenceLength(campaign.step_after_days), Number(body.step ?? (lead.email_stage ?? 0) + 1)),
      );
      const res = await enqueue(db, { kind: 'email', leadId: id, campaignId: campaign.id, step, runAfter: new Date() });
      return NextResponse.json({ ok: true, created: res.ok && res.created });
    }
    case 'call-now': {
      if (lead.consent_status !== 'granted') {
        return NextResponse.json(
          { error: 'No consent on file. Mr. Mustard only calls people who asked, so send them the permission link instead.' },
          { status: 409 },
        );
      }
      const res = await enqueue(db, {
        kind: 'call',
        leadId: id,
        campaignId: campaign?.id ?? null,
        step: (lead.call_attempts ?? 0) + 1,
        runAfter: new Date(),
        payload: { phone: lead.phone },
        discriminator: String(Date.now()),
      });
      return NextResponse.json({ ok: true, created: res.ok && res.created });
    }
    /* The instant half: voice agent, command center, hub. No website. */
    case 'forge': {
      const result = await buildProspectAgent(db, lead, {}, { deferHeavy: false });
      return result.ok
        ? NextResponse.json({ ok: true, demoUrl: result.demoUrl, hubUrl: result.hubUrl })
        : NextResponse.json({ error: result.error }, { status: 409 });
    }
    /* The whole thing: voice agent, command center, website, hub. */
    case 'forge-suite': {
      const result = await buildProspectSuite(db, lead, {
        site: body.site !== false,
        designTier: body.designTier === 3 ? 3 : 2,
        talkingWebsite: body.talkingWebsite === true,
        forceSite: body.force === true,
        by: 'prospect',
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
      const { data: after } = await db.from('outbound_leads').select('*').eq('id', id).single();
      return NextResponse.json({
        ok: true,
        created: result.created,
        warnings: result.warnings,
        hubUrl: result.hubUrl,
        siteUrl: result.siteUrl,
        lead: after,
      });
    }
    /* Re-queue the website: the retry for a failure, the rebuild for a stale one. */
    case 'reforge-site': {
      const queued = await queueProspectSite(db, lead, {
        designTier: body.designTier === 3 ? 3 : 2,
        talkingWebsite: body.talkingWebsite === true,
        force: true,
      });
      if (!queued.ok) return NextResponse.json({ error: queued.error }, { status: 409 });
      const { data: after } = await db.from('outbound_leads').select('*').eq('id', id).single();
      return NextResponse.json({ ok: true, note: queued.note, lead: after });
    }
    case 'send-demo': {
      if (!campaign) return NextResponse.json({ error: 'No campaign.' }, { status: 500 });
      const sent = await sendDemoEmail(db, campaign, lead, BY_HAND);
      return sent.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: sent.error }, { status: 409 });
    }
    /* Mail them everything that is finished, with the video leading it. */
    case 'send-suite': {
      if (!campaign) return NextResponse.json({ error: 'No campaign.' }, { status: 500 });
      const sent = await sendSuiteEmail(db, campaign, lead, { resend: body.resend === true }, BY_HAND);
      return sent.ok
        ? NextResponse.json({ ok: true, subject: sent.subject })
        : NextResponse.json({ error: sent.error }, { status: 409 });
    }
    case 'send-checkout': {
      if (!campaign) return NextResponse.json({ error: 'No campaign.' }, { status: 500 });
      const sent = await sendCheckoutLink(db, campaign, lead, body.note ? String(body.note) : undefined, BY_HAND);
      return sent.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: sent.error }, { status: 409 });
    }
    case 'mark-won': {
      const stamp = new Date().toISOString();
      await db
        .from('outbound_leads')
        .update({
          client_status: 'client',
          payment_status: 'paid',
          acq_stage: 'client',
          status: 'won',
          won_at: lead.won_at ?? stamp,
          setup_cents: lead.setup_cents ?? (Number(body.setupCents ?? 0) || null),
          mrr_cents: lead.mrr_cents ?? (Number(body.mrrCents ?? 0) || null),
        })
        .eq('id', id);
      await cancelPendingFor(db, id, undefined, 'They bought. Prospecting stops.');
      await recordEvent(db, { leadId: id, campaignId: campaign?.id ?? null, type: 'purchased', label: 'Marked as a client by hand' });
      break;
    }
    case 'clear-human-flag': {
      await db.from('outbound_leads').update({ needs_human: null }).eq('id', id);
      break;
    }
    case 'unsubscribe': {
      if (lead.email) {
        await db.from('suppression').upsert({ contact: lead.email.toLowerCase(), reason: 'admin opt-out' }, { onConflict: 'contact' });
      }
      await db
        .from('outbound_leads')
        .update({
          unsubscribed_at: new Date().toISOString(),
          acq_eligible: false,
          acq_ineligible_reason: 'Unsubscribed.',
          suppression_reason: String(body.reason ?? 'admin opt-out'),
          acq_stage: 'lost',
        })
        .eq('id', id);
      await cancelPendingFor(db, id, undefined, 'Unsubscribed.');
      await recordEvent(db, { leadId: id, type: 'unsubscribed', label: 'Opted out by hand from the CRM' });
      break;
    }
    case 'note': {
      const note = String(body.note ?? '').trim().slice(0, 4000);
      if (!note) return NextResponse.json({ error: 'Empty note.' }, { status: 400 });
      await recordEvent(db, { leadId: id, campaignId: campaign?.id ?? null, type: 'note', label: note });
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  const { data: fresh } = await db.from('outbound_leads').select('*').eq('id', id).single();
  return NextResponse.json({ ok: true, lead: fresh });
}
