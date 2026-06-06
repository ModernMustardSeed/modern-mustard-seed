import { NextResponse } from 'next/server';
import { googleReviewUrl } from '@/data/socials';

export const runtime = 'nodejs';

// Clean, memorable redirect to the Google review form. Share modernmustardseed.com/review
// anywhere (email signature, texts, cards). Env var overrides if it ever changes.
export function GET() {
  return NextResponse.redirect(process.env.GOOGLE_REVIEW_URL || googleReviewUrl, 302);
}
