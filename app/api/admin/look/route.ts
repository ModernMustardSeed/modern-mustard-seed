import { NextResponse } from 'next/server';
import { requireAcqAdmin } from '@/lib/acq/server';
import { setLookCookie, clearLookCookie, normalizeEmail } from '@/lib/client-auth';
import { projectForEmail } from '@/lib/client-leads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * LOOK AS THE CLIENT. Opens a client's portal exactly as they see it, with
 * their Command Center switched on for Sarah alone, so it can be perfected
 * before it is sold. Nothing about the client's own view changes.
 *
 *   /api/admin/look?client=<email>          start, lands on /portal
 *   /api/admin/look?end=1&back=<admin path> stop, lands back in the admin
 *
 * The pass lasts eight hours and only works while Sarah's admin session does.
 * Whatever she does inside is real: a lead marked called is marked called.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const gate = await requireAcqAdmin();
  if ('error' in gate) return NextResponse.redirect(new URL('/admin/login', url));
  const { db } = gate;

  if (url.searchParams.get('end')) {
    await clearLookCookie();
    const back = url.searchParams.get('back') ?? '';
    // Only ever back into the admin, never to an address passed in from outside.
    const dest = back.startsWith('/admin') && !back.startsWith('//') ? back : '/admin/posting';
    return NextResponse.redirect(new URL(dest, url));
  }

  const raw = url.searchParams.get('client') ?? '';
  const email = normalizeEmail(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Name the client by their sign-in email: /api/admin/look?client=name@example.com' }, { status: 400 });
  }

  // Only someone who could sign into the portal: a client record or a project.
  let known = Boolean(projectForEmail(email));
  if (!known) {
    try {
      const { data } = await db.from('clients').select('email').eq('email', email).maybeSingle();
      known = Boolean(data);
    } catch {
      known = false;
    }
  }
  if (!known) return NextResponse.json({ error: `No client signs in as ${email}.` }, { status: 404 });

  await setLookCookie(email);
  return NextResponse.redirect(new URL('/portal', url));
}
