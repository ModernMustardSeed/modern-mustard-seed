import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { hasEntitlement, isProgramSlug, PROGRAM_ASSETS } from '@/lib/entitlements';
import { getFileText } from '@/lib/storage';

export const runtime = 'nodejs';

/**
 * Serves a program's live tool (Ops Center / Spec Studio) HTML, but only to a
 * signed-in, entitled buyer. The HQ page embeds this in an iframe, so the
 * tool's self-contained document and its browser-saved progress stay intact.
 * The file lives in a private bucket and is never publicly reachable.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isProgramSlug(slug)) return new NextResponse('Not found', { status: 404 });

  const session = await getClientSession();
  if (!session) return new NextResponse('Sign in required', { status: 401 });

  const ok = await hasEntitlement(session.email, slug);
  if (!ok) return new NextResponse('Not entitled', { status: 403 });

  const html = await getFileText(PROGRAM_ASSETS[slug].tool);
  if (!html) return new NextResponse('Tool unavailable', { status: 500 });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
