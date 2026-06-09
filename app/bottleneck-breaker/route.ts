import { NextResponse } from 'next/server';

// The memorable URL. Canonical page lives at /audit.
export function GET(req: Request) {
  return NextResponse.redirect(new URL('/audit', req.url), 308);
}
