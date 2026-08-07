import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { activeMemberCount, listMembers } from '@/lib/hundredfold-store';
import { HUNDREDFOLD, seatsLeft } from '@/lib/hundredfold';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const members = await listMembers();
  const active = await activeMemberCount();

  return NextResponse.json({
    ok: true,
    members,
    seats: {
      total: HUNDREDFOLD.foundingSeats,
      taken: active ?? 0,
      left: active === null ? null : seatsLeft(active),
    },
  });
}
