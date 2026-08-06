import type { StudioConfig } from '@/components/studio/types';
import { ETERNAL_OPTIMIST } from './scripts';

/**
 * The book's own room. Third studio, third pipeline:
 *   /sarah      Modern Mustard Seed  -> bucket `booth`      (seed on the line)
 *   /sarahcxc   Cross + Covenant     -> bucket `booth-cxc`  (cross on the line)
 *   /sarahbook  Eternal Optimist     -> bucket `booth-book` (sun on the line)
 *
 * A book with a publication date deserves its own front door rather than a tab
 * inside the apparel house. Nothing here is imported by the other two studios,
 * and the tabs are the book's four parts rather than a generic content taxonomy,
 * so the room is shaped like the argument it exists to film.
 *
 * Palette is the book's own image and belongs to neither of the other houses:
 * the deep aubergine of the last dark before dawn, warm paper, a rising sun, and
 * a dawn rose. "Keep your face to the sun, and you won't see the shadows."
 */
export const BOOK_STUDIO: StudioConfig = {
  id: 'book',
  apiBase: '/api/booth-book',
  bucketLabel: 'the Eternal Optimist booth',
  kicker: 'Eternal Optimist · Recording Booth',
  title: 'The Sun Room',
  blurb:
    'Sixteen episodes, one per chapter, in the order the book argues them. Its own room and its own takes, kept apart from the studio booth and the CXC booth. The sun on the reading line rises as you go.',
  tabs: [
    ['lens', 'The Lens'],
    ['eternal', 'The Eternal Frame'],
    ['practice', 'The Practice'],
    ['beautiful', 'The Beautiful Life'],
  ],
  // Chip color carries the part; the word carries the chapter's subject.
  pillarStyles: {
    PERSPECTIVE: 'bg-[#FFB020] text-[#1A1026]',
    ATTENTION: 'bg-[#FFB020] text-[#1A1026]',
    CLARITY: 'bg-[#FFB020] text-[#1A1026]',
    PRESENCE: 'bg-[#FFB020] text-[#1A1026]',
    FORMATION: 'bg-[#8E7BC7] text-[#1A1026]',
    SCALE: 'bg-[#8E7BC7] text-[#1A1026]',
    IDENTITY: 'bg-[#8E7BC7] text-[#1A1026]',
    HOPE: 'bg-[#8E7BC7] text-[#1A1026]',
    RHYTHM: 'bg-[#79C0B0] text-[#1A1026]',
    GRATITUDE: 'bg-[#79C0B0] text-[#1A1026]',
    REFRAME: 'bg-[#79C0B0] text-[#1A1026]',
    INPUT: 'bg-[#79C0B0] text-[#1A1026]',
    JOY: 'bg-[#79C0B0] text-[#1A1026]',
    BEAUTY: 'bg-[#E0567A] text-[#FDF3E3]',
    FIRE: 'bg-[#E0567A] text-[#FDF3E3]',
    LIGHT: 'bg-[#E0567A] text-[#FDF3E3]',
  },
  scripts: ETERNAL_OPTIMIST,
  theme: {
    night: '#1A1026',
    cream: '#FDF3E3',
    accent: '#FFB020',
    ink: '#1A1026',
    accentAlt: '#E0567A',
    panel: '#241634',
    creamRgb: '253,243,227',
    nightRgb: '26,16,38',
  },
  mark: 'sun',
  endCard: {
    title: 'That’s the chapter.',
    creed: 'Praise in all ways, on all days.',
  },
  // No publisher. The book series will go out with the launch, not through the
  // MMS YouTube button, and wiring it there would blur two different things.
  publisher: null,
  finalsEmpty:
    'Record a chapter above, then Claude edits it and the finished cut lands right here. These belong to the book, not to the MMS channel or the CXC feed.',
};
