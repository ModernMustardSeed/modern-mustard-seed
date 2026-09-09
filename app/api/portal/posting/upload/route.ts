import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSession as getAdminSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { getSettings } from '@/lib/posting/settings';

export const runtime = 'nodejs';

/**
 * A signed URL to drop one photo straight into storage, under the client's
 * own posting folder. The browser converts to JPEG and caps the size before
 * asking, because Instagram takes JPEG only. Sarah can upload on a client's
 * behalf from the desk by naming the client.
 */
const BUCKET = 'client-intake';
const MAX_BYTES = 12 * 1000 * 1000;

export async function POST(req: Request) {
  let body: { name?: string; size?: number; type?: string; client?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 });
  }

  let email: string | null = null;
  const client = await getClientSession();
  if (client) email = client.email;
  else {
    const admin = await getAdminSession();
    if (admin && body.client) email = String(body.client).toLowerCase().trim();
  }
  if (!email) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ ok: false, error: 'no storage' }, { status: 503 });
  if (!(await getSettings(sb, email))) return NextResponse.json({ ok: false, error: 'Daily Posting is not on this account.' }, { status: 403 });

  const size = Number(body.size ?? 0);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return NextResponse.json({ ok: false, error: 'Photos up to 12 MB each.' }, { status: 413 });
  const type = String(body.type ?? '');
  if (!/^image\/(jpeg|png)$/.test(type)) return NextResponse.json({ ok: false, error: 'JPEG or PNG only.' }, { status: 415 });

  const rawName = String(body.name ?? 'photo.jpg').slice(0, 120);
  const stem = rawName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';
  const ext = type === 'image/png' ? 'png' : 'jpg';
  const folder = email.replace(/[^a-z0-9]+/gi, '-');
  const path = `posting/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${stem}.${ext}`;

  const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return NextResponse.json({ ok: false, error: 'could not start upload' }, { status: 500 });
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, uploadUrl: data.signedUrl, path, url: pub.publicUrl });
}
