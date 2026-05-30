import { NextResponse } from 'next/server';
import { getSession } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';

/** Read and set the owner's monthly targets (revenue / leads / calls). */

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  try {
    const { data, error } = await supabase
      .from('targets')
      .select('revenue_goal, leads_goal, calls_goal')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ targets: null, needsMigration: true });
    return NextResponse.json({
      targets: data
        ? { revenue: Number(data.revenue_goal) || 0, leads: Number(data.leads_goal) || 0, calls: Number(data.calls_goal) || 0 }
        : null,
    });
  } catch {
    return NextResponse.json({ targets: null, needsMigration: true });
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: { revenue?: number; leads?: number; calls?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const row = {
    revenue_goal: Math.max(0, Math.round(Number(body.revenue) || 0)),
    leads_goal: Math.max(0, Math.round(Number(body.leads) || 0)),
    calls_goal: Math.max(0, Math.round(Number(body.calls) || 0)),
  };

  try {
    const { error } = await supabase.from('targets').insert(row);
    if (error) {
      return NextResponse.json(
        { error: 'Targets table not set up. Run the migration in supabase/migrations.', needsMigration: true },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, targets: { revenue: row.revenue_goal, leads: row.leads_goal, calls: row.calls_goal } });
  } catch {
    return NextResponse.json({ error: 'Could not save targets', needsMigration: true }, { status: 500 });
  }
}
