import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/outbound-server';
import { requireOfficeOwner } from '@/lib/office/server';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

const schema = z.object({
  pinned: z.boolean().optional(),
  active: z.boolean().optional(),
});

/** Pin a lesson so every plan carries it, or retire it so none does. */
export async function PATCH(req: Request, { params }: { params: Params }) {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const { error } = await guard.supabase.from('office_lessons').update(parsed.data).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
