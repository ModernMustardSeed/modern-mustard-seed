/**
 * Sarah's discovery-call availability.
 *
 * The chatbot uses this to surface bookable slots in real time.
 *
 * - Hours are local Mountain Time. The runtime converts to UTC for storage.
 * - The system honors Daylight Saving by computing offset from `Intl` rather
 *   than hardcoding a number.
 * - To pause bookings entirely, set `enabled: false`.
 * - To add a vacation, add an entry to `blackoutRanges` (ISO date strings).
 */

export const availability = {
  enabled: true,

  // 0 = Sunday … 6 = Saturday. Sarah takes consults Tuesday through Friday.
  workingWeekdays: [2, 3, 4, 5],

  // Local Mountain Time. Window is 9:00 AM through 3:00 PM, so the last call
  // starts at 2:30 PM and ends at 3:00.
  startHour: 9,
  endHour: 15,

  // Each call is this long
  slotMinutes: 30,

  // Don't allow same-day bookings within this many hours of "now"
  minLeadHours: 18,

  // How far ahead the bot is willing to propose
  maxLookaheadDays: 14,

  // Curated spread offered each time we propose times. We surface a small, fixed
  // shape (proposePerDay times on each of proposeDays days) instead of dumping
  // every open slot. Because the shape is always the same, the spread never
  // betrays how open or how booked the week actually is, and the visitor always
  // gets a real choice of both day and time.
  proposeDays: 3,
  proposePerDay: 2,

  // ISO date strings (YYYY-MM-DD) when Sarah is out
  blackoutRanges: [] as { fromDate: string; toDate: string; reason?: string }[],

  // Sarah's permanent Zoho Meeting room. Goes into every calendar invite and
  // booking confirmation so the visitor has the join link immediately.
  conferenceLink: 'https://meet.zoho.com/cgjx-tgt-blf' as string,
} as const;
