import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resolveIntake } from '@/lib/intake-resolve';
import {
  INTAKE_BUCKET,
  INTAKE_MAX_BYTES,
  INTAKE_MAX_FILES,
  intakeObjectPath,
  listIntakeFiles,
  storableType,
} from '@/lib/intake-files';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * Signs a one-time upload URL so the welcome form can send a photo straight to
 * storage. The file itself never passes through Vercel, which is what made
 * every phone photo fail with a 413 before 2026-10-08. See lib/intake-files.ts.
 *
 * Only a valid intake key gets a URL, and only for that client's own folder.
 */
export async function POST(req: Request) {
  let body: { key?: unknown; name?: unknown; type?: unknown; size?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const key = typeof body.key === 'string' ? body.key.trim().slice(0, 120) : '';
  const name = typeof body.name === 'string' ? body.name.slice(0, 200) : 'file';
  const size = typeof body.size === 'number' ? body.size : 0;
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 401 });
  if (size > INTAKE_MAX_BYTES) {
    return NextResponse.json({ error: 'too_large', limitMb: INTAKE_MAX_BYTES / 1024 / 1024 }, { status: 413 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });

  const client = await resolveIntake(supabase, key);
  if (!client) return NextResponse.json({ error: 'unknown_key' }, { status: 401 });

  const existing = await listIntakeFiles(supabase, client.email);
  if (existing.length >= INTAKE_MAX_FILES) {
    return NextResponse.json({ error: 'too_many_files' }, { status: 429 });
  }

  const path = intakeObjectPath(client.email, name);
  const { data, error } = await supabase.storage.from(INTAKE_BUCKET).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    console.error('intake sign: could not sign', error?.message);
    return NextResponse.json({ error: 'sign_failed' }, { status: 502 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    path,
    contentType: storableType(typeof body.type === 'string' ? body.type : ''),
  });
}
