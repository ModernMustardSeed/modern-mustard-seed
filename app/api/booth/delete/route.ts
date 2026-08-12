import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { requireBoothAccess } from '../guard';

/** Deletes a booth take from the private `booth` bucket. Same-origin guard only. */

const BUCKET = 'booth';
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

export async function POST(req: NextRequest) {
  if (!(await requireBoothAccess(req))) {
    return NextResponse.json({ error: 'Sign in to the admin to use the booth.' }, { status: 401 });
  }
  const client = getSupabase();
  if (!client) {
    return NextResponse.json({ error: 'Storage is not configured.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    scriptId?: string;
    fileName?: string;
  } | null;

  if (!body?.scriptId || !body.fileName) {
    return NextResponse.json({ error: 'scriptId and fileName are required.' }, { status: 400 });
  }
  if (!SAFE_SEGMENT.test(body.scriptId) || !SAFE_SEGMENT.test(body.fileName)) {
    return NextResponse.json({ error: 'Unsafe file name.' }, { status: 400 });
  }

  const { error } = await client.storage.from(BUCKET).remove([`${body.scriptId}/${body.fileName}`]);
  if (error) {
    console.error('booth delete error:', error);
    return NextResponse.json({ error: 'Could not delete the take.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
