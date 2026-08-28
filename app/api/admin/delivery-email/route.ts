import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { sendViaResend } from '@/lib/send-email';
import { buildDeliveryEmail, type DeliveryLink } from '@/lib/delivery-email';

export const runtime = 'nodejs';

/**
 * Type his address, press send.
 *
 * Sarah, 2026-08-28: "give me place where i can add his email and then i press
 * send, for the intial email with his demos and costs and gbp info and all the
 * things we cover and do."
 *
 * Every link in the email is a `client_files` row on the same card, so the mail
 * and the admin cannot disagree about what he was sent. GET returns the built
 * email so the panel can show her exactly what will go, in the same builder
 * that sends it, rather than a description of it.
 *
 * Sending to a different address than the one on the card is the normal case
 * here and not an edge one: half of these clients are filed under a placeholder
 * because we had no address for them until the call. When she supplies a real
 * one, it is written back to the client record, and every record that keyed on
 * the placeholder is moved with it, because a client filed under two addresses
 * is a client whose card goes empty.
 */

const PLACEHOLDER = /\.invalid$/i;

async function loadCard(email: string) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: client } = await sb
    .from('clients')
    .select('email, name, company')
    .ilike('email', email)
    .maybeSingle();
  if (!client) return null;

  const { data: files } = await sb
    .from('client_files')
    .select('label, url, kind')
    .ilike('client_email', email)
    .order('created_at', { ascending: true });

  return { client, links: (files ?? []) as DeliveryLink[] };
}

/** Preview: build exactly what send would build, and return it unsent. */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ error: 'No client.' }, { status: 400 });

  const card = await loadCard(email);
  if (!card) return NextResponse.json({ error: 'No such client.' }, { status: 404 });

  const built = buildDeliveryEmail({
    firstName: (card.client.name as string | null)?.split(/\s+/)[0] ?? '',
    company: (card.client.company as string | null) || 'your business',
    links: card.links,
  });

  return NextResponse.json({
    ...built,
    links: card.links,
    onFile: card.client.email,
    /** True when the address on the card is a placeholder we invented. */
    needsAddress: PLACEHOLDER.test(String(card.client.email)),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { clientEmail?: string; to?: string; preview?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const clientEmail = String(body.clientEmail ?? '').trim().toLowerCase();
  const to = String(body.to ?? '').trim();
  const preview = Boolean(body.preview);

  if (!clientEmail) return NextResponse.json({ error: 'No client.' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: 'That is not an email address.' }, { status: 400 });
  }
  if (PLACEHOLDER.test(to)) {
    return NextResponse.json(
      { error: 'That is the placeholder address. It bounces. Put his real one in.' },
      { status: 400 },
    );
  }

  const card = await loadCard(clientEmail);
  if (!card) return NextResponse.json({ error: 'No such client.' }, { status: 404 });

  const usable = card.links.filter((l) => !/^(go-live|golive|runbook|call sheet|notes|internal|admin)/i.test(l.label));
  if (!usable.length) {
    return NextResponse.json(
      { error: 'Nothing to send. Add at least one link to his card first.' },
      { status: 400 },
    );
  }

  const built = buildDeliveryEmail({
    firstName: (card.client.name as string | null)?.split(/\s+/)[0] ?? '',
    company: (card.client.company as string | null) || 'your business',
    links: card.links,
    preview,
  });

  const res = await sendViaResend({
    from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
    to,
    subject: built.subject,
    html: built.html,
    text: built.text,
    replyTo: 'sarah@modernmustardseed.com',
    // One to one, not bulk. No unsubscribe header on a message to a customer
    // who is mid-purchase.
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error ?? 'It did not send.' }, { status: 502 });
  }

  // A preview to herself changes nothing about the client. Only a real send does.
  if (!preview) {
    const now = new Date().toISOString();
    const wasPlaceholder = PLACEHOLDER.test(String(card.client.email));

    if (wasPlaceholder) {
      /* His real address arrived with the send. Move every record that keyed on
       * the placeholder, in one pass, because a client filed under two
       * addresses is a client whose card renders empty. Best effort per table:
       * a table that does not exist on this deployment must not stop the rest. */
      const moved = to.toLowerCase();
      const TABLES: Array<[string, string]> = [
        ['clients', 'email'],
        ['client_files', 'client_email'],
        ['client_requests', 'client_email'],
        ['projects', 'client_email'],
        ['client_products', 'client_email'],
        ['client_intake', 'client_email'],
        ['golive_runbooks', 'client_email'],
        ['proposals', 'client_email'],
      ];
      for (const [table, column] of TABLES) {
        try {
          await sb.from(table).update({ [column]: moved }).ilike(column, String(card.client.email));
        } catch {
          /* that table is not on this deployment */
        }
      }
    }

    try {
      await sb.from('client_files').insert({
        client_email: wasPlaceholder ? to.toLowerCase() : clientEmail,
        label: `Sent: the delivery email, ${now.slice(0, 10)}`,
        url: `mailto:${to}`,
        kind: 'doc',
      });
    } catch {
      /* the record of the send is nice to have, not a reason to fail it */
    }
  }

  return NextResponse.json({
    ok: true,
    to,
    preview,
    subject: built.subject,
    /** Set when the send also moved him off the placeholder address. */
    movedTo: !preview && PLACEHOLDER.test(String(card.client.email)) ? to.toLowerCase() : null,
  });
}
