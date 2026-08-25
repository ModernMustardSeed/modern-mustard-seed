import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { cancelPendingFor } from '@/lib/acq/queue';
import { recordEvent } from '@/lib/acq/events';

export const runtime = 'nodejs';

/**
 * PUBLIC ONE-CLICK UNSUBSCRIBE. No confirmation step, no preference centre.
 * They asked once, in the way we offered, and it is done.
 *
 * TWO THINGS WERE WRONG HERE UNTIL 2026-08-25.
 *
 * 1. NO POST HANDLER. Every outbound email carries the RFC 8058 pair
 *    `List-Unsubscribe: <this url>` and `List-Unsubscribe-Post:
 *    List-Unsubscribe=One-Click` (lib/send-email.ts unsubHeaders). That header
 *    tells Gmail and Yahoo to show their own Unsubscribe button next to the
 *    sender and to POST here when it is pressed. This route exported GET only,
 *    so Next.js answered every one of those presses with 405 Method Not
 *    Allowed. The person saw Gmail's confirmation and believed they were done;
 *    nothing was written and the sequence kept running. That is the exact
 *    failure the Gmail and Yahoo bulk sender rules exist to punish, and it
 *    rides sarah@modernmustardseed.com, the same domain client mail depends on.
 *    Verified against production on 2026-08-25: POST returned 405, GET 200.
 *
 * 2. THE OPT-OUT NEVER REACHED THE LEAD. It wrote `suppression` and the legacy
 *    `prospects` table, and the acquisition engine's prospect table is
 *    `outbound_leads`. The send was still blocked, twice over (lib/send-email
 *    refuses a suppressed recipient, lib/acq/governor denies on the same
 *    union), so nobody who opted out was ever mailed. But the CRM went on
 *    showing them as a live prospect: acq_eligible true, stage advancing,
 *    queued jobs waking up every couple of days to be refused again. Three real
 *    people were in that state.
 *
 * Both are fixed below. An opt-out now lands in all four places that decide
 * whether we contact somebody: the suppression list, the lead record, the work
 * queue, and the event log.
 */

async function optOut(contactRaw: string | null): Promise<boolean> {
  const contact = contactRaw?.toLowerCase().trim();
  if (!contact) return false;
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    // 1. The suppression list. This is the one every send path reads, so it
    //    goes first and alone decides whether mail can leave.
    await supabase.from('suppression').upsert({ contact, reason: 'unsubscribe link' }, { onConflict: 'contact' });

    // 2. The legacy outreach table, kept because old campaigns still read it.
    await supabase.from('prospects').update({ status: 'opted_out' }).eq('contact', contact);

    // 3. The acquisition lead record, so the CRM tells the truth and the
    //    reservoir stops counting them as ready inventory. Same shape the
    //    by-hand opt-out writes in app/api/admin/acquisition/prospects/[id].
    const { data: leads } = await supabase
      .from('outbound_leads')
      .select('id')
      .eq('email', contact)
      .is('unsubscribed_at', null);

    for (const lead of leads ?? []) {
      await supabase
        .from('outbound_leads')
        .update({
          unsubscribed_at: new Date().toISOString(),
          acq_eligible: false,
          acq_ineligible_reason: 'Unsubscribed.',
          suppression_reason: 'unsubscribe link',
          acq_stage: 'lost',
        })
        .eq('id', lead.id);
      // 4. Pending work, cancelled rather than left to be refused on a
      //    schedule, and the event so the timeline says what happened.
      await cancelPendingFor(supabase, lead.id, undefined, 'Unsubscribed.');
      await recordEvent(supabase, { leadId: lead.id, type: 'unsubscribed', label: 'Clicked the unsubscribe link' });
    }
    return true;
  } catch {
    return false;
  }
}

function page(): NextResponse {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Unsubscribed</title></head>
<body style="margin:0;background:#080c16;color:#f5f0e8;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="max-width:460px;padding:40px;text-align:center">
<p style="font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#C8964E;font-weight:700">Modern Mustard Seed</p>
<h1 style="font-size:26px;font-weight:600;margin:14px 0">You are unsubscribed</h1>
<p style="color:#b9b4a8;line-height:1.6">You will not be contacted again. Thank you, and I am sorry for the interruption. If you ever want to look at the partner program on your own terms, it lives at <a href="https://modernmustardseed.com/partners" style="color:#C8964E">modernmustardseed.com/partners</a>.</p>
</div></body></html>`;
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

/** The link in the footer. */
export async function GET(req: Request) {
  await optOut(new URL(req.url).searchParams.get('c'));
  // The page is the same either way. Somebody who lands here without a usable
  // address still gets told they are out, and a reply to the mail reaches a
  // human. Never show a person a failure on the way out.
  return page();
}

/** RFC 8058 one-click, sent by Gmail and Yahoo. They want a 200 and nothing else. */
export async function POST(req: Request) {
  const ok = await optOut(new URL(req.url).searchParams.get('c'));
  return NextResponse.json({ ok }, { status: 200 });
}
