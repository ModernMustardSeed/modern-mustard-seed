import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sameOriginOnly } from '../guard';

/**
 * Lists the FINISHED cuts: edited videos Claude drops into the booth bucket's
 * `finals/` folder, ready to post. This is the "where did my edited video go"
 * surface, shown right in the booth so the loop is visible where Sarah records.
 * The same list also drives the /admin/youtube publisher. Same-origin guard only.
 */

const BUCKET = 'booth';
const FINALS = 'finals';
const PLAYBACK_TTL = 60 * 60 * 3;

export async function POST(req: NextRequest) {
  if (!sameOriginOnly(req)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  }
  const client = getSupabase();
  if (!client) return NextResponse.json({ error: 'Storage is not configured.' }, { status: 503 });

  const store = client.storage.from(BUCKET);
  const { data: files, error } = await store.list(FINALS, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return NextResponse.json({ finals: [] }); // folder not created yet == nothing finished

  const finals = [];
  for (const f of files ?? []) {
    if (!f.name || f.id === null || !/\.(mp4|mov|webm)$/i.test(f.name)) continue;
    const path = `${FINALS}/${f.name}`;
    const { data: signed } = await store.createSignedUrl(path, PLAYBACK_TTL);
    finals.push({
      name: f.name,
      path,
      bytes: (f.metadata?.size as number | undefined) ?? 0,
      updatedAt: (f.updated_at as string | undefined) ?? (f.created_at as string | undefined) ?? null,
      signedUrl: signed?.signedUrl ?? null,
    });
  }
  return NextResponse.json({ finals });
}
