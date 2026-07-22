import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { buildHelpKnowledge } from '@/lib/mustard-help-knowledge';
import { adminDeskPrompt, forgeDeskCall } from '@/lib/mustard-desk';
import { mtDayBoundsUtc } from '@/lib/booking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Forge Mr. Mustard's ADMIN desk call for the signed-in teammate. The live
 * pipeline snapshot is best-effort: any query that fails simply drops its
 * line from the persona (the call must never break because a table moved).
 */
export async function POST() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getSupabase();
  let leadsToday: number | null = null;
  let leadsWeek: number | null = null;
  let forgeFloor: number | null = null;
  let demosReadyToday: number | null = null;

  if (supabase) {
    const { startUtc } = mtDayBoundsUtc();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [today, week, floor, ready] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', startUtc),
      supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('outbound_demo_sites').select('id', { count: 'exact', head: true }).in('status', ['queued', 'building']),
      supabase.from('outbound_demo_sites').select('id', { count: 'exact', head: true }).eq('status', 'ready').gte('built_at', startUtc),
    ]);
    leadsToday = today.error ? null : (today.count ?? null);
    leadsWeek = week.error ? null : (week.count ?? null);
    forgeFloor = floor.error ? null : (floor.count ?? null);
    demosReadyToday = ready.error ? null : (ready.count ?? null);
  }

  const prompt = adminDeskPrompt(
    { name: user.name, role: user.role, leadsToday, leadsWeek, forgeFloor, demosReadyToday },
    buildHelpKnowledge(),
  );
  const forged = await forgeDeskCall('admin', {
    greetName: user.name,
    email: user.email,
    systemPrompt: prompt,
    keyterms: ['Sidekick', 'Outbound'],
  });
  if (!forged.ok) return NextResponse.json({ error: forged.error }, { status: 503 });
  return NextResponse.json({ call: forged.call });
}
