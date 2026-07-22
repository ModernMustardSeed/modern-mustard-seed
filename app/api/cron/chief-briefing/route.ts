/**
 * THE CHIEF: proactive morning briefing.
 *
 * Once a day, every active Chief client gets their wake-up: a verse, a word of
 * encouragement, and a nudge toward the day. v1 delivers by SMS (the call
 * channel rides the same roster once the per-client Vapi line is provisioned).
 * Fails closed: no CRON_SECRET, no send; SMS not sendable (A2P not approved), no
 * send; already briefed today, skip. Never double-texts, never leaks.
 *
 * Cadence: daily. Vercel cron fires it ~7am Mountain (13:00 UTC).
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sendSms, smsSendable, isOptedOut } from '@/lib/sms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Rotating morning verses. Chosen deterministically by day of year (no RNG). */
const VERSES = [
  '“Commit your work to the Lord, and your plans will be established.” Proverbs 16:3',
  '“This is the day the Lord has made; let us rejoice and be glad in it.” Psalm 118:24',
  '“Be strong and courageous. Do not be afraid, for the Lord your God is with you.” Joshua 1:9',
  '“Whatever you do, work heartily, as for the Lord and not for men.” Colossians 3:23',
  '“The Lord will fight for you; you need only to be still.” Exodus 14:14',
  '“Trust in the Lord with all your heart, and do not lean on your own understanding.” Proverbs 3:5',
  '“Let us not grow weary of doing good, for in due season we will reap.” Galatians 6:9',
  '“I can do all things through him who strengthens me.” Philippians 4:13',
  '“She is clothed with strength and dignity, and she laughs without fear of the future.” Proverbs 31:25',
  '“Cast all your anxiety on him, because he cares for you.” 1 Peter 5:7',
  '“The steadfast love of the Lord never ceases; his mercies are new every morning.” Lamentations 3:22-23',
  '“Delight yourself in the Lord, and he will give you the desires of your heart.” Psalm 37:4',
  '“Do not be anxious about anything, but in everything by prayer let your requests be made known to God.” Philippians 4:6',
  '“Those who wait on the Lord shall renew their strength; they shall mount up with wings like eagles.” Isaiah 40:31',
];

function verseForToday(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return VERSES[day % VERSES.length];
}

type ChiefClientRow = {
  email: string;
  first_name: string | null;
  phone: string | null;
  briefing_channel: string;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ ok: false, reason: 'no_db' });

  // Fail closed: if we cannot text (A2P not approved), do not pretend we briefed.
  if (!smsSendable()) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, reason: 'sms_not_sendable' });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('chief_clients')
    .select('email, first_name, phone, briefing_channel')
    .eq('active', true)
    .eq('briefing_channel', 'sms')
    .or(`last_briefed_on.is.null,last_briefed_on.lt.${today}`)
    .limit(500);

  if (error) {
    console.error('chief-briefing query failed', error.message);
    return NextResponse.json({ ok: false, reason: 'query_failed' }, { status: 200 });
  }

  const rows = (data ?? []) as ChiefClientRow[];
  const verse = verseForToday();
  let sent = 0;
  let skipped = 0;

  for (const c of rows) {
    if (!c.phone) {
      skipped++;
      continue;
    }
    // Honor STOP: never text someone who opted out, even a paying client.
    if (await isOptedOut(c.phone)) {
      skipped++;
      continue;
    }
    const name = c.first_name ? `${c.first_name}, ` : '';
    const body = `Good morning ${name}your Chief here.\n\n${verse}\n\nHere for whatever the day needs. Call or text me anytime.`;
    try {
      const res = await sendSms(c.phone, body);
      if (res.ok) {
        sent++;
        await supabase.from('chief_clients').update({ last_briefed_on: today, updated_at: new Date().toISOString() }).eq('email', c.email);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error('chief-briefing send failed for', c.email, err instanceof Error ? err.message : err);
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, total: rows.length });
}
