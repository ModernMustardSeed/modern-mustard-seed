import { NextResponse } from 'next/server';
import { SITE } from '@/lib/seo';
import { getSession, getAdminUser } from '@/lib/admin-auth';
import { getAffiliateByEmail } from '@/lib/affiliate';
import { buildSalesTrainingPdf } from '@/lib/sales-training-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Branded Sales Training PDF, personalized with the rep's link. Admin-gated. */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    let bookUrl = `${siteDisplay}/book`;
    const user = await getAdminUser();
    if (user?.email) {
      const aff = await getAffiliateByEmail(user.email);
      if (aff?.status === 'approved' && aff.code) bookUrl = `${siteDisplay}/book?ref=${aff.code}`;
    }

    const bytes = await buildSalesTrainingPdf({ bookUrl });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="mms-sales-training.pdf"',
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (err) {
    console.error('sales training pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
