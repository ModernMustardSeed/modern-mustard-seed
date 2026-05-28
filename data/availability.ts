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

  // 0 = Sunday … 6 = Saturday
  workingWeekdays: [1, 2, 3, 4, 5],

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

  // The video link Sarah will send before the call. Placeholder string for now.
  conferenceLink: '' as string,
} as const;
