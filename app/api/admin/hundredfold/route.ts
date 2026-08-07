import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { activeMemberCount, listMembers } from '@/lib/hundredfold-store';


export const runtime = 'nodejs';

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const members = await listMembers();
  const active = await activeMemberCount();

  return NextResponse.json({ ok: true, members, active: active ?? 0 });
}
