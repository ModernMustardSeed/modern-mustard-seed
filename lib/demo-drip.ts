/**
 * THE DEMO DRIP: forgers who have not bought yet get a three-touch email
 * sequence (about day 1, 3, and 7 after signup) that stops the moment they buy,
 * reply, or a rep moves the lead. Invoked by the outbound-cadence cron (it rides
 * that cron instead of registering a new one; Hobby cron limits have killed
 * deploys before).
 *
 * ⚠️ 2026-08-13: this used to filter `source = 'demo-station'` ONLY, which
 * meant every lead Mr. Mustard forged on a live phone call (source
 * `mr-mustard`) fell out of the funnel the moment the call ended. The warmest
 * leads in the building, the ones who talked to a human-sounding agent and said
 * yes out loud, got a single welcome email and then silence. They are in now.
 *
 * The copy is generated from what was ACTUALLY forged, because he no longer
 * builds all three every time (see lib/voice-forge-suite.ts). Naming a website
 * to someone who only ever asked for a voice agent reads like a mail merge that
 * does not know them, which is exactly the opposite of the pitch.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendViaResend } from '@/lib/send-email';
import { clientEmail, escape } from '@/lib/email';
import { SITE } from '@/lib/seo';
import { leadTrade } from '@/lib/outbound-demo';
import { TRADE_PRESETS } from '@/data/demo-os-trades';
import type { OutboundLead } from '@/lib/outbound';

/* ------------------------------ demo-station drip ------------------------- */

const DRIP_CAP_PER_RUN = 12;
const DRIP_KEY = (id: string) => `demodrip:${id}`;
type DripState = { step: number; at: string };

/** The three touches. Hours are minimums since signup (step 1) or since the
 *  previous touch (steps 2 and 3); the cron runs weekdays so real spacing is
 *  a little looser, which reads more human anyway. */
function dripDue(step: number, ageHrs: number, sinceLastHrs: number): boolean {
  if (step === 0) return ageHrs >= 20;
  if (step === 1) return ageHrs >= 66 && sinceLastHrs >= 40;
  if (step === 2) return ageHrs >= 160 && sinceLastHrs >= 48;
  return false;
}

/** What this lead actually has, read off the row rather than assumed. */
function forgedPieces(lead: OutboundLead): string[] {
  // The command center left the suite on 2026-08-22. A lead forged before that
  // may still carry one, and its page still resolves, but the drip stops naming
  // it: it is sold on its own now and never suggested alongside anything.
  return [
    lead.demo_url ? 'voice agent' : null,
    lead.site_demo_id ? 'website' : null,
  ].filter(Boolean) as string[];
}

/**
 * The free documents, which are not demos and must not be counted as pieces.
 *
 * The suite copy is generated from what was FORGED, and a plan or an audit is
 * neither built nor bought: they are things we wrote about their business.
 * Folding them into `forgedPieces` would make a voice-only lead read as if they
 * took three products, which is the exact mail-merge tell the drip avoids.
 */
function extras(lead: OutboundLead): string[] {
  return [
    lead.presence_audit_url ? 'presence audit' : null,
    lead.integration_plan_status === 'ready' && lead.integration_plan_url ? 'AI Integration Plan' : null,
  ].filter(Boolean) as string[];
}

/**
 * THE JOKE, AND IT IS LOAD BEARING (Sarah, 2026-08-22).
 *
 * It is funny because it is the literal operating model. Everyone in this inbox
 * has been pitched by four agencies this month and handed a working version of
 * their own business by nobody.
 */
const SHOW_DONT_PITCH =
  'We would rather show you than pitch you, mostly because we are terrible at pitching and pretty good at building.';

/**
 * The audit, in one line with its score.
 *
 * A number in an inbox gets clicked and an adjective does not, so the score
 * leads. Renders nothing when no audit exists rather than linking somebody to a
 * page that will greet them with a spinner.
 */
function auditLine(lead: OutboundLead): string {
  if (!lead.presence_audit_url) return '';
  const score = typeof lead.presence_audit_score === 'number' ? lead.presence_audit_score : null;
  return (
    `<p>We also scored you while we were in there${score !== null ? `, and you came out at <strong>${score}/100</strong>` : ''}: ` +
    `<a href="${lead.presence_audit_url}" style="color:#C2261A;font-weight:700;text-decoration:none">your website, your Google profile and your reviews</a>, ` +
    `each graded, with every number showing where it came from.</p>`
  );
}

