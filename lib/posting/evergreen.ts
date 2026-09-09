/**
 * THE EVERGREEN BANK. When nobody dropped a photo, the day still gets a post.
 *
 * Every angle below is a brief, not a caption: the writer turns it into the
 * business's own words with the business's own facts. Rotation is by date,
 * spread across angles and towns, so the same brief does not come back for
 * about two months and the lead towns get the most turns.
 */
import type { SettingsRow } from './types';

export type EvergreenBrief = {
  key: string;
  angle: string;
  town: string | null;
  service: string | null;
};

/**
 * `requires` is a fact the settings must actually state before the angle may
 * run. The bank is shared by every client; a brief about being family-run or
 * about a founding year is only true for the ones whose facts say so.
 */
const ANGLES: Array<{ key: string; brief: string; wantsTown?: boolean; wantsService?: boolean; requires?: RegExp }> = [
  { key: 'first-visit', brief: 'What the first site visit is for: seeing whether the lot suits the idea before anyone spends on plans. Invite people with land to bring us their idea.', wantsTown: true },
  { key: 'land-first', brief: 'Why a Montana build starts with the land: access, slope, water, sun, winter. What we look at before we draw a line.' },
  { key: 'process', brief: 'Our process in plain steps, from the first conversation to keys. No timelines promised, no prices quoted, just the order of things.' },
  { key: 'service', brief: 'One service, explained in three sentences and one reason people choose us for it.', wantsService: true, wantsTown: true },
  { key: 'winter-build', brief: 'What building for a Flathead Valley winter changes about the roof, the envelope, the mechanical room and the driveway.' },
  { key: 'remodel-or-new', brief: 'When a remodel is the right answer and when it is not. Honest, specific, no sales push.' },
  { key: 'question', brief: 'A question buyers ask us every week, answered straight. Not price per square foot, not a timeline, not financing.' },
  { key: 'town', brief: 'Building in one town we serve: what is particular about lots, views, and permitting there, in a way a local would nod at.', wantsTown: true },
  { key: 'craft', brief: 'One detail of craft we care about that nobody sees after drywall: framing, flashing, insulation, a mechanical room laid out for the next thirty years.' },
  { key: 'since-1997', brief: 'What being at this since 1997 means in practice: the subs we still work with, the homes still standing well, the second homes we have built for the same families.', requires: /\b1997\b/ },
  { key: 'plans-no-land', brief: 'For the person with plans and no land yet: how we help match a plan to a lot, and what changes when the lot is found.' },
  { key: 'referral', brief: 'Most of our work comes from people who built with us telling someone else. A plain thank you, and an invitation to refer a friend.' },
  { key: 'family', brief: 'A family business: a founder, a son on site every day, an office that answers the phone. Say it warmly, not as a slogan.', requires: /\b(family|son|daughter|father|wife|husband)\b/i },
  { key: 'pre-construction', brief: 'What a pre-construction agreement is and why the real numbers and schedule come after it, not before.', requires: /pre-construction/i },
];

/** A stable pick for a date, so the planner and a re-run agree on the same brief. */
export function evergreenFor(settings: SettingsRow, dateStr: string): EvergreenBrief {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  const facts = settings.facts ?? '';
  const allowed = ANGLES.filter((a) => !a.requires || a.requires.test(facts));
  // Angles rotate one a day; the town and the service rotate on their own primes so the pairs vary.
  const angle = allowed[dayNumber % allowed.length];
  const towns = settings.towns.length ? settings.towns : [];
  const services = settings.services.length ? settings.services : [];
  // Lead towns come first in settings and get a double share of turns.
  const townPool = towns.length ? [...towns.slice(0, 2), ...towns.slice(0, 2), ...towns] : [];
  const town = angle.wantsTown && townPool.length ? townPool[Math.floor(dayNumber / 3) % townPool.length] : null;
  const service = angle.wantsService && services.length ? services[Math.floor(dayNumber / 7) % services.length] : null;
  return { key: `${angle.key}:${town ?? '-'}:${service ?? '-'}`, angle: angle.brief, town, service };
}

export function evergreenAngleCount(): number {
  return ANGLES.length;
}
