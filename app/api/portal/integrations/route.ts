import { NextResponse } from 'next/server';
import { getClientSession } from '@/lib/client-auth';
import { getSupabase } from '@/lib/supabase';
import { listIntegrations, disconnectGoogle, googleConfig } from '@/lib/oauth-google';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** What the client has connected, and whether connecting is even possible. */
export async function GET() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ integrations: [], available: false });

  let integrations: Awaited<ReturnType<typeof listIntegrations>> = [];
  try {
    integrations = await listIntegrations(sb, session.email);
  } catch {
    /* an un-migrated table must not break the portal */
  }

  // Never show a client a Connect button that cannot work.
  return NextResponse.json({ integrations, available: Boolean(googleConfig()) });
}

/** Cut us off. Revokes at Google too, not just in our database. */
export async function DELETE() {
  const session = await getClientSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  await disconnectGoogle(sb, session.email);
  return NextResponse.json({ ok: true });
}
