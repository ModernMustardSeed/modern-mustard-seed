import type { StudioConfig } from '@/components/studio/types';
import { CXC_SCRIPTS } from './scripts';

/**
 * Cross + Covenant's studio. A different house from /sarah on purpose: ink navy
 * instead of MMS night, marigold and coral instead of MMS gold and red, a cross
 * that draws itself on the reading line instead of the mustard seed, and its
 * OWN pipeline (/api/booth-cxc -> the `booth-cxc` bucket). A CXC take can never
 * land in the MMS booth and a CXC script can never reach the YouTube publisher.
 *
 * Colors are the locked "Abound in Hope" tokens from
 * ~/.claude/skills/design/brands/cxc.md. The background is ink rather than the
 * brand's signature cream because this is a reading surface that a camera
 * points at: big cream type on ink is what a prompter has to be. The cream
 * comes back as the paper of every script card, which is where the brand
 * actually shows.
 */
export const CXC_STUDIO: StudioConfig = {
  id: 'cxc',
  apiBase: '/api/booth-cxc',
  bucketLabel: 'the Cross + Covenant booth',
  kicker: 'Cross + Covenant · Recording Booth',
  title: 'The Witness Stand',
  blurb:
    'The CXC room. Separate from the studio booth, separate takes, separate storage. Pick a script, arm the camera, hit play. The cross on the reading line draws itself as you go.',
  tabs: [
    ['reel', 'Reels'],
    ['anchor', 'Anchor Films'],
    ['devotional', 'Daily Bread'],
    ['book', 'Eternal Optimist'],
  ],
  pillarStyles: {
    SCRIPTURE: 'bg-[#FFC431] text-[#0D172A]',
    WITNESS: 'bg-[#21C7D6] text-[#0D172A]',
    COMFORT: 'bg-[#7A4A7F] text-[#FCF0DA]',
    MERCY: 'bg-[#FF5C7A] text-[#0D172A]',
    // The book series uses its four parts as pillars, so the card shows at a
    // glance which movement of the argument an episode belongs to.
    LENS: 'bg-[#21C7D6] text-[#0D172A]',
    ETERNAL: 'bg-[#7A4A7F] text-[#FCF0DA]',
    PRACTICE: 'bg-[#FFC431] text-[#0D172A]',
    BEAUTIFUL: 'bg-[#FF5C7A] text-[#0D172A]',
  },
  scripts: CXC_SCRIPTS,
  theme: {
    night: '#0D172A',
    cream: '#FCF0DA',
    accent: '#FFC431',
    ink: '#0D172A',
    accentAlt: '#FF5C7A',
    panel: '#111F3A',
    creamRgb: '252,240,218',
    nightRgb: '13,23,42',
  },
  mark: 'cross',
  endCard: { title: 'That’s the witness.', creed: 'Every garment is a gospel. Every word is a witness.' },
  // CXC posts to Instagram and X by hand for now. No publisher is wired, and a
  // link to the MMS YouTube publisher would be exactly the blur this studio exists
  // to prevent.
  publisher: null,
  finalsEmpty:
    'Record a take above, then Claude edits it and the finished cut lands right here, ready for the CXC feed. Nothing from this room goes to the MMS channel.',
};
