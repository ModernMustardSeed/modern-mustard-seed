import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { resolveIntake } from '@/lib/intake-resolve';
import {
  INTAKE_BUCKET,
  INTAKE_FILE_KINDS,
  intakeFolder,
  intakePublicUrl,
  isClientIntakeUrl,
  type IntakeFileKind,
} from '@/lib/intake-files';

export const runtime = 'nodejs';
export const maxDuration = 15;

/**
 * Files an uploaded intake file on the client's card (client_files), the moment
 * it lands in storage. DELETE takes one back off when the client removes it.
 *
 * Filing on upload rather than on submit is the point: a client who adds twelve
 * photos and closes the tab has still given us twelve photos.
 */

type Body = { key?: unknown; path?: unknown; label?: unknown; kind?: unknown; url?: unknown };

async function read(req: Request): Promise<Body | null> {
  try {
    return (await req.json()) as Body;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await read(req);
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const key = typeof body.key === 'string' ? body.key.trim().slice(0, 120) : '';
  const path = typeof body.path === 'string' ? body.path : '';
  const label = (typeof body.label === 'string' ? body.label.trim() : '').slice(0, 200) || 'Uploaded';
  const kind: IntakeFileKind = INTAKE_FILE_KINDS.includes(body.kind as IntakeFileKind) ? (body.kind as IntakeFileKind) : 'doc';
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 401 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const client = await resolveIntake(supabase, key);
  if (!client) return NextResponse.json({ error: 'unknown_key' }, { status: 401 });

  // Only a file in this client's own folder, and only one that really landed.
  const folder = intakeFolder(client.email);
  if (!path.startsWith(`${folder}/`) || path.includes('..')) {
    return NextResponse.json({ error: 'bad_path' }, { status: 400 });
  }
  const fileName = path.slice(folder.length + 1);
  const { data: found, error: listErr } = await supabase.storage
    .from(INTAKE_BUCKET)
    .list(folder, { search: fileName, limit: 5 });
  if (listErr) {
    console.error('intake file: list failed', listErr.message);
    return NextResponse.json({ error: 'storage_unavailable' }, { status: 502 });
  }
  if (!(found ?? []).some((o) => o.name === fileName)) {
    return NextResponse.json({ error: 'not_uploaded' }, { status: 409 });
  }

  const url = intakePublicUrl(supabase, path);
  const { data: already } = await supabase
    .from('client_files')
    .select('id')
    .eq('client_email', client.email)
    .eq('url', url)
    .maybeSingle();
  if (!already) {
    const { error } = await supabase.from('client_files').insert({ client_email: client.email, label, url, kind });
    if (error) {
      console.error('intake file: not filed', error.message);
      return NextResponse.json({ error: 'not_filed' }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, url });
}

export async function DELETE(req: Request) {
  const body = await read(req);
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  const key = typeof body.key === 'string' ? body.key.trim().slice(0, 120) : '';
  const url = typeof body.url === 'string' ? body.url : '';
  if (!key || !url) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'db_not_configured' }, { status: 503 });
  const client = await resolveIntake(supabase, key);
  if (!client) return NextResponse.json({ error: 'unknown_key' }, { status: 401 });
  if (!isClientIntakeUrl(url, client.email)) return NextResponse.json({ error: 'bad_url' }, { status: 400 });

  const { error } = await supabase.from('client_files').delete().eq('client_email', client.email).eq('url', url);
  if (error) return NextResponse.json({ error: 'not_removed' }, { status: 500 });

  const marker = `/${INTAKE_BUCKET}/`;
  const objectPath = url.slice(url.indexOf(marker) + marker.length);
  await supabase.storage.from(INTAKE_BUCKET).remove([objectPath]);
  return NextResponse.json({ ok: true });
}
