import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { lastSelfCheck } from '@/lib/cc-selfcheck';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * WHEN THE DESK LAST LOOKED AT ITSELF, and what it found.
 *
 * A self healing loop nobody can see is indistinguishable from one that has
 * stopped running, which is the failure this endpoint exists to make visible.
 */
export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;
  return NextResponse.json({ health: await lastSelfCheck(sb, account.clientEmail) });
}
