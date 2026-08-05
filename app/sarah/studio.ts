import type { StudioConfig } from '@/components/studio/types';
import { PROMPTER_SCRIPTS } from './scripts';

/**
 * Modern Mustard Seed's studio. Night + gold, the seed on the reading line,
 * takes to the `booth` bucket, finished cuts out through the YouTube publisher.
 *
 * Cross + Covenant has its own studio at /sarahcxc with its own bucket. Nothing
 * from that house belongs in this config, and nothing here should ever list a
 * CXC script: the YouTube publisher and its metadata brain both read
 * PROMPTER_SCRIPTS directly, so a stray CXC entry would surface as a YouTube
 * draft for the wrong brand.
 */
export const MMS_STUDIO: StudioConfig = {
  id: 'mms',
  apiBase: '/api/booth',
  bucketLabel: 'the MMS booth',
  kicker: 'MMS Studio · Recording Booth',
  title: 'The Prompter',
  blurb:
    'The whole studio in one room. Pick a script, arm the camera, hit play. Every take records itself and sends itself to Claude for the edit. The seed on the reading line grows as you go.',
  tabs: [
    ['episode', 'Episodes'],
    ['short', 'Shorts Bank'],
    ['sales', 'Sales Desk'],
    ['ad', 'Meta Ads'],
  ],
  pillarStyles: {
    BUILD: 'bg-[#F5B700] text-[#161616]',
    SYSTEMS: 'bg-[#cfe0ff] text-[#161616]',
    STEWARD: 'bg-[#f6d9d5] text-[#161616]',
    STORY: 'bg-[#e4ddcf] text-[#161616]',
    SALES: 'bg-[#E0301E] text-[#FBF6EA]',
    ADS: 'bg-[#FF6B35] text-[#161616]',
  },
  scripts: PROMPTER_SCRIPTS,
  theme: {
    night: '#080C16',
    cream: '#FBF6EA',
    accent: '#F5B700',
    ink: '#161616',
    accentAlt: '#C4160B',
    panel: '#0B1019',
    creamRgb: '251,246,234',
    nightRgb: '8,12,22',
  },
  mark: 'seed',
  endCard: { title: 'That’s the take.', creed: 'Small faith. Real leverage. Work that shelters.' },
  publisher: { href: '/admin/youtube', label: 'Open the publisher' },
  finalsEmpty:
    'Record a take above, then Claude edits it (Mr. Mustard, the New Day ident, graphics, and the mild polish) and the finished cut lands right here, ready to post to YouTube in one button.',
};
