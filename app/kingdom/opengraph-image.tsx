import { mustardCard, OG_SIZE } from '@/lib/og-mustard-card';

export const runtime = 'nodejs';
export const alt = 'Modern Mustard Seed for the Kingdom: design, merch and technology for ministries, with Mr. Mustard waving.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return mustardCard('For the Kingdom. Until all have heard.', '/kingdom');
}
