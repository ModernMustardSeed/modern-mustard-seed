import { SITE } from '@/lib/seo';
import { PRESENCE } from '@/data/presence-audit-page';
import type { GuideSection, PartnerGuide } from '@/lib/partner-guide';

/**
 * EVERY TRACKED DOOR INTO THE FREE ONLINE PRESENCE AUDIT, IN ONE PLACE.
 *
 * The request form (components/presence/PresenceRequestForm.tsx) reads the
 * utm_source on the link a visitor arrived by and files the request as
 * `presence-audit:<source>`. The Audit Desk card and the Campaign 28 scoreboard
 * on the Ads Playbook both count by that tag, so a channel is only measurable
 * if its link carries its own utm_source. These are those links.
 *
 * A partner link is the one exception to "the tag is the utm_source": the
 * request route resolves the partner's ref code against approved affiliates and
 * files it as `presence-audit:partner-<code>`, so the desk says whose hand the
 * link came from and the scoreboard can total partners per person.
 *
 * Pure: no server imports, so the partner portal (server), the admin field
 * guide panel (client) and the newsletter (cron) all read the same strings.
 */

export const PRESENCE_AUDIT_PATH = '/presence-audit';

const audit = (params: Record<string, string>) =>
  `${SITE.url}${PRESENCE_AUDIT_PATH}?${new URLSearchParams(params).toString()}`;

/** The button in the Tuesday newsletter. */
export const NEWSLETTER_AUDIT_URL = audit({
  utm_source: 'newsletter',
  utm_medium: 'email',
  utm_campaign: 'presence-audit',
});

/** A partner's personal link: their ref first, so it survives any trimming of the tail. */
export function partnerAuditUrl(code: string): string {
  return audit({
    ref: code,
    utm_source: 'partner',
    utm_medium: 'referral',
    utm_campaign: 'presence-audit',
  });
}

/**
 * Where a door-drop scan goes when it has no report of its own to open: a
 * malformed code, or a code for a lead that is not in the book. Everything
 * printed with a real report keeps landing on that report.
 */
export const DOORDROP_AUDIT_PATH = `${PRESENCE_AUDIT_PATH}?${new URLSearchParams({
  utm_source: 'doordrop',
  utm_medium: 'print',
  utm_campaign: 'presence-audit',
}).toString()}`;

/**
 * The request route's tag for a partner. Lowercase and stripped to the same
 * alphabet the form allows, so `EASTON` files as `presence-audit:partner-easton`.
 */
export function partnerSourceTag(code: string): string {
  return `presence-audit:partner-${code.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40)}`;
}

/* ─────────────────────── the partner's field guide section ─────────────────────── */

export const AUDIT_GUIDE_HEADING = 'The free audit to hand out';

/**
 * The section every partner's field guide carries, built from their own code so
 * the link in it is theirs. Added at render time (withAuditSection), not stored,
 * so every guide in app_state has it today and a rewrite of the audit copy
 * reaches every partner without a re-seed.
 */
export function auditGuideSection(code: string): GuideSection {
  const url = partnerAuditUrl(code);
  return {
    heading: AUDIT_GUIDE_HEADING,
    blurb:
      'Not every owner is ready for a pitch. Every owner wants to know how their business looks to a stranger searching for it. This is the thing you can hand anyone, and it costs them nothing.',
    items: [
      {
        title: 'Your personal audit link',
        detail: `${url} carries your code. Every request it brings in is filed under your name on the Audit Desk, and your 60-day referral window starts the moment they open it.`,
        url,
      },
      {
        title: 'What it grades',
        detail:
          'Their website on seven categories, their Google Business Profile on eight checks, and their reviews against their trade. Every check is printed with what it is worth, and the fixes come ranked with the free ones first.',
      },
      {
        title: 'How to hand it over',
        detail: `Ask: have you ever seen how your business looks to somebody searching for it? Then text them the link, or have them open it on their phone while you are standing there. They leave an email and the business name, and the full report arrives in their inbox ${PRESENCE.turnaround}.`,
      },
      {
        title: 'What they get',
        detail:
          'A score out of 100, a one-line read on where they stand (the sample reads: your reviews are outrunning your website), and a private report page that is theirs to keep. No card, and nobody calls unless they ask.',
      },
    ],
  };
}

/** The guide as it renders: theirs, with the audit section after the opening play. */
export function withAuditSection(guide: PartnerGuide): PartnerGuide {
  if (!guide.code || guide.sections.some((s) => s.heading === AUDIT_GUIDE_HEADING)) return guide;
  const sections = [...guide.sections];
  sections.splice(Math.min(1, sections.length), 0, auditGuideSection(guide.code));
  return { ...guide, sections };
}
