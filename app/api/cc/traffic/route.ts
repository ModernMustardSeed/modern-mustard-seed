import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { buildTraffic } from '@/lib/cc-traffic';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** TRAFFIC, counted on request. ?days=7 (default), 30 or 90. */
export async function GET(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const days = Number(new URL(req.url).searchParams.get('days')) || 7;
  const traffic = await buildTraffic(got.desk.sb, got.desk.account, days);
  return NextResponse.json({ traffic });
}
