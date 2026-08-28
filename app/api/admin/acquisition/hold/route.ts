import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { holdReport } from '@/lib/acq/hold';
import { sendDemosNow } from '@/lib/acq/demos-now';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Why nothing went out, read from the rows written when it did not. */
export async function GET() {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;
  return NextResponse.json({ hold: await holdReport(g.db) });
}

/**
 * Send the waiting demos now, pacing lifted. Recipient consent is never
 * lifted, here or anywhere: see lib/acq/demos-now.ts.
 */
export async function POST(req: Request) {
  const g = await requireAcqAdmin();
  if ('error' in g) return g.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (String(body.action ?? '') !== 'send-demos-now') {
    return NextResponse.json({ error: `Unknown action: ${String(body.action ?? '')}` }, { status: 400 });
  }

  const report = await sendDemosNow({
    db: g.db,
    leadIds: Array.isArray(body.leadIds) ? (body.leadIds as string[]) : undefined,
    reason: typeof body.reason === 'string' ? body.reason : undefined,
  });

  return NextResponse.json({ ok: true, report, hold: await holdReport(g.db) });
}
