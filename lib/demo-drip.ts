/**
 * THE DEMO-STATION DRIP: self-serve forgers who have not bought yet get a
 * three-touch email sequence (about day 1, 3, and 7 after signup) that stops
 * the moment they buy, reply, or a rep moves the lead. Invoked by the
 * outbound-cadence cron (it rides that cron instead of registering a new one;
 * Hobby cron limits have killed deploys before).
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

function dripEmail(lead: OutboundLead, step: number): { subject: string; html: string; snippet: string } {
  const first = lead.contact_name?.trim().split(/\s+/)[0];
  const hi = first ? `Hi ${first},` : 'Hi there,';
  const biz = escape(lead.business_name);
  const hub = lead.hub_demo_url ?? 'https://modernmustardseed.com/demos';
  const trade = TRADE_PRESETS[leadTrade(lead)];
  const tradeWord = trade.label.toLowerCase();
  const cta = { label: 'Open your Demo Suite', url: hub };
  const secondary = { label: 'Book 10 minutes with Sarah', url: 'https://modernmustardseed.com/book' };

  if (step === 0) {
    return {
      subject: `${lead.business_name}, your demos are sitting there warm`,
      snippet: 'Demo drip 1 of 3: come back to the suite.',
      html: clientEmail({
        preheader: 'The receptionist and command center you forged are still live at your hub.',
        greeting: hi,
        body:
          `<p>Yesterday you forged ${biz} a working AI receptionist and a command center${lead.site_demo_status === 'ready' ? ', and the website you queued is finished too' : ''}. They are still live at your private hub, answering to your name.</p>` +
          `<p>Two minutes there is worth more than anything I could write here: call the receptionist and try to stump it, then slide the calculator to see what your missed calls have been costing. Most ${tradeWord} owners are surprised by that number.</p>`,
        cta,
        secondary,
        trackId: lead.id,
        signature: 'Sarah',
      }),
    };
  }
  if (step === 1) {
    return {
      subject: `What one missed call costs a ${tradeWord} business`,
      snippet: 'Demo drip 2 of 3: the money angle.',
      html: clientEmail({
        preheader: 'The math is on your hub, with your demos still live around it.',
        greeting: hi,
        body:
          `<p>In ${tradeWord}, the caller who gets voicemail does not leave a message. They dial the next name, and that ${escape(trade.jobWord)} is gone before you even knew it rang.</p>` +
          `<p>The suite you forged for ${biz} exists to end exactly that: the receptionist answers every call in two rings, books the work, and texts you the details, and the command center shows you every one it caught. It is all still live on your hub, next to the calculator and the order card. If you want it on your real line, it is about a week from yes to live.</p>`,
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
      preheader: 'Your demos stay live; I will just stop writing about them.',
      greeting: hi,
      body:
        `<p>This is my last email about the demos, promise. They stay live at your hub either way, so nothing expires and nobody calls you five times.</p>` +
        `<p>If the timing is wrong, ignore me with a clear conscience. If the missed calls still sting, the order card on your hub makes ${biz} real in about a week, or grab ten minutes with me and I will answer whatever is in the way.</p>`,
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
    .eq('source', 'demo-station')
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
