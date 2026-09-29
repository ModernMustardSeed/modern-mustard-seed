import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/outbound-server';
import { requireOfficeOwner } from '@/lib/office/server';
import { setSettings } from '@/lib/office/engine';

export const runtime = 'nodejs';

const schema = z.object({
  autoGo: z.boolean().optional(),
  autoShip: z.boolean().optional(),
});

/** The two autonomy switches. Spending money is always held, and there is no switch for it. */
export async function POST(req: Request) {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;
  return NextResponse.json({ settings: await setSettings(guard.supabase, parsed.data) });
}