function andList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? 'demo';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function dripEmail(lead: OutboundLead, step: number): { subject: string; html: string; snippet: string } {
  const first = lead.contact_name?.trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first},` : 'Hi there,';
  const biz = escape(lead.business_name);
  const hub = lead.hub_demo_url ?? 'https://modernmustardseed.com/demos';
  const trade = TRADE_PRESETS[leadTrade(lead)];
  const tradeWord = trade.label.toLowerCase();
  const pieces = forgedPieces(lead);
  const built = andList(pieces);
  const one = pieces.length === 1;
  const hasVoice = pieces.includes('voice agent');
  // On the phone he already told them the calendar is not the next step, so the
  // drip does not contradict him. The order card on the hub is the close, and
  // the secondary is a reply to a human, not a booking link.
  const cta = { label: one ? `Open your ${pieces[0]}` : 'Open your Demo Suite', url: hub };
  const secondary = { label: 'Reply with a question', url: 'mailto:sarah@modernmustardseed.com' };
  // Phone leads talked to Mr. Mustard; self-serve leads clicked a button. Same
  // sequence, but pretending not to know which one is how warm mail goes cold.
  const fromCall = lead.source === 'mr-mustard';

  if (step === 0) {
    return {
      subject: one
        ? `${lead.business_name}, your ${pieces[0]} is sitting there warm`
        : `${lead.business_name}, your demos are sitting there warm`,
      snippet: 'Demo drip 1 of 3: come back to the suite.',
      html: clientEmail({
        preheader: `The ${built} you forged ${one ? 'is' : 'are'} still live at your hub.`,
        greeting: hi,
        body:
          (fromCall
            ? `<p>Yesterday you and Mr. Mustard built ${biz} a working ${built}, live on the phone${lead.site_demo_status === 'ready' ? ', and the website he queued is finished now too' : ''}. ${one ? 'It is' : 'They are'} still live at your private hub, answering to your name.</p>`
            : `<p>Yesterday you forged ${biz} a working ${built}${lead.site_demo_status === 'ready' ? ', and the website you queued is finished too' : ''}. ${one ? 'It is' : 'They are'} still live at your private hub, answering to your name.</p>`) +
          `<p>Two minutes there is worth more than anything I could write here: ${hasVoice ? 'call the voice agent and try to stump it, then slide' : 'slide'} the calculator to see what your missed calls have been costing. Most ${tradeWord} owners are surprised by that number.</p>` +
          auditLine(lead) +
          `<p>${SHOW_DONT_PITCH}</p>`,
        cta,
        secondary,
        trackId: lead.id,
        signature: 'Sarah',
      }),
    };
  }
  if (step === 1) {
    // The money angle has to match the piece they took. Missed calls are the
    // right wound for a voice agent and the wrong one for a website-only lead,
    // who is losing the person that looked them up and found nothing.
    return {
      subject: hasVoice
        ? `What one missed call costs a ${tradeWord} business`
        : `What a stale website costs a ${tradeWord} business`,
      snippet: 'Demo drip 2 of 3: the money angle.',
      html: clientEmail({
        preheader: `The math is on your hub, with your ${built} still live around it.`,
        greeting: hi,
        body:
          (hasVoice
            ? `<p>In ${tradeWord}, the caller who gets voicemail does not leave a message. They dial the next name, and that ${escape(trade.jobWord)} is gone before you even knew it rang.</p>` +
              `<p>The ${built} you forged for ${biz} exists to end exactly that: it answers every call in two rings, books the work, and texts you the details.</p>`
            : `<p>In ${tradeWord}, most people decide about you before they ever speak to you. They look you up, they read for about eight seconds, and if nothing there tells them you are the right call, that ${escape(trade.jobWord)} quietly goes to whoever looked more ready.</p>` +
              `<p>The ${built} you forged for ${biz} exists to end exactly that.</p>`) +
          `<p>It is still live on your hub, next to the calculator and the order card. If you want it real, it is about a week from yes to live.</p>`,
        cta,
        secondary,
        trackId: lead.id,
        signature: 'Sarah',
      }),
    };
  }
  return {
    subject: first ? `Last nudge from me, ${first}` : 'Last nudge from me',
    snippet: 'Demo drip 3 of 3: the honest close.',
    html: clientEmail({
      preheader: `Your ${built} stays live; I will just stop writing about ${one ? 'it' : 'them'}.`,
      greeting: hi,
      body:
        `<p>This is my last email about ${one ? `the ${pieces[0]}` : 'the demos'}, promise. ${one ? 'It stays' : 'They stay'} live at your hub either way, so nothing expires and nobody calls you five times.</p>` +
        `<p>If the timing is wrong, ignore me with a clear conscience. If it still stings, the order card on your hub makes ${biz} real in about a week, and you can just hit reply if something is in the way. A real person reads it.</p>` +
        (extras(lead).length
          ? `<p>Either way the ${andList(extras(lead))} we wrote for ${biz} ${extras(lead).length === 1 ? 'is' : 'are'} yours to keep. No strings, no expiry, and you never have to talk to us again to use ${extras(lead).length === 1 ? 'it' : 'them'}.</p>`
          : ''),
      cta,
      secondary,
      trackId: lead.id,
      signature: 'Sarah',
    }),
  };
}

/**
 * One drip pass. Fail-quiet per lead (an email failure parks that lead for the
 * next run; the state row only advances after a confirmed send).
 */
export async function demoStationDrip(
  sb: SupabaseClient,
  opts: { onlyLeadId?: string } = {},
): Promise<{ sent: number; skipped: number }> {
  const now = Date.now();
  const { data: leads } = await sb
    .from('outbound_leads')
    .select('*')
    .in('source', ['demo-station', 'mr-mustard'])
    .in('status', ['new', 'contacted'])
    .not('email', 'is', null)
    .gte('created_at', new Date(now - 45 * 86400000).toISOString())
    .limit(200);
  const pool = opts.onlyLeadId ? (leads ?? []).filter((l) => l.id === opts.onlyLeadId) : (leads ?? []);
  if (!pool.length) return { sent: 0, skipped: 0 };

  const ids = pool.map((l) => l.id as string);
  const [ordersRes, inboundRes, stateRes] = await Promise.all([
    sb.from('demo_orders').select('outbound_lead_id').in('outbound_lead_id', ids).in('status', ['paid', 'intake_done', 'delivered']),
    sb.from('messages').select('outbound_lead_id').eq('direction', 'inbound').in('outbound_lead_id', ids),
    sb.from('app_state').select('key, value').in('key', ids.map(DRIP_KEY)),
  ]);
  const bought = new Set((ordersRes.data ?? []).map((o) => o.outbound_lead_id as string));
  const talking = new Set((inboundRes.data ?? []).map((m) => m.outbound_lead_id as string));
  const states = new Map<string, DripState>(
    (stateRes.data ?? []).map((r) => [r.key as string, r.value as DripState]),
  );

  let sent = 0;
  let skipped = 0;
  for (const raw of pool as OutboundLead[]) {
    if (sent >= DRIP_CAP_PER_RUN) break;
    // Bought, replied, or a rep moved the lead: the drip's job is done.
    if (bought.has(raw.id) || talking.has(raw.id)) {
      skipped++;
      continue;
    }
    const state = states.get(DRIP_KEY(raw.id)) ?? { step: 0, at: raw.created_at };
    if (state.step >= 3) continue;
    const ageHrs = (now - new Date(raw.created_at).getTime()) / 3600000;
    const sinceLastHrs = (now - new Date(state.at).getTime()) / 3600000;
    if (!dripDue(state.step, ageHrs, sinceLastHrs)) continue;

    const mail = dripEmail(raw, state.step);
    // The demo drip is bulk mail to people who never joined a list, so it needs
    // a visible opt-out AND the RFC 8058 header. Neither existed before
    // 2026-07-20, and the unsubscribe route it points at now actually blocks
    // future sends (the two suppression lists were disconnected until today).
    const unsub = `${SITE.url}/api/outreach/unsubscribe?c=${encodeURIComponent(raw.email!)}`;
    const html =
      mail.html +
      `<div style="text-align:center;font-size:12px;color:#8a857a;padding:18px 0"><a href="${unsub}" style="color:#8a857a">Unsubscribe</a> and I will never email you again.</div>`;
    const result = await sendViaResend({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: raw.email!,
      replyTo: 'sarah@modernmustardseed.com',
      subject: mail.subject,
      html,
      mailbox: 'sarah@modernmustardseed.com',
      unsubscribeUrl: unsub,
    });
    if (!result.ok) {
      console.error(`demo drip send failed for ${raw.id}: ${result.error}`);
      skipped++;
      continue;
    }
    sent++;
    await sb.from('app_state').upsert({ key: DRIP_KEY(raw.id), value: { step: state.step + 1, at: new Date().toISOString() } });
    await sb.from('messages').insert({
      outbound_lead_id: raw.id,
      direction: 'outbound',
      channel: 'email',
      from_addr: 'sarah@modernmustardseed.com',
      to_addr: raw.email,
      subject: mail.subject,
      snippet: mail.snippet,
      read: true,
      occurred_at: new Date().toISOString(),
    });
    // Status stays 'new' on purpose: the drip is a robot, not a rep, and a
    // 'contacted' lead with nothing due would drop out of the dial queue.
    await sb.from('outbound_leads').update({ last_email_at: new Date().toISOString() }).eq('id', raw.id);
  }
  return { sent, skipped };
}
