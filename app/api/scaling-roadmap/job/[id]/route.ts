import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { readRoadmapJob } from '@/lib/roadmap-queue';

export const runtime = 'nodejs';

/**
 * Poll one queued roadmap.
 *
 * The POST route waits up to 250 seconds for the local worker and then answers
 * "it is building, it is coming to your inbox". This is how a visitor who stays
 * on the page gets the document rendered anyway, instead of being told to go
 * check their email while their browser sits there doing nothing.
 *
 * The job id is a v4 uuid handed only to the person who submitted the form, and
 * a finished roadmap is published at a public permalink regardless, so there is
 * nothing here to guard beyond not leaking rows that were never asked for. No
 * enumeration is possible: there is no list endpoint and no sequential key.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Reject anything that is not a uuid before it reaches Postgres, which errors
  // on a malformed uuid rather than returning empty.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const job = await readRoadmapJob(sb, id);
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (job.status === 'done' && job.report) {
    return NextResponse.json({
      ok: true,
      status: 'done',
      url: job.target_url,
      host: (() => {
        try { return new URL(job.target_url).hostname.replace(/^www\./, ''); } catch { return job.target_url; }
      })(),
      slug: job.slug,
      report: job.report,
      emailed: Boolean(job.slug),
    });
  }

  if (job.status === 'failed') {
    return NextResponse.json({ ok: false, status: 'failed', error: job.error ?? 'The roadmap failed to build.' });
  }

  return NextResponse.json({ ok: true, status: job.status });
}
