import { NextResponse } from 'next/server';

/**
 * The visitor's city, as Vercel's edge reads it off the connection, so the
 * homepage hero can say hello to it. Approximate by nature (it is the network's
 * city, not a street address), never stored, never logged, and absent locally.
 */
export const runtime = 'edge';

export function GET(req: Request) {
  const raw = req.headers.get('x-vercel-ip-city') || '';
  let city = '';
  try { city = decodeURIComponent(raw); } catch { city = ''; }
  city = /^[\p{L} .'-]{2,40}$/u.test(city) ? city : '';
  return NextResponse.json({ city }, { headers: { 'Cache-Control': 'private, no-store' } });
}
