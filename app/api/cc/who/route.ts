import { NextResponse } from 'next/server';
import { setCcWhoCookie } from '@/lib/client-auth';
import { getDesk } from '@/lib/cc-desk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "I am Carmen." One screen in the office gets used by three people, so the
 * person at the desk can say who they are. Only a name already on the project
 * can be picked. It changes what their notes and marks are signed with and
 * nothing else: everyone on the account sees the same rows either way.
 */
export async function POST(req: Request) {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  let body: { key?: string };
  try {
    body = (await req.json()) as { key?: string };
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const person = (got.desk.account.project.people ?? {})[String(body.key ?? '')];
  if (!person) return NextResponse.json({ error: 'That name is not on this account.' }, { status: 400 });
  await setCcWhoCookie(person.email);
  return NextResponse.json({ ok: true, who: { key: body.key, name: person.name } });
}
