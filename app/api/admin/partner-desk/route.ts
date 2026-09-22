import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { bulkCreateProspects, createProspect, findDuplicate, listProspects, parseCsv, summarize, type ProspectInput } from '@/lib/partner-desk/store';
import { discoverConfigured } from '@/lib/partner-desk/discover';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The book: every prospect, the header numbers, and whether the finder and the mail are set up. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const prospects = await listProspects();
    const youtube = await discoverConfigured(getSupabase());
    return NextResponse.json({
      prospects,
      summary: summarize(prospects),
      configured: { youtube: youtube.ok, youtubeVia: youtube.via, email: !!process.env.RESEND_API_KEY },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not read the book';
    // A missing table reads as an empty desk with the reason on screen, never a crash.
    return NextResponse.json({ prospects: [], summary: summarize([]), configured: { youtube: false, youtubeVia: null, email: !!process.env.RESEND_API_KEY }, error: message });
  }
}

/**
 * Add to the book. Accepts one prospect, a list of prospects, or pasted CSV.
 * Duplicates (same email, handle or channel) are skipped and named in the reply.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let body: { prospect?: ProspectInput; prospects?: ProspectInput[]; csv?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  try {
    if (body.csv) {
      const parsed = parseCsv(body.csv);
      if (!parsed.length) return NextResponse.json({ error: 'No rows found. The first column is the name.' }, { status: 400 });
      const { added, skipped } = await bulkCreateProspects(parsed);
      return NextResponse.json({ added: added.length, skipped, prospects: added });
    }
    if (Array.isArray(body.prospects)) {
      const { added, skipped } = await bulkCreateProspects(body.prospects);
      return NextResponse.json({ added: added.length, skipped, prospects: added });
    }
    if (body.prospect) {
      if (!body.prospect.name?.trim()) return NextResponse.json({ error: 'A name is required.' }, { status: 400 });
      const existing = await listProspects();
      const dup = findDuplicate(existing, body.prospect);
      if (dup) return NextResponse.json({ error: `${dup.name} is already in the book.` }, { status: 409 });
      const p = await createProspect(body.prospect);
      return NextResponse.json({ added: 1, skipped: [], prospects: [p] });
    }
    return NextResponse.json({ error: 'Nothing to add.' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not add' }, { status: 500 });
  }
}
