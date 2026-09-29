import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseBody } from '@/lib/outbound-server';
import { requireOfficeOwner } from '@/lib/office/server';
import { decideApproval } from '@/lib/office/engine';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

const schema = z.object({
  approve: z.boolean(),
  note: z.string().trim().max(2000).optional(),
});

/** Sarah's yes or no on something an agent held for her. The agent resumes with the answer. */
export async function POST(req: Request, { params }: { params: Params }) {
  const guard = await requireOfficeOwner();
  if ('error' in guard) return guard.error;
  const { id } = await params;
  const parsed = await parseBody(req, schema);
  if ('error' in parsed) return parsed.error;

  const ok = await decideApproval(guard.supabase, id, parsed.data.approve, parsed.data.note);
  if (!ok) return NextResponse.json({ error: 'Already answered.' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
