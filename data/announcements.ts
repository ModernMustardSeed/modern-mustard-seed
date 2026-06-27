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
  {
    id: 'newks-campaign-2026-06-27',
    emoji: '📣',
    title: "Newk's outreach campaign is loaded and ready to run",
    body: "Polly is the lead on Newk's. The live demo, pricing, the real decision-makers, and a written email for every one of them are all in Campaigns. Open it, copy the email, send it.",
    cta: 'Open Campaigns',
    href: '/admin/campaigns',
  },
];

/** The single most recent announcement, or null if there are none. */
export const latestAnnouncement: Announcement | null = announcements[0] ?? null;
