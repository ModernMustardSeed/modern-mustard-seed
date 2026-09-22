import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { discoverConfigured, discoverCreators, toProspect } from '@/lib/partner-desk/discover';
import { bulkCreateProspects, findDuplicate, listProspects } from '@/lib/partner-desk/store';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Run one discovery query against YouTube and return candidates, each flagged
 * if already in the book. With `add: [channelId, ...]` it adds those to the
 * book instead (source youtube, kind creator, niche = the query).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: { query?: string; minSubscribers?: number; pages?: number; add?: { channelId: string }[]; candidates?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const sb = getSupabase();
  const query = (body.query || '').trim().slice(0, 120);
  if (!query) return NextResponse.json({ error: 'Type or pick a query.' }, { status: 400 });

  const status = await discoverConfigured(sb);
  if (!status.ok) {
    return NextResponse.json(
      { error: 'YouTube discovery is not set up. Set YOUTUBE_API_KEY in Vercel, or connect the channel at /admin/youtube.' },
      { status: 503 }
    );
  }

  try {
    const min = typeof body.minSubscribers === 'number' ? body.minSubscribers : 10_000;
    const found = await discoverCreators(sb, { query, minSubscribers: min, pages: body.pages ?? 2 });
    const book = await listProspects();
    if (Array.isArray(body.add) && body.add.length) {
      const wanted = new Set(body.add.map((a) => a.channelId));
      const inputs = found.filter((c) => wanted.has(c.channelId)).map((c) => toProspect(c, query));
      const { added, skipped } = await bulkCreateProspects(inputs);
      return NextResponse.json({ added: added.length, skipped, prospects: added });
    }
    const candidates = found.map((c) => ({ ...c, inBook: !!findDuplicate(book, toProspect(c, query)) }));
    return NextResponse.json({ query, via: status.via, candidates });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Discovery failed' }, { status: 502 });
  }
}
