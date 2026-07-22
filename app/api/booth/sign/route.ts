import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { sameOriginOnly } from '../guard';

/**
 * Mints a signed upload URL so the /sarah recording booth can send takes
 * straight to the private `booth` bucket. The page is private (noindex,
 * unlinked, single user), so there is no booth code; a same-origin guard
 * keeps random cross-site callers out. The bucket is private; Claude pulls
 * takes server-side with the service role for editing.
 */

const BUCKET = 'booth';
const SAFE_SEGMENT = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

let bucketReady = false;

async function ensureBucket(client: NonNullable<ReturnType<typeof getSupabase>>) {
  if (bucketReady) return;
  const { data } = await client.storage.getBucket(BUCKET);
  if (!data) {
    // Race with a concurrent first-take is fine; a duplicate create just errors.
    await client.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  }
  bucketReady = true;
}

export async function POST(req: NextRequest) {
  if (!sameOriginOnly(req)) {
    return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  }
  const client = getSupabase();
  if (!client) {
    return NextResponse.json({ error: 'Storage is not configured.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as {
    scriptId?: string;
    fileName?: string;
    contentType?: string;
  } | null;

  if (!body?.scriptId || !body.fileName) {
    return NextResponse.json({ error: 'scriptId and fileName are required.' }, { status: 400 });
  }
  if (!SAFE_SEGMENT.test(body.scriptId) || !SAFE_SEGMENT.test(body.fileName)) {
    return NextResponse.json({ error: 'Unsafe file name.' }, { status: 400 });
  }

  await ensureBucket(client);

  const path = `${body.scriptId}/${body.fileName}`;
  const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    console.error('booth sign error:', error);
    return NextResponse.json({ error: 'Could not create the upload link.' }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, path: data.path });
}
