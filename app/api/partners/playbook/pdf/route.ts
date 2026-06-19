import { NextResponse } from 'next/server';
import { SITE } from '@/lib/seo';
import { getClientSession } from '@/lib/client-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { buildOutreachPlaybookPdf } from '@/lib/outreach-playbook-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Branded, personalized Outreach Playbook PDF. Gated to an approved partner. */
export async function GET() {
  const session = await getClientSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliate = await getAffiliateByEmail(session.email);
  if (!affiliate || affiliate.status !== 'approved' || !affiliate.code) {
    return NextResponse.json({ error: 'Not an approved partner' }, { status: 403 });
  }

  try {
    const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const bytes = await buildOutreachPlaybookPdf({
      bookUrl: `${siteDisplay}/book?ref=${affiliate.code}`,
      code: affiliate.code,
      name: affiliate.name || undefined,
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="mms-outreach-playbook.pdf"',
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (err) {
    console.error('outreach playbook pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
