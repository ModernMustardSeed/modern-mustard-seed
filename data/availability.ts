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

  // 0 = Sunday … 6 = Saturday. Sarah takes consults Wednesday and Thursday only.
  workingWeekdays: [3, 4],

  // Local Mountain Time
  startHour: 11,
  endHour: 14,

  // Each call is this long
  slotMinutes: 30,

  // Don't allow same-day bookings within this many hours of "now"
  minLeadHours: 18,

  // How far ahead the bot is willing to propose
  maxLookaheadDays: 14,

  // Slots offered per propose_call_slots call
  proposeCount: 5,

  // ISO date strings (YYYY-MM-DD) when Sarah is out
  blackoutRanges: [] as { fromDate: string; toDate: string; reason?: string }[],

  // Sarah's permanent Zoho Meeting room. Goes into every calendar invite and
  // booking confirmation so the visitor has the join link immediately.
  conferenceLink: 'https://meet.zoho.com/cgjx-tgt-blf' as string,
} as const;
