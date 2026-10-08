import { BOOTCAMP, OPERATOR, bootcampDays } from '@/data/bootcamp';
import { buildIcsInvite } from '@/lib/ics';
import { SITE } from '@/lib/seo';

/**
 * CALENDAR FILES FOR EVERY DATED MOMENT OF THE BOOTCAMP.
 *
 * Every email links here instead of carrying an attachment, because the
 * tracked send path (sendViaResend) takes html and text and nothing else, and
 * a link the person can tap on a phone does the same job. Sessions are 90
 * minutes, the masterclass is 60, the cohort's first session is 90.
 *
 * The shared builder in lib/ics.ts was written for a chat booking: it writes
 * METHOD:REQUEST and an ATTENDEE line, which is right when we know who is
 * invited. A download from a public link has no attendee, so when none is
 * given the file is reshaped into a plain PUBLISH event. Apple, Google and
 * Outlook import it as "an event" instead of "an invitation to someone else".
 */

export type InviteWhich = 'masterclass' | 'kickoff' | 'day1' | 'day2' | 'day3' | 'operator';

export const INVITE_KEYS: InviteWhich[] = ['masterclass', 'kickoff', 'day1', 'day2', 'day3', 'operator'];

export function isInviteWhich(v: unknown): v is InviteWhich {
  return typeof v === 'string' && (INVITE_KEYS as string[]).includes(v);
}

type InviteSpec = { summary: string; description: string; startIso: string; minutes: number; filename: string };

function dayTitle(n: 1 | 2 | 3): string {
  return bootcampDays.find((d) => d.n === n)?.title ?? `Day ${n}`;
}

const ROOM_NOTE = `The live link arrives by email the morning of, from sarah@modernmustardseed.com. Details: ${SITE.url}/bootcamp`;

export function inviteSpec(which: InviteWhich): InviteSpec {
  const D = BOOTCAMP.dates;
  switch (which) {
    case 'masterclass':
      return {
        summary: `${BOOTCAMP.short}: the free masterclass`,
        description: `Sixty minutes, live. ${BOOTCAMP.promise} ${ROOM_NOTE}`,
        startIso: D.masterclass,
        minutes: 60,
        filename: 'bootcamp-masterclass.ics',
      };
    case 'kickoff':
      return {
        summary: `${BOOTCAMP.short}: kickoff call`,
        description: `Setup done together, so Day 1 starts at speed. ${ROOM_NOTE}`,
        startIso: D.kickoff,
        minutes: 90,
        filename: 'bootcamp-kickoff.ics',
      };
    case 'day1':
      return {
        summary: `${BOOTCAMP.short}, Day 1: ${dayTitle(1)}`,
        description: `${bootcampDays[0]?.lead ?? ''} ${ROOM_NOTE}`,
        startIso: D.day1,
        minutes: 90,
        filename: 'bootcamp-day1.ics',
      };
    case 'day2':
      return {
        summary: `${BOOTCAMP.short}, Day 2: ${dayTitle(2)}`,
        description: `${bootcampDays[1]?.lead ?? ''} ${ROOM_NOTE}`,
        startIso: D.day2,
        minutes: 90,
        filename: 'bootcamp-day2.ics',
      };
    case 'day3':
      return {
        summary: `${BOOTCAMP.short}, Day 3: ${dayTitle(3)}`,
        description: `${bootcampDays[2]?.lead ?? ''} ${ROOM_NOTE}`,
        startIso: D.day3,
        minutes: 90,
        filename: 'bootcamp-day3.ics',
      };
    case 'operator':
      return {
        summary: `${OPERATOR.name}: week 1`,
        description: `${OPERATOR.pitch} ${ROOM_NOTE}`,
        startIso: D.operatorStart,
        minutes: 90,
        filename: 'operator-program-week-1.ics',
      };
  }
}

/** The public link every email uses. */
export function inviteUrl(which: InviteWhich, base: string = SITE.url): string {
  return `${base}/api/bootcamp/invite.ics?which=${which}`;
}

/** Drop the ATTENDEE line (and any folded continuation of it) and publish instead of request. */
function publishable(ics: string): string {
  return ics
    .replace(/^ATTENDEE;[^\r\n]*(?:\r\n [^\r\n]*)*\r\n/m, '')
    .replace(/^METHOD:REQUEST$/m, 'METHOD:PUBLISH');
}

export function bootcampInvite(
  which: InviteWhich,
  attendee?: { email: string; name?: string | null },
): { filename: string; ics: string } {
  const spec = inviteSpec(which);
  const start = new Date(spec.startIso);
  const end = new Date(start.getTime() + spec.minutes * 60_000);
  const raw = buildIcsInvite({
    uid: `bootcamp-${BOOTCAMP.launch}-${which}@modernmustardseed.com`,
    startUtc: start,
    endUtc: end,
    summary: spec.summary,
    description: spec.description,
    location: `${SITE.url}/bootcamp`,
    organizerName: 'Sarah Scarano',
    organizerEmail: SITE.email,
    attendeeName: attendee?.name ?? undefined,
    attendeeEmail: attendee?.email ?? SITE.email,
  });
  return { filename: spec.filename, ics: attendee?.email ? raw : publishable(raw) };
}
