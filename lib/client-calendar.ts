/**
 * THE CLIENT'S OWN CALENDAR, BY ITS SECRET ADDRESS.
 *
 * A booking page can only make a firm promise if it knows when the client is
 * already busy, and the honest way to learn that is the secret iCal address
 * Google gives every calendar. It is read-only, it is revocable from their side
 * in one click, and it needs no password and no OAuth grant, so nobody has to
 * hand over an account to get real availability.
 *
 * The address IS the secret, so it is validated by fetching it once, then
 * encrypted at rest the same way the Buildertrend token is. It is never shown
 * back, never logged and never emailed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { encryptSecret } from '@/lib/crypto';

const PROVIDER = 'calendar-ics';

export type CalendarStatus = { connected: boolean; events: number | null; error: string | null; connectedAt: string | null };

export async function calendarStatus(sb: SupabaseClient, clientEmail: string): Promise<CalendarStatus> {
  try {
    const { data } = await sb.from('client_integrations').select('status, error, meta, updated_at').eq('client_email', clientEmail).eq('provider', PROVIDER).maybeSingle();
    if (!data || data.status !== 'connected') return { connected: false, events: null, error: (data?.error as string | null) ?? null, connectedAt: null };
    const meta = (data.meta as Record<string, unknown>) ?? {};
    return { connected: true, events: (meta.events as number) ?? null, error: (data.error as string | null) ?? null, connectedAt: data.updated_at as string };
  } catch {
    return { connected: false, events: null, error: null, connectedAt: null };
  }
}

/**
 * Prove the address before trusting it. A secret iCal URL that does not return
 * a VCALENDAR is a typo, an expired link, or somebody's web page; storing it
 * would mean the booking page silently stops honouring the diary.
 */
export async function connectCalendar(
  sb: SupabaseClient,
  clientEmail: string,
  url: string,
  by: string
): Promise<{ ok: true; events: number } | { ok: false; error: string }> {
  const clean = url.trim().replace(/^webcal:/i, 'https:');
  if (!/^https:\/\//i.test(clean)) return { ok: false, error: 'That needs to be the https secret address of the calendar, the one ending in basic.ics.' };

  let text: string;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10_000);
    const res = await fetch(clean, { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, error: `That address answered ${res.status}. In Google Calendar open the calendar's settings, scroll to "Secret address in iCal format", and copy the whole thing.` };
    text = await res.text();
  } catch {
    return { ok: false, error: 'We could not reach that address. Check it is the secret iCal one and try again.' };
  }
  if (!/BEGIN:VCALENDAR/i.test(text)) return { ok: false, error: 'That address does not return a calendar. It should be the secret address in iCal format, not the calendar page.' };

  const events = (text.match(/BEGIN:VEVENT/gi) ?? []).length;
  const enc = encryptSecret(clean);
  const { error } = await sb.from('client_integrations').upsert(
    {
      client_email: clientEmail,
      provider: PROVIDER,
      account_name: 'Secret iCal address',
      access_ciphertext: enc.ciphertext,
      access_iv: enc.iv,
      access_tag: enc.tag,
      status: 'connected',
      error: null,
      meta: { events, connectedBy: by },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_email,provider' }
  );
  if (error) return { ok: false, error: 'We read the calendar but could not save the connection.' };
  return { ok: true, events };
}

export async function disconnectCalendar(sb: SupabaseClient, clientEmail: string): Promise<void> {
  await sb.from('client_integrations').delete().eq('client_email', clientEmail).eq('provider', PROVIDER);
}
