import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { buildWeek, forecastFor } from '@/lib/cc-weather';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * THE BUILD WEEK for the town this business works in.
 *
 * The point comes from the project's own postal address when one of the towns
 * we know is in it, and falls back to Kalispell. A client in another valley
 * gets their own point the day their address says so.
 *
 * The National Weather Service is free and asks only for a real user agent in
 * return, so the fetch is cached for half an hour rather than hit on every
 * page load. A forecast does not move faster than that anyway.
 */
const PLACES: Record<string, { lat: number; lon: number }> = {
  kalispell: { lat: 48.1958, lon: -114.3129 },
  whitefish: { lat: 48.4111, lon: -114.3376 },
  bigfork: { lat: 48.0633, lon: -114.0724 },
  eureka: { lat: 48.8797, lon: -115.0537 },
  polson: { lat: 47.6936, lon: -114.1633 },
  'columbia falls': { lat: 48.3722, lon: -114.1817 },
  lakeside: { lat: 48.0158, lon: -114.2233 },
};

export async function GET(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { account } = got.desk;

  const asked = (new URL(req.url).searchParams.get('town') ?? '').toLowerCase().trim();
  const postal = (account.project.postal ?? '').toLowerCase();
  const fromPostal = Object.keys(PLACES).find((t) => postal.includes(t));
  const point = PLACES[asked] ?? PLACES[fromPostal ?? ''] ?? PLACES.kalispell;

  const fc = await forecastFor(point.lat, point.lon);
  if (!fc) return NextResponse.json({ week: null, error: 'The weather service did not answer. It happens; try again shortly.' });
  return NextResponse.json({ week: buildWeek(fc.place, fc.periods), towns: Object.keys(PLACES) });
}
