import { NextResponse } from 'next/server';
import { getNextAvailableSlots, bookingWindow } from '@/lib/booking';
import { availability } from '@/data/availability';

export const runtime = 'nodejs';

/**
 * Public: open discovery-call slots for the /book page and the admin booker.
 * `?from=YYYY-MM-DD` (Mountain Time) starts the spread at a later date so
 * people can book weeks or months out; omitted means "soonest". The response
 * carries the booking window so date pickers can bound themselves.
 */
export async function GET(req: Request) {
  if (!availability.enabled) return NextResponse.json({ slots: [] });
  const fromRaw = new URL(req.url).searchParams.get('from') ?? '';
  const from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw) ? fromRaw : undefined;
  const slots = await getNextAvailableSlots(from);
  const win = bookingWindow();
  return NextResponse.json({
    slots: slots.map((s) => ({ startIso: s.startIso, display: s.display, shortLabel: s.shortLabel, dayLabel: s.dayLabel, timeLabel: s.timeLabel })),
    durationMinutes: availability.slotMinutes,
    window: { maxLookaheadDays: win.maxLookaheadDays, lastDate: win.lastDateStr, lastDateLabel: win.lastDateLabel },
  });
}
