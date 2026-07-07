import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOutboundAdmin, parseBody } from '@/lib/outbound-server';

export const runtime = 'nodejs';

const schema = z.object({ ids: z.array(z.string().uuid()).min(1).max(2000) });

/**
 * Bulk-mark leads as DNC-scrubbed after the rep attests they checked the
 * batch. This is the gate that unlocks Mr. Mustard for a list.
 */
export async function POST(req: Request) {
  const guard = await requireOutboundAdmin();
  if ('error' in guard) return guard.error;

  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  let updated = 0;
  const ids = parsed.data.ids;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await guard.supabase.from('outbound_leads').update({ dnc_checked: true }).in('id', chunk).select('id');
    if (error) return NextResponse.json({ error: error.message, updated }, { status: 500 });
    updated += data?.length ?? 0;
  }
  return NextResponse.json({ ok: true, updated });
}
