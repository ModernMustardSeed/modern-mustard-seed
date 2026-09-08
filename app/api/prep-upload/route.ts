import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/**
 * FILES FROM THE ONBOARDING PAGE, STRAIGHT INTO STORAGE.
 *
 * Carmen's designs, photos and wish-list files come from the prep site's
 * onboarding page. A Vercel function body is capped at 4.5 MB, so the file
 * never passes through here: this route mints a signed upload URL for one
 * path in the public `client-intake` bucket (50 MB per file, the bucket's own
 * limit) and the browser PUTs the file to Supabase directly. The public URL
 * comes back with it, and the onboarding submission carries that URL as an
 * "Uploaded file" answer, which /api/prep-intake files on the client card as
 * a design row.
 */

const PROJECTS: Record<string, { origin: string }> = {
  'built-right': { origin: 'https://built-right-prep.vercel.app' },
};
const BUCKET = 'client-intake';
const MAX_BYTES = 50 * 1000 * 1000;

function cors(res: NextResponse, origin: string): NextResponse {
  res.headers.set('Access-Control-Allow-Origin', origin);
  res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'content-type');
  res.headers.set('Vary', 'Origin');
  return res;
}
function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get('origin') ?? '';
  for (const p of Object.values(PROJECTS)) if (origin === p.origin) return origin;
  return null;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return new NextResponse(null, { status: 403 });
  return cors(new NextResponse(null, { status: 204 }), origin);
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return NextResponse.json({ ok: false }, { status: 403 });
  let body: { project?: string; name?: string; size?: number; type?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return cors(NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }), origin);
  }
  const project = String(body.project ?? '');
  if (!PROJECTS[project] || PROJECTS[project].origin !== origin) {
    return cors(NextResponse.json({ ok: false, error: 'unknown project' }, { status: 400 }), origin);
  }
  const size = Number(body.size ?? 0);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return cors(NextResponse.json({ ok: false, error: 'Files up to 50 MB each.' }, { status: 413 }), origin);
  }
  const rawName = String(body.name ?? 'file').slice(0, 120);
  const ext = (rawName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
  const stem = rawName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'file';
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `prep/${project}/${Date.now()}-${rand}-${stem}.${ext}`;

  const sb = getSupabase();
  if (!sb) return cors(NextResponse.json({ ok: false, error: 'no storage' }, { status: 503 }), origin);
  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('prep-upload signed url failed', error);
    return cors(NextResponse.json({ ok: false, error: 'could not start upload' }, { status: 500 }), origin);
  }
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return cors(NextResponse.json({ ok: true, uploadUrl: data.signedUrl, path, url: pub.publicUrl, name: rawName }), origin);
}
