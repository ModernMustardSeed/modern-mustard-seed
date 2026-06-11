import { NextResponse, type NextRequest } from 'next/server';
import { buildLaunchChecklistPdf } from '@/lib/launch-checklist-pdf';
import { VERTICALS, type VerticalId } from '@/data/launch-checklist';

export const runtime = 'nodejs';

/** Branded "New Business Launch Checklist" one-pager PDF, tailored by vertical. */
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get('vertical') || 'general';
  const valid = VERTICALS.some((v) => v.id === requested);
  const vertical = (valid ? requested : 'general') as VerticalId;

  try {
    const bytes = await buildLaunchChecklistPdf(vertical);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="new-business-launch-checklist-${vertical}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('launch-checklist pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
