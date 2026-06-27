import { NextResponse } from 'next/server';
import { uploadIntakeFile } from '@/lib/intake-storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_BYTES = 9 * 1024 * 1024; // 9MB hard cap (browser compresses images first)

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const prefix = String(form.get('prefix') || 'misc')
      .replace(/[^a-z0-9-_]/gi, '')
      .slice(0, 40) || 'misc';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 9MB)' }, { status: 413 });
    }

    const res = await uploadIntakeFile(file, `intake/${prefix}`);
    if (!res) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
    return NextResponse.json({ url: res.url, path: res.path });
  } catch (err) {
    console.error('Intake upload route error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
