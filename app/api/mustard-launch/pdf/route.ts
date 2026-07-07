/**
 * Serve a founder's branded Blueprint PDF. Auth is the unguessable run id (the
 * same pattern as the press proof PDF): if you have the uuid, it is yours.
 * GET /api/mustard-launch/pdf?runId=<uuid>
 */

import { getSupabase } from '@/lib/supabase';
import { getLaunchRunById } from '@/lib/mustard-launch-store';
import { buildLaunchBlueprintPdf } from '@/lib/launch-blueprint-pdf';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Soft per-instance IP throttle.
const ipHits = new Map<string, { count: number; reset: number }>();
function ipAllowed(ip: string): boolean {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || now > hit.reset) {
    ipHits.set(ip, { count: 1, reset: now + 60 * 60 * 1000 });
    return true;
  }
  hit.count += 1;
  return hit.count <= 30;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const runId = url.searchParams.get('runId') || '';
  if (!/^[0-9a-f-]{36}$/i.test(runId)) return new Response('Not found', { status: 404 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!ipAllowed(ip)) return new Response('Slow down', { status: 429 });

  const supabase = getSupabase();
  if (!supabase) return new Response('Unavailable', { status: 503 });

  const run = await getLaunchRunById(supabase, runId);
  if (!run || !run.blueprint) return new Response('Not found', { status: 404 });

  try {
    const bytes = await buildLaunchBlueprintPdf(run.blueprint);
    const fileSlug =
      run.blueprint.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) ||
      'launch';
    return new Response(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileSlug}-launch-blueprint.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('launch blueprint pdf failed', err instanceof Error ? err.message : err);
    return new Response('PDF failed', { status: 500 });
  }
}
