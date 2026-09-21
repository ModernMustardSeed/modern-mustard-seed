import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { normalizeEmail, setCcSessionCookie, setCcWhoCookie } from '@/lib/client-auth';
import { accountForSession } from '@/lib/cc-access';
import { checkChallenge } from '@/lib/cc-code';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Step two. A right code sets the Command Center's own 30 day session, keyed
 * to the project's address, so Carmen's code and Shan's code open the same
 * board with the same rows.
 */
export async function POST(req: Request) {
  let body: { email?: string; code?: string };
  try {
    body = (await req.json()) as { email?: string; code?: string };
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const email = normalizeEmail(body.email ?? '');
  const result = await checkChallenge(email, String(body.code ?? ''));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const sb = getSupabase();
  const account = sb ? await accountForSession(sb, email) : null;
  if (!account) return NextResponse.json({ error: 'That account does not have a Command Center yet.' }, { status: 403 });

  await setCcSessionCookie(account.clientEmail);
  // The board is shared, the person is not. Keep who this code was mailed to,
  // so what they write is signed with their name.
  if (account.person) await setCcWhoCookie(account.typed);
  return NextResponse.json({ ok: true });
}
