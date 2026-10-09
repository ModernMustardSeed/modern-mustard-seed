import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { roomRegistration } from '@/lib/bootcamp/room-auth';
import { gate, readDeliverable } from '@/lib/bootcamp/deliverables';
import { roomNow } from '@/lib/bootcamp/sessions';
import { recordEvent } from '@/lib/bootcamp/store';

/**
 * The only door to the tier deliverables. A download is the person's own
 * signed room link (id and k) plus a file a deliverable ships. The tier must
 * hold that deliverable and Day 3 must be over. A wrong key and a missing
 * registration answer the same as a file that does not exist, so the route
 * never tells anyone which ids are real. Every download is logged as a
 * `kit_download` event for the Stage tab.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NOT_FOUND = () => NextResponse.json({ error: 'not_found' }, { status: 404, headers: { 'Cache-Control': 'private, no-store' } });

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = decodeURIComponent(file || '');
  const url = new URL(req.url);

  const sb = getSupabase();
  let reg = null;
  try {
    reg = await roomRegistration(sb, url.searchParams.get('id'), url.searchParams.get('k'));
  } catch (err) {
    console.error('bootcamp kit: registration read failed', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }
  if (!reg) return NOT_FOUND();

  const answer = gate(reg.tier, name, roomNow());
  if (answer === 'unknown' || answer === 'not-yours') return NOT_FOUND();
  if (answer === 'not-yet') {
    return NextResponse.json({ error: 'not_yet', message: 'This opens in your room when Day 3 ends.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }

  const hit = await readDeliverable(name);
  if (!hit) {
    console.error(`bootcamp kit: ${name} is missing from the deployment`);
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  }

  await recordEvent(sb, 'kit_download', { email: reg.email, registrationId: reg.id, hostSlug: reg.host_slug, detail: { file: name, tier: reg.tier } }).catch((err) => {
    console.error('bootcamp kit: download event failed', err instanceof Error ? err.message : err);
  });

  const inline = hit.file.kind === 'PDF' && url.searchParams.get('view') === '1';
  return new NextResponse(new Uint8Array(hit.body), {
    status: 200,
    headers: {
      'Content-Type': hit.file.mime,
      'Content-Length': String(hit.body.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${hit.file.name}"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
