import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getProspect } from '@/lib/partner-desk/store';
import { SEQUENCE, instagramDM, letterFor, linkedinDM, profileUrls, researchLinks, tiktokDM, xDM } from '@/lib/partner-desk/letters';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The letter due next for one prospect (or a chosen step), plus the DMs and the research links. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;
  const p = await getProspect(id);
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = new URL(req.url);
  const stepParam = Number(url.searchParams.get('step'));
  const step = Number.isFinite(stepParam) && url.searchParams.has('step') ? stepParam : p.step;
  const letter = letterFor(p, step);
  return NextResponse.json({
    step,
    of: SEQUENCE.length,
    letter,
    dms: { instagram: instagramDM(p), tiktok: tiktokDM(p), x: xDM(p), linkedin: linkedinDM(p) },
    profiles: profileUrls(p),
    research: researchLinks(p),
  });
}
