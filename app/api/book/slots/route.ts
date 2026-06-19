import { NextResponse } from 'next/server';
import { getNextAvailableSlots } from '@/lib/booking';
import { availability } from '@/data/availability';

export const runtime = 'nodejs';

/** Public: the next available discovery-call slots for the /book page. */
export async function GET() {
  if (!availability.enabled) return NextResponse.json({ slots: [] });
  const slots = await getNextAvailableSlots();
  return NextResponse.json({
    slots: slots.map((s) => ({ startIso: s.startIso, display: s.display, shortLabel: s.shortLabel, dayLabel: s.dayLabel, timeLabel: s.timeLabel })),
    durationMinutes: availability.slotMinutes,
  });
}
