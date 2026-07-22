import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sameOriginOnly } from '../guard';

/**
 * Lists every take stored in the private `booth` bucket and hands back a signed
 * playback URL for each, so the /sarah booth can rewatch clips (including ones
 * recorded in an earlier session, on another machine, or already cleared from
 * the browser's memory). Layout is `<scriptId>/<fileName>.webm`, so we list the
 * script folders, then the files inside each. Same-origin guard only.
 */

const BUCKET = 'booth';
const PLAYBACK_TTL = 60 * 60 * 3; // 3 hours; long enough for an editing sitting

type SavedTake = {
  path: string;
  scriptId: string;
  fileName: string;
  bytes: number;
  updatedAt: string | null;
  signedUrl: string | null;
};

export async function POST(req: NextRequest) {
  if (!sameOriginOnly(req)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  }
  const client = getSupabase();
  if (!client) {
    return NextResponse.json({ error: 'Storage is not configured.' }, { status: 503 });
  }

  const store = client.storage.from(BUCKET);

  // Top level: the per-script folders (folders come back with a null id).
  const { data: roots, error: rootErr } = await store.list('', { limit: 1000 });
  if (rootErr) {
    // A missing bucket just means nothing has been recorded yet.
    return NextResponse.json({ takes: [] as SavedTake[] });
  }
  const folders = (roots ?? []).filter((e) => e.id === null).map((e) => e.name);

  const takes: SavedTake[] = [];
  for (const scriptId of folders) {
    const { data: files } = await store.list(scriptId, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    for (const f of files ?? []) {
      if (!f.name || f.id === null) continue; // skip nested folders, if any
      const path = `${scriptId}/${f.name}`;
      const { data: signed } = await store.createSignedUrl(path, PLAYBACK_TTL);
      takes.push({
        path,
        scriptId,
        fileName: f.name,
        bytes: (f.metadata?.size as number | undefined) ?? 0,
        updatedAt: (f.updated_at as string | undefined) ?? (f.created_at as string | undefined) ?? null,
        signedUrl: signed?.signedUrl ?? null,
      });
    }
  }

  takes.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  return NextResponse.json({ takes });
}
