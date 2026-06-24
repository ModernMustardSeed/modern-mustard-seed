import { NextResponse } from 'next/server';
import { runWebsiteAudit } from '@/lib/website-audit';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Public website-audit endpoint. The engine lives in lib/website-audit so the
 *  in-Tracker audit (admin) can share the exact same scoring. */
export async function POST(req: Request) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const result = await runWebsiteAudit(body.url ?? '');
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    url: result.url,
    report: result.report,
    signals_summary: result.signals_summary,
  });
}
