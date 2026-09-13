import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * SOMEBODY ASKED US TO BUILD SOMETHING.
 *
 * The foot of a presence audit now offers to make a website, a voice agent, or
 * an AI integration plan, and this is where that request lands. It is written
 * BEFORE the visitor is sent to the booking page, on purpose: a person who picks
 * two things and then closes the tab without choosing a time has still told us
 * something worth acting on, and losing that because the last step went
 * unfinished would be the whole point of the page thrown away.
 *
 * WHAT IT DOES NOT DO. It does not set `contacted`. That mark means a person
 * spoke to a person, and a form is not a person. It sets `needs_human`, which is
 * what the Follow Up list reads at rank one, so the request reaches Sarah rather
 * than a queue.
 *
 * It also does not start a build. That is deliberate and it is the change Sarah
 * asked for: the old page handed over a finished demo before anybody wanted one,
 * which reads as eager and spends the most interesting thing we have. The build
 * happens once, after the ask, and gets walked through on the call.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The only things this route will record. Anything else is ignored. */
const WANTS: Record<string, string> = {
  website: 'a website',
  voice: 'a voice agent',
  plan: 'an AI integration plan',
};

export async function POST(req: NextRequest) {
  let body: { leadId?: string; want?: unknown; business?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const leadId = String(body.leadId ?? '');
  if (!UUID.test(leadId)) return NextResponse.json({ ok: false, error: 'Unknown audit.' }, { status: 400 });

  const want = Array.isArray(body.want)
    ? [...new Set(body.want.map(String).filter((w) => w in WANTS))]
    : [];
  if (!want.length) return NextResponse.json({ ok: false, error: 'Nothing selected.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not available.' }, { status: 503 });

  const { data: lead } = await sb
    .from('outbound_leads')
    .select('id, business_name')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ ok: false, error: 'Unknown audit.' }, { status: 404 });

  const asked = want.map((w) => WANTS[w]).join(', ');
  const flag = `Asked for ${asked} off their presence audit. Booking a call to go through it.`;

  await recordEvent(sb, {
    leadId,
    type: 'needs_human',
    label: `${lead.business_name} asked us to build ${asked}`,
    detail: { want, source: 'presence-audit' },
  });

  try {
    await sb
      .from('outbound_leads')
      .update({ needs_human: flag, last_seen_at: new Date().toISOString() })
      .eq('id', leadId);
  } catch {
    /* The event is the record that matters. The flag is how it surfaces. */
  }

  return NextResponse.json({ ok: true });
}
