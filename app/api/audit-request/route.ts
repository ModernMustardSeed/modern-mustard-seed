import { NextResponse, type NextRequest } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { recordEvent } from '@/lib/acq/events';
import { sendViaResend } from '@/lib/send-email';
import { leadNotification } from '@/lib/email';
import { OWNER_NOTIFY_TO } from '@/lib/owner';
import { SITE } from '@/lib/seo';

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
  agents: 'agents that do the work',
  command: 'a command center',
  advisory: 'AI advisory',
  plan: 'an AI integration plan',
};

export async function POST(req: NextRequest) {
  let body: { leadId?: string; auditId?: string; want?: unknown; business?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }

  const leadId = String(body.leadId ?? '');
  const auditId = String(body.auditId ?? '');

  const want = Array.isArray(body.want)
    ? [...new Set(body.want.map(String).filter((w) => w in WANTS))]
    : [];
  if (!want.length) return NextResponse.json({ ok: false, error: 'Nothing selected.' }, { status: 400 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'Not available.' }, { status: 503 });

  // A REQUESTED AUDIT HAS NO LEAD. Somebody who asked for their audit on
  // /presence-audit is not in outbound_leads on purpose (migration 132), so the
  // report page hands over the audit id instead, and the ask is filed on their
  // request and put in front of Sarah by email.
  if (!UUID.test(leadId)) {
    if (!UUID.test(auditId)) return NextResponse.json({ ok: false, error: 'Unknown audit.' }, { status: 400 });
    return askFromRequest(sb, auditId, want);
  }

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

async function askFromRequest(
  sb: NonNullable<ReturnType<typeof getSupabase>>,
  auditId: string,
  want: string[],
) {
  const { data: request } = await sb
    .from('audit_requests')
    .select('id, email, name, business_name, website, score')
    .eq('presence_audit_id', auditId)
    .maybeSingle();
  if (!request) return NextResponse.json({ ok: false, error: 'Unknown audit.' }, { status: 404 });

  await sb.from('audit_requests').update({ wants: want, wants_at: new Date().toISOString() }).eq('id', request.id);

  const asked = want.map((w) => WANTS[w]).join(', ');
  await sendViaResend({
    from: 'Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: OWNER_NOTIFY_TO,
    replyTo: request.email,
    subject: `${request.business_name} asked us to build ${asked}`,
    html: leadNotification({
      type: 'AI Audit',
      name: request.name || request.business_name,
      email: request.email,
      fields: [
        { label: 'Business', value: request.business_name },
        ...(request.website ? [{ label: 'Website', value: request.website, isLink: true }] : []),
        ...(typeof request.score === 'number' ? [{ label: 'Audit score', value: `${request.score} / 100` }] : []),
        { label: 'Wants', value: asked },
        { label: 'Their report', value: `${SITE.url}/demo/audit/${auditId}`, isLink: true },
      ],
      suggestedAction: 'They were sent to the booking page next. If no call lands on the calendar today, write to them.',
    }),
  }).catch((e) => console.error('audit-request owner notice failed:', e));

  return NextResponse.json({ ok: true });
}
