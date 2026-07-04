import { NextResponse, type NextRequest } from 'next/server';
import { buildPromptPlaybookPdf } from '@/lib/prompt-playbook-pdf';
import { NICHES, type NicheId } from '@/data/prompt-playbook';

export const runtime = 'nodejs';

/** Branded "AI Prompt Playbook" PDF, tailored by niche. */
export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get('niche') || 'general';
  const valid = NICHES.some((n) => n.id === requested);
  const niche = (valid ? requested : 'general') as NicheId;

  try {
    const bytes = await buildPromptPlaybookPdf(niche);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="ai-prompt-playbook-${niche}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('prompt-playbook pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
