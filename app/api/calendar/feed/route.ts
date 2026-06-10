import { getSupabase } from '@/lib/supabase';
import { availability } from '@/data/availability';

export const runtime = 'nodejs';

/**
 * Subscribable ICS feed of discovery-call bookings.
 *
 * Subscribe once in Google Calendar (Other calendars -> From URL) or Apple
 * Calendar using:
 *   https://modernmustardseed.com/api/calendar/feed?token=CALENDAR_FEED_TOKEN
 * and every chat/voice booking shows up on the real calendar automatically.
 * Token-protected; no OAuth required.
 */

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export async function GET(req: Request) {
  const token = process.env.CALENDAR_FEED_TOKEN;
  const got = new URL(req.url).searchParams.get('token');
  if (!token || got !== token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = getSupabase();
  if (!supabase) return new Response('Database not configured', { status: 500 });

  const since = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
  const { data } = await supabase
    .from('leads')
    .select('id, name, email, message, timeline, business_name')
    .eq('source', 'mustard-seed-booking')
    .eq('status', 'booked')
    .gte('timeline', since)
    .order('timeline', { ascending: true });

  const location = availability.conferenceLink || 'Video link sent before the call';
  const now = icsDate(new Date());

  const events = (data ?? [])
    .map((l) => {
      const start = new Date(l.timeline as string);
      if (isNaN(start.getTime())) return '';
      const end = new Date(start.getTime() + availability.slotMinutes * 60 * 1000);
      const name = (l.name as string) || 'Visitor';
      const business = (l.business_name as string) || '';
      const summary = `Discovery call — ${name}${business ? ` (${business})` : ''}`;
      const description = `Booked via Modern Mustard Seed.\nEmail: ${l.email}\n\n${(l.message as string) || ''}`;
      return [
        'BEGIN:VEVENT',
        `UID:mms-booking-${l.id}@modernmustardseed.com`,
        `DTSTAMP:${now}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsEscape(summary)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        `LOCATION:${icsEscape(location)}`,
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Discovery call in 15 minutes',
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    })
    .filter(Boolean);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Modern Mustard Seed//Discovery Calls//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:MMS Discovery Calls',
    'X-WR-TIMEZONE:America/Denver',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
