import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';
import { normalizeEmail, setCcSessionCookie, setCcWhoCookie, setClientSessionCookie, setStudioAs, setStudioPass, STUDIO_EMAIL } from '@/lib/client-auth';
import { accountForSession, projectForDoor } from '@/lib/cc-access';
import { hydrateDesks } from '@/lib/client-desks';
import { checkChallenge } from '@/lib/cc-code';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Step two. A right code sets the Command Center's own 30 day session, keyed
 * to the project's address, so Carmen's code and Shan's code open the same
 * board with the same rows.
 */
export async function POST(req: Request) {
  let body: { email?: string; code?: string; door?: string };
  try {
    body = (await req.json()) as { email?: string; code?: string; door?: string };
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const email = normalizeEmail(body.email ?? '');
  const result = await checkChallenge(email, String(body.code ?? ''));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // The studio key: a pass for Sarah, then the client whose door she came in
  // by. From /cc/login there is no door, so she lands on the picker.
  if (email === STUDIO_EMAIL) {
    await hydrateDesks();
    await setStudioPass();
    const at = body.door ? projectForDoor(body.door) : null;
    if (at) await setStudioAs(at.clientEmail);
    return NextResponse.json({ ok: true, next: at ? '/cc' : '/cc/login' });
  }

  const sb = getSupabase();
  const account = sb ? await accountForSession(sb, email) : null;
  if (!account) return NextResponse.json({ error: 'That account does not have a Command Center yet.' }, { status: 403 });

  await setCcSessionCookie(account.clientEmail);
  // ONE SIGN-IN, BOTH DIRECTIONS. The portal door already mints the Command
  // Center cookie; this is the return leg. Without it the rail's own link to
  // the project portal asked for a second sign-in, which is the two-door
  // problem from the client's side of the desk. The portal session is keyed
  // to the address they typed, because the portal is per person.
  await setClientSessionCookie(account.typed);
  // The board is shared, the person is not. Keep who this code was mailed to,
  // so what they write is signed with their name.
  if (account.personEmail) await setCcWhoCookie(account.personEmail);
  return NextResponse.json({ ok: true, next: '/cc' });
}
