import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { BOOTCAMP } from '@/data/bootcamp';
import { buildBrief, worksheetProgress } from '@/data/bootcamp-worksheet';
import { listRegistrations } from '@/lib/bootcamp/store';
import { listWorksheets } from '@/lib/bootcamp/stage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Every Idea Director worksheet, with the person, their seat and the brief it
 * writes. Sarah reads these before Day 2: the Platinum front row is picked
 * from them, and the trade rooms are planned around the jobs people named.
 * Platinum first, then by how complete the worksheet is.
 */
export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  try {
    const [sheets, regs] = await Promise.all([listWorksheets(sb), listRegistrations(sb, { launch: BOOTCAMP.launch, limit: 5000 })]);
    const byId = new Map(regs.map((r) => [r.id, r]));
    const rank: Record<string, number> = { platinum: 0, operator: 1, vip: 2, ga: 3, masterclass: 4 };
    const rows = sheets
      .map((w) => {
        const r = byId.get(w.registrationId);
        return {
          registrationId: w.registrationId,
          name: r?.name ?? null,
          email: r?.email ?? w.email,
          business: r?.business ?? null,
          trade: r?.trade ?? null,
          tier: r?.tier ?? 'unknown',
          answered: worksheetProgress(w.answers),
          savedAt: w.savedAt,
          answers: w.answers,
          brief: buildBrief(w.answers, { name: r?.name, business: r?.business }),
        };
      })
      .sort((a, b) => (rank[a.tier] ?? 9) - (rank[b.tier] ?? 9) || b.answered - a.answered);
    return NextResponse.json({ ok: true, rows });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load the worksheets.' }, { status: 500 });
  }
}
