import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { dossier, search } from '@/lib/cc-find';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ONE BOX, THE WHOLE BUSINESS.
 *
 *   ?q=fulbright     every row in every room that mentions them
 *   ?who=1&email=&phone=&name=   everything known about one person
 *
 * Both are scoped to the signed-in business on every table they touch. A
 * search is the easiest place in an app to leak somebody else's row, because
 * it is the one query nobody thinks to filter.
 */
export async function GET(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account } = got.desk;

  const url = new URL(req.url);

  if (url.searchParams.get('who')) {
    try {
      const card = await dossier(sb, account.clientEmail, {
        email: url.searchParams.get('email'),
        phone: url.searchParams.get('phone'),
        name: url.searchParams.get('name'),
      });
      return NextResponse.json({ person: card });
    } catch {
      return NextResponse.json({ person: null });
    }
  }

  try {
    return NextResponse.json({ hits: await search(sb, account.clientEmail, url.searchParams.get('q') ?? '') });
  } catch {
    // A room that is not migrated yet must not take the search down with it.
    return NextResponse.json({ hits: [] });
  }
}
