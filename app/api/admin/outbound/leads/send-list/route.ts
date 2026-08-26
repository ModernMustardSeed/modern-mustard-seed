import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LEAD_LIST_FIELDS, listAsText, listDate, normalizeColumns } from '@/lib/lead-list';
import type { ListLead } from '@/lib/lead-list';
import { leadListEmail } from '@/lib/lead-list-email';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';
import { sendViaResend } from '@/lib/send-email';

export const runtime = 'nodejs';

const FROM = 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>';
const REPLY_TO = 'sarah@modernmustardseed.com';

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(1000),
  to: z.array(z.string().email()).min(1).max(5),
  subject: z.string().trim().min(1).max(160).optional(),
  note: z.string().trim().max(2000).optional(),
  title: z.string().trim().max(120).optional(),
  columns: z.array(z.string()).optional(),
});

/**
 * Email a list of leads to anyone Sarah names.
 *
 * This is a one-to-one internal handoff, not marketing: no tracking pixel, no
 * unsubscribe header, no drip enrollment, and it never touches the outbound
 * governor or a lead's own send history. Nothing about the leads changes; the
 * mail just leaves.
 *
 * The rows are re-read from the database by id rather than trusted from the
 * browser, so what lands in the inbox is what the floor actually holds.
 */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;
  const { ids, to, note } = parsed.data;

  const columns = normalizeColumns(parsed.data.columns);
  const title = parsed.data.title?.trim() || 'Outbound leads';
  const subject = parsed.data.subject?.trim() || `${title} (${ids.length}) - ${listDate()}`;

  // Chunked because PostgREST caps how long a single `.in()` list may be.
  const rows: ListLead[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await guard.supabase
      .from('outbound_leads')
      .select(LEAD_LIST_FIELDS)
      .in('id', ids.slice(i, i + 200));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...((data ?? []) as unknown as ListLead[]));
  }
  if (!rows.length) return NextResponse.json({ error: 'None of those leads are on the floor any more.' }, { status: 404 });

  // Re-ordered to the ids the browser sent, so the email reads in the same order
  // as the screen it was built from.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const leads = ids.map((id) => byId.get(id)).filter((l): l is ListLead => !!l);

  const sent = await sendViaResend({
    from: FROM,
    to,
    subject,
    html: leadListEmail({ title, note, leads, columns }),
    text: (note ? `${note}\n\n` : '') + listAsText(leads, columns, title),
    replyTo: REPLY_TO,
    mailbox: REPLY_TO,
  });
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });

  return NextResponse.json({ ok: true, sent: leads.length, to });
}
