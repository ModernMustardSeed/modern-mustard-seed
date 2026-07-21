// Team announcements: short, dismissible notices that appear at the top of
// every admin page so nobody misses a launch. Add the newest at the top.
// Each is dismissed per-person on their device (localStorage, keyed by id), so
// bumping the `id` re-shows it to everyone.

export type Announcement = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  cta: string;
  href: string;
};

export const announcements: Announcement[] = [
  // No active announcement. Add the newest at the top to re-show the top-of-admin
  // banner to the whole team (dismissed per-person by id). The Newk's campaign
  // notice was retired 2026-07-21 (Sarah).
];

/** The single most recent announcement, or null if there are none. */
export const latestAnnouncement: Announcement | null = announcements[0] ?? null;
