import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { hasEntitlement, isProgramSlug, PROGRAM_ASSETS } from '@/lib/entitlements';
import { getFileBytes } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Serves a program's playbook PDF, gated by entitlement. The file lives in a
 * private bucket and is only ever returned to a signed-in, entitled buyer.
 * (Per-copy watermarking with the buyer email is a planned fast-follow.)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isProgramSlug(slug)) return new NextResponse('Not found', { status: 404 });

  const session = await getClientSession();
  if (!session) return new NextResponse('Sign in required', { status: 401 });

  const ok = await hasEntitlement(session.email, slug);
  if (!ok) return new NextResponse('Not entitled', { status: 403 });

  const assets = PROGRAM_ASSETS[slug];
  const bytes = await getFileBytes(assets.pdf);
  if (!bytes) return new NextResponse('File unavailable', { status: 500 });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${assets.pdf}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
