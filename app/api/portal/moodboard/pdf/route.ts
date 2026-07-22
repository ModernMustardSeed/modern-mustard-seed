import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { loadBoardForEmail } from '@/lib/moodboard-data';
import { renderMoodboardPdf } from '@/lib/moodboard-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** The signed-in client's direction board as a keepable PDF. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const data = await loadBoardForEmail(sb, session.email);
  if (!data) return NextResponse.json({ error: 'No direction board yet.' }, { status: 404 });

  try {
    const bytes = await renderMoodboardPdf(data);
    const slug = data.businessName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Direction-Board';
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Direction-Board-${slug}.pdf"`,
      },
    });
  } catch (err) {
    console.error('moodboard pdf failed', err);
    return NextResponse.json({ error: 'The press jammed. Try again in a moment.' }, { status: 500 });
  }
}
