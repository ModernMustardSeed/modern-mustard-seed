import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { runScalingRoadmap, type RoadmapContext } from '@/lib/scaling-roadmap';
import { listRoadmaps, saveRoadmap } from '@/lib/roadmap-store';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** The desk list. */
export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const search = new URL(req.url).searchParams.get('q') ?? undefined;
  const rows = await listRoadmaps({ search, limit: 300 });
  return NextResponse.json({ ok: true, rows });
}

/**
 * Generate a roadmap from the desk, for a prospect or for one of ours.
 *
 * `slug` and `featured` are admin-only powers: a stable slug is how the seeded
 * worked examples (ours) keep the same URL when they are regenerated.
 */
export async function POST(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let body: {
    url?: string;
    context?: RoadmapContext;
    slug?: string;
    featured?: boolean;
    seed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  // The desk is Sarah, not a visitor. She can wait for the better document.
  const result = await runScalingRoadmap(body.url ?? '', body.context ?? {}, { effort: 'high' });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }

  const saved = await saveRoadmap({
    url: result.url,
    host: result.host,
    report: result.report,
    context: body.context ?? {},
    source: body.seed ? 'seed' : 'admin',
    slug: body.slug,
    featured: body.featured,
  });

  return NextResponse.json({
    ok: true,
    slug: saved?.slug ?? null,
    host: result.host,
    report: result.report,
    usage: result.usage,
  });
}
