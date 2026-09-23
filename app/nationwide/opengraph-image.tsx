import { mustardCard, OG_SIZE } from '@/lib/og-mustard-card';

export const runtime = 'nodejs';
export const alt = 'Modern Mustard Seed, built in Montana and working everywhere in the US, with Mr. Mustard waving.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return mustardCard('Built in Montana. Working everywhere in the US.', '/nationwide');
}
