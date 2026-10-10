/**
 * What every retired public checkout route returns (see lib/talk-first.ts):
 * 410 with the conversation URL, so a stale cached button or a script that posts
 * to the old endpoint gets a clear answer and a way forward, never a Stripe session.
 */
import { NextResponse } from 'next/server';
import { SITE } from '@/lib/seo';
import { talkFirstHref } from '@/lib/talk-first';

export function checkoutRetired(offer: string): NextResponse {
  return NextResponse.json(
    {
      error: 'We do not sell this online. Tell us about your business and we will talk it through with you first.',
      url: `${SITE.url}${talkFirstHref(offer)}`,
    },
    { status: 410, headers: { 'cache-control': 'no-store' } },
  );
}
