import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { mailboxForLogin } from '@/lib/mailboxes';
import { syncMailbox } from '@/lib/zoho-inbox';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Manual "refresh" for the signed-in teammate's mailbox (the inbox refresh button). */
export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const box = mailboxForLogin(user.email);
  if (!box) return NextResponse.json({ ok: false, error: 'No mailbox mapped to your login.' }, { status: 400 });
  const res = await syncMailbox(box, { sinceDays: 14 });
  return NextResponse.json(res, { status: res.ok ? 200 : 502 });
}
