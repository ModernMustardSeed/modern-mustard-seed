import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { buildOnboardingPdf } from '@/lib/onboarding-pdf';

export const runtime = 'nodejs';

/** Branded new-hire Onboarding Handbook PDF. Gated to a signed-in admin. */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bytes = await buildOnboardingPdf();
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="mms-new-hire-handbook.pdf"',
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (err) {
    console.error('onboarding pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
