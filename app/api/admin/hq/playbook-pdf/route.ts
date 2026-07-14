import { NextResponse } from 'next/server';
import { SITE } from '@/lib/seo';
import { getAdminUser } from '@/lib/admin-auth';
import { resolveAdminPartner } from '@/lib/admin-partner';
import { buildOutreachPlaybookPdf } from '@/lib/outreach-playbook-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The personalized Outreach Playbook PDF for the admin team. Mirrors
 * /api/partners/playbook/pdf but gates on the ADMIN session and resolves the
 * teammate's partner code through team_members (admin login and partner email
 * can differ).
 */
export async function GET() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const partner = await resolveAdminPartner(user);
  if (!partner) {
    return NextResponse.json({ error: 'No partner code is linked to this login yet.' }, { status: 403 });
  }

  try {
    const siteDisplay = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const bytes = await buildOutreachPlaybookPdf({
      bookUrl: `${siteDisplay}/book?ref=${partner.code}`,
      code: partner.code,
      name: partner.name || undefined,
    });
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="mms-outreach-playbook.pdf"',
        'Cache-Control': 'private, max-age=0, no-store',
      },
    });
  } catch (err) {
    console.error('admin outreach playbook pdf error', err);
    return NextResponse.json({ error: 'Could not generate the PDF.' }, { status: 500 });
  }
}
