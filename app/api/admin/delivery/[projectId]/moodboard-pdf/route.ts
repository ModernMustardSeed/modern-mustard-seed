import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { loadBoardForProject } from '@/lib/moodboard-data';
import { renderMoodboardPdf } from '@/lib/moodboard-pdf';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Any project's direction board as a PDF, drafts included (Sarah's copy). */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Not available' }, { status: 500 });

  const { projectId } = await params;
  const data = await loadBoardForProject(sb, projectId);
  if (!data) return NextResponse.json({ error: 'No board on this project yet.' }, { status: 404 });

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
    console.error('admin moodboard pdf failed', err);
    return NextResponse.json({ error: 'The press jammed. Try again in a moment.' }, { status: 500 });
  }
}
