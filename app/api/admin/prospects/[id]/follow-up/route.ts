import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { auditReportEmail, clientEmail, p } from '@/lib/email';
import type { Prospect } from '@/lib/prospects';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BOOK_URL = 'https://modernmustardseed.com/book';
const AUDIT_URL = 'https://modernmustardseed.com/website-audit';

/**
 * Send a follow-up email to a prospect after the call. If we have run a website
 * audit, this sends the full branded audit report (their score, the three fixes,
 * the to-do list) which is the strongest possible reason to take a meeting. If
 * not, it sends a warm intro. Either way it stamps the touch onto the prospect's
 * notes. Rep-triggered, never automatic, since it is outbound mail.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getSession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  let body: { note?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* note is optional */
  }

  const { data, error } = await supabase.from('rep_prospects').select('*').eq('id', id).single();
  if (error || !data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const prospect = data as Prospect;

  const email = prospect.email?.trim();
  if (!email) return NextResponse.json({ error: 'Add their email first, then send the follow-up.' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Email is not configured.' }, { status: 500 });

  const note = (body.note ?? '').trim();
  let subject: string;
  let html: string;

  if (prospect.audit_json) {
    let domain = prospect.website ?? prospect.audit_url ?? prospect.business;
    try {
      domain = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`).hostname.replace(/^www\./, '');
    } catch {
      /* keep raw */
    }
    subject = `A quick audit of ${domain}`;
    html = auditReportEmail({ url: prospect.website ?? prospect.audit_url ?? domain, report: prospect.audit_json, note: note || undefined, trackId: id });
  } else {
    subject = `Following up from Modern Mustard Seed`;
    html = clientEmail({
      preheader: 'A quick note from Sarah at Modern Mustard Seed.',
      trackId: id,
      greeting: `Hi there,`,
      body:
        (note
          ? p(note.replace(/\n/g, '<br>'))
          : p('Thanks for the few minutes on the phone. Modern Mustard Seed builds AI tools and modern websites for local businesses, so you never miss a call or a booking, even after hours.')) +
        p('The fastest way to see if it is a fit is a quick demo. You can actually talk to the system. Grab a time below, or run a free audit of your site and I will send back exactly what to fix first.'),
      cta: { label: 'Book a 10-min demo', url: BOOK_URL },
      secondary: { label: 'Run the free Website Audit', url: AUDIT_URL },
    });
  }

  const resend = new Resend(apiKey);
  const { error: sendErr } = await resend.emails.send({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to: email,
    replyTo: 'sarah@modernmustardseed.com',
    subject,
    html,
  });
  if (sendErr) {
    console.error('prospect follow-up failed', sendErr);
    return NextResponse.json({ error: 'Email failed to send. Try again.' }, { status: 502 });
  }

  // Log this outbound email on the prospect's correspondence thread.
  await supabase.from('messages').insert({
    prospect_id: id, direction: 'outbound', channel: 'email',
    from_addr: 'sarah@modernmustardseed.com', to_addr: email, subject,
    snippet: prospect.audit_json ? `Sent the website audit (${prospect.audit_score ?? '?'}/100).` : 'Sent an intro email.',
    read: true, occurred_at: new Date().toISOString(),
  });

  // Stamp the touch, and nudge to-contact -> contacted so the board reflects it.
  const stamp = new Date().toISOString().slice(0, 10);
  const prevNotes = prospect.notes ?? '';
  const kind = prospect.audit_json ? 'audit report' : 'intro';
  const update: Record<string, unknown> = {
    notes: `${prevNotes}${prevNotes ? '\n' : ''}[${kind} email sent ${stamp}]`,
    last_email_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (prospect.status === 'to-contact') update.status = 'contacted';
  const { data: updated } = await supabase.from('rep_prospects').update(update).eq('id', id).select('*').single();

  return NextResponse.json({ ok: true, prospect: updated ?? prospect });
}
