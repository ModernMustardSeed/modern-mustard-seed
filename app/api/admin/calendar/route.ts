import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { displayForIso } from '@/lib/booking';
import { availability } from '@/data/availability';

export const runtime = 'nodejs';

/**
 * Upcoming (and recent) discovery-call bookings for the admin calendar.
 * Source of truth: the leads table rows written by the chat and voice
 * booking flows (source='mustard-seed-booking', status='booked').
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email, message, notes, timeline, created_at, business_name')
    .eq('source', 'mustard-seed-booking')
    .eq('status', 'booked')
    .gte('timeline', since)
    .order('timeline', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = Date.now();
  const bookings = (data ?? []).map((l) => {
    const startIso = l.timeline as string;
    const start = new Date(startIso);
    const end = new Date(start.getTime() + availability.slotMinutes * 60 * 1000);
    const { display, shortLabel } = displayForIso(startIso);
    const bookedByVoice = ((l.notes as string) || '').toLowerCase().includes('voice');
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      business: l.business_name ?? null,
      painSummary: l.message ?? '',
      startIso,
      endIso: end.toISOString(),
      display,
      shortLabel,
      isPast: start.getTime() < now,
      bookedAt: l.created_at,
      bookedBy: bookedByVoice ? 'Mr. Mustard (voice)' : 'Chat / site',
    };
  });

  return NextResponse.json({
    bookings,
    conferenceLink: availability.conferenceLink || null,
    slotMinutes: availability.slotMinutes,
  });
}
