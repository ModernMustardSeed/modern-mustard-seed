import { NextResponse } from 'next/server';
import { requireOfficeOwner, loadOfficeState } from '@/lib/office/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Everything the floor and the dock draw, in one read. `?lite=1` skips the
 * feed and the shelf, which is what the closed dock polls for its badge.
 */
export async function GET(req: Request) {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  const lite = new URL(req.url).searchParams.get('lite') === '1';
  try {
    return NextResponse.json(await loadOfficeState(guard.supabase, { lite }), { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not read the office.' }, { status: 500 });
  }
}
