import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { hasEntitlement, isProgramSlug, PROGRAM_ASSETS } from '@/lib/entitlements';
import { getProductBySlug } from '@/data/products';
import { getFileBytes } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Serves a product's PDF (a program playbook or a store playbook), gated by
 * entitlement. Files live in a private bucket and are only ever returned to a
 * signed-in, entitled account (a buyer, or an affiliate with free access).
 * (Per-copy watermarking with the buyer email is a planned fast-follow.)
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Resolve the PDF filename from either the program assets or the store catalog.
  const fileName = isProgramSlug(slug)
    ? PROGRAM_ASSETS[slug].pdf
    : getProductBySlug(slug)?.pdfFileName;
  if (!fileName) return new NextResponse('Not found', { status: 404 });

  const session = await getClientSession();
  if (!session) return new NextResponse('Sign in required', { status: 401 });

  const ok = await hasEntitlement(session.email, slug);
  if (!ok) return new NextResponse('Not entitled', { status: 403 });

  const bytes = await getFileBytes(fileName);
  if (!bytes) return new NextResponse('File unavailable', { status: 500 });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
