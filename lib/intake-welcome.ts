import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { resendClient } from '@/lib/send-email';

/**
 * The email a client gets the moment their money lands.
 *
 * Between paying and being asked for anything there was a silence, and that
 * silence is where a build stalls: he has paid, nobody has asked him for a
 * logo, and three weeks later somebody notices the site still says Lorem.
 *
 * So payment mints an intake token and sends the one link that turns what he
 * bought into what he owns. Idempotent on the token: a webhook replay finds the
 * key already there and sends nothing twice.
 */

const SITE = 'https://modernmustardseed.com';

export async function sendIntakeWelcome(
  sb: SupabaseClient,
  email: string,
  opts: { name?: string | null; company?: string | null } = {},
): Promise<{ sent: boolean; key?: string; reason?: string }> {
  const { data: client } = await sb
    .from('clients')
    .select('email, name, company, intake_key, intake_welcomed_at')
    .eq('email', email)
    .maybeSingle();

  if (!client) return { sent: false, reason: 'no client row' };

  // Already welcomed. A replayed webhook must not send a second copy: two
  // identical emails read as a mistake and undo the confidence the first built.
  if (client.intake_welcomed_at) {
    return { sent: false, key: client.intake_key as string, reason: 'already welcomed' };
  }

  let key = client.intake_key as string | null;
  if (!key) {
    key = `k_${randomBytes(16).toString('hex')}`;
    const { error } = await sb.from('clients').update({ intake_key: key }).eq('email', email);
    if (error) return { sent: false, reason: `could not mint a key: ${error.message}` };
  }

  const first = String(opts.name ?? client.name ?? '').split(/\s+/)[0] || 'there';
  const who = String(opts.company ?? client.company ?? '') || 'your business';
  const link = `${SITE}/welcome/${key}`;

  const resend = resendClient();
  if (!resend) return { sent: false, key, reason: 'resend not configured' };

  const html = `<div style="font:400 16px/1.6 -apple-system,Segoe UI,sans-serif;color:#14181c;max-width:520px;">
    <p style="margin:0 0 14px;">${first}, that is through. Thank you.</p>
    <p style="margin:0 0 14px;">One thing left before I can build the real one: I need your photos, your logo and your licence number. It is one form and it takes about ten minutes.</p>
    <p style="margin:22px 0;">
      <a href="${link}" style="display:inline-block;background:#C4380C;color:#fff;text-decoration:none;font-weight:700;padding:15px 26px;border:2px solid #14181c;box-shadow:4px 4px 0 #14181c;">Fill it in here</a>
    </p>
    <p style="margin:0 0 14px;">Photos matter most. The pictures on it now are stand-ins and they stay that way until yours arrive. Straight off your phone is perfect.</p>
    <p style="margin:0 0 14px;">Skip anything you are not sure about. I will ring you about the rest.</p>
    <p style="margin:22px 0 0;">Sarah<br><a href="mailto:sarah@modernmustardseed.com" style="color:#C4380C;">sarah@modernmustardseed.com</a></p>
  </div>`;

  try {
    await resend.emails.send({
      from: 'Sarah at Modern Mustard Seed <sarah@modernmustardseed.com>',
      to: [email],
      replyTo: ['sarah@modernmustardseed.com'],
      subject: `${who}: one form and I can start`,
      html,
      text: `${first}, that is through. Thank you.

One thing left before I can build the real one: your photos, your logo and your
licence number. One form, about ten minutes.

${link}

Photos matter most. The pictures on it now are stand-ins and they stay that way
until yours arrive. Straight off your phone is perfect.

Skip anything you are not sure about. I will ring you about the rest.

Sarah
sarah@modernmustardseed.com`,
    });
  } catch (err) {
    // The key is minted and stored, so the link works and Sarah can send it by
    // hand. Not marking it welcomed means the next attempt tries again.
    return { sent: false, key, reason: `send failed: ${String(err)}` };
  }

  await sb.from('clients').update({ intake_welcomed_at: new Date().toISOString() }).eq('email', email);
  return { sent: true, key };
}
