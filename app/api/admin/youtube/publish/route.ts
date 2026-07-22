import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { uploadVideoToYouTube } from '@/lib/youtube';

export const runtime = 'nodejs';
export const maxDuration = 300; // uploads take a while

const BUCKET = 'booth';

/** The button. Pull the finished video from storage and publish it to the channel. */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Storage not configured' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    videoPath?: string;
    title?: string;
    description?: string;
    tags?: string[];
    privacyStatus?: 'public' | 'unlisted' | 'private';
  } | null;

  const videoPath = (body?.videoPath ?? '').trim();
  const title = (body?.title ?? '').trim();
  if (!videoPath.startsWith('finals/') || videoPath.includes('..')) {
    return NextResponse.json({ error: 'That video path is not valid.' }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
  const privacyStatus = body?.privacyStatus === 'public' || body?.privacyStatus === 'unlisted' ? body.privacyStatus : 'private';

  // Pull the finished bytes from our own bucket (service role).
  const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(videoPath);
  if (dlErr || !blob) return NextResponse.json({ error: 'Could not read that video from storage.' }, { status: 404 });
  const buf = Buffer.from(await blob.arrayBuffer());

  const result = await uploadVideoToYouTube(sb, {
    data: buf,
    title,
    description: body?.description ?? '',
    tags: Array.isArray(body?.tags) ? body!.tags! : [],
    privacyStatus,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json({ ok: true, url: result.url, id: result.id });
}
