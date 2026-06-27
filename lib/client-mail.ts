/**
 * Client correspondence helpers. Every email we send a client (welcome,
 * intake auto-reply, admin replies) and every reply they send back is logged
 * to the shared `messages` table, keyed by email address (from_addr / to_addr),
 * so a client's profile can show the full thread without a schema change.
 */
import { getSupabase } from './supabase';

export async function logClientMessage(args: {
  direction: 'inbound' | 'outbound';
  channel?: 'email' | 'open' | 'booking' | 'note';
  fromAddr: string;
  toAddr: string;
  subject?: string;
  body?: string;
  externalId?: string;
  occurredAt?: string;
}): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from('messages').insert({
      direction: args.direction,
      channel: args.channel ?? 'email',
      from_addr: args.fromAddr.toLowerCase(),
      to_addr: args.toAddr.toLowerCase(),
      subject: args.subject ?? null,
      snippet: (args.body ?? '').replace(/\s+/g, ' ').trim().slice(0, 500),
      body: (args.body ?? '').slice(0, 20_000),
      external_id: args.externalId ?? null,
      read: args.direction === 'outbound',
      occurred_at: args.occurredAt ?? new Date().toISOString(),
    });
  } catch (e) {
    console.error('logClientMessage failed:', e);
  }
}

/** Outbound sender identity for client mail, based on who is logged in.
 *  Polly is the contact for her accounts (sends from polly@, replies to her
 *  inbox); everyone else sends from the studio address. */
export function adminSender(user: { name?: string } | null): {
  from: string;
  replyTo: string;
  address: string;
} {
  const name = (user?.name ?? '').toLowerCase();
  if (name.includes('polly')) {
    return {
      from: 'Polly at Modern Mustard Seed <polly@modernmustardseed.com>',
      replyTo: 'thompsonpolly71@gmail.com',
      address: 'polly@modernmustardseed.com',
    };
  }
  const first = (user?.name ?? 'Sarah').trim().split(/\s+/)[0] || 'Sarah';
  return {
    from: `${first} at Modern Mustard Seed <sarah@modernmustardseed.com>`,
    replyTo: 'sarah@modernmustardseed.com',
    address: 'sarah@modernmustardseed.com',
  };
}
