import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { youtubeStatus } from '@/lib/youtube';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'booth';
const FINALS = 'finals'; // edited, ready-to-publish videos live here

/** Channel connection status + the finished videos waiting to publish. */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

  const status = await youtubeStatus(sb);

  const store = sb.storage.from(BUCKET);
  const { data: files } = await store.list(FINALS, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });
  const finals = [];
  for (const f of files ?? []) {
    if (!f.name || f.id === null || !/\.(mp4|mov|webm)$/i.test(f.name)) continue;
    const path = `${FINALS}/${f.name}`;
    const { data: signed } = await store.createSignedUrl(path, 60 * 60 * 3);
    finals.push({
      path,
      name: f.name,
      bytes: (f.metadata?.size as number | undefined) ?? 0,
      updatedAt: (f.updated_at as string | undefined) ?? (f.created_at as string | undefined) ?? null,
      previewUrl: signed?.signedUrl ?? null,
    });
  }
  return NextResponse.json({ status, finals });
}
