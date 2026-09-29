import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/outbound-server';
import { requireOfficeOwner } from '@/lib/office/server';
import { startMission, stopMission } from '@/lib/office/engine';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

const schema = z.object({ action: z.enum(['go', 'stop']) });

/** Go starts a proposed mission; Stop halts one, killing any running agent within fifteen seconds. */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const ok = parsed.data.action === 'go' ? await startMission(guard.supabase, id) : await stopMission(guard.supabase, id);
  if (!ok) return NextResponse.json({ error: parsed.data.action === 'go' ? 'That mission is not waiting on a Go.' : 'That mission is not running.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
