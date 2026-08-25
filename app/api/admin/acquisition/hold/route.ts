import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { holdReport } from '@/lib/acq/hold';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Why nothing went out, read from the rows written when it did not. */
export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  return NextResponse.json({ hold: await holdReport(g.db) });
}
