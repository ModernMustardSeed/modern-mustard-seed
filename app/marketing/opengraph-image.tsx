import { mustardCard, OG_SIZE } from '@/lib/og-mustard-card';

export const runtime = 'nodejs';
export const alt = 'Modern Mustard Seed marketing: social posting, blog writing, commercials and ads, with Mr. Mustard waving.';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return mustardCard('Social, blog, commercials and ads. In your voice.', '/marketing');
}
