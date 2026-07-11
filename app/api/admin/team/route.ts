import { NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin-auth';
import { getSupabase } from '@/lib/supabase';
import { listTeamMembers } from '@/lib/team-members';
import { hashPassword } from '@/lib/team-password';
import { denverToday, denverWeekStart } from '@/lib/outbound';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const zero = { dials: 0, conversations: 0, demos: 0 };

/**
 * The team dashboard: every teammate's ONE identity joined to their real,
 * live numbers. Partner side (code, clicks, earnings from commissions) and
 * operator side (dials/demos from outbound_daily_rep_stats). Owner only. All
 * numbers are read straight from the source tables, nothing fabricated.
 */
export async function GET() {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner') return NextResponse.json({ error: 'Owners only' }, { status: 403 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const today = denverToday();
  const weekStart = denverWeekStart();

  const [members, repsRes, statsRes, commsRes, clicksRes] = await Promise.all([
    listTeamMembers(),
    sb.from('outbound_reps').select('id,name,role,daily_dial_goal,daily_demo_goal,active'),
    sb.from('outbound_daily_rep_stats').select('rep_id,day,dials,conversations,demos_booked'),
    sb.from('commissions').select('affiliate_code,amount_cents,status,kind'),
    sb.from('affiliate_clicks').select('code'),
  ]);

  const reps = repsRes.data ?? [];
  const stats = statsRes.data ?? [];
  const comms = commsRes.data ?? [];
  const clicks = clicksRes.data ?? [];

  // Per-rep dial/demo aggregates (all-time, this week, today).
  const repAgg: Record<string, { all: typeof zero; week: typeof zero; today: typeof zero }> = {};
  for (const r of reps) repAgg[r.id as string] = { all: { ...zero }, week: { ...zero }, today: { ...zero } };
  for (const row of stats) {
    const a = repAgg[row.rep_id as string];
    if (!a) continue;
    const add = (b: typeof zero) => {
      b.dials += Number(row.dials) || 0;
      b.conversations += Number(row.conversations) || 0;
      b.demos += Number(row.demos_booked) || 0;
    };
    add(a.all);
    if ((row.day as string) >= weekStart) add(a.week);
    if ((row.day as string) === today) add(a.today);
  }

  // Per-code earnings + clicks.
  const clickCount: Record<string, number> = {};
  for (const c of clicks) clickCount[c.code as string] = (clickCount[c.code as string] ?? 0) + 1;
  const earn: Record<string, { pending: number; payable: number; paid: number; sales: number }> = {};
  for (const c of comms) {
    const code = c.affiliate_code as string;
    if (!code) continue;
    const e = (earn[code] ||= { pending: 0, payable: 0, paid: 0, sales: 0 });
    if (c.status !== 'clawed_back') e.sales += 1;
    const cents = Number(c.amount_cents) || 0;
    if (c.status === 'pending') e.pending += cents;
    else if (c.status === 'payable') e.payable += cents;
    else if (c.status === 'paid') e.paid += cents;
  }

  const rows = members.map((mem) => {
    const rep = mem.rep_name
      ? reps.find((r) => String(r.name).toLowerCase() === mem.rep_name!.toLowerCase())
      : null;
    const agg = rep ? repAgg[rep.id as string] : null;
    const e = mem.affiliate_code ? earn[mem.affiliate_code] : null;
    return {
      id: mem.id,
      email: mem.email,
      name: mem.name,
      role: mem.role,
      title: mem.title,
      active: mem.active,
      affiliate_code: mem.affiliate_code,
      rep_name: mem.rep_name,
      canLogin: false, // set below without leaking the hash
      partner: {
        code: mem.affiliate_code,
        clicks: mem.affiliate_code ? clickCount[mem.affiliate_code] ?? 0 : 0,
        sales: e?.sales ?? 0,
        pendingCents: e?.pending ?? 0,
        payableCents: e?.payable ?? 0,
        paidCents: e?.paid ?? 0,
      },
      outbound: rep
        ? {
            repRole: rep.role,
            dialGoal: rep.daily_dial_goal ?? 0,
            demoGoal: rep.daily_demo_goal ?? 0,
            today: agg?.today ?? zero,
            week: agg?.week ?? zero,
            allTime: agg?.all ?? zero,
          }
        : null,
    };
  });

  return NextResponse.json({ team: rows, today, weekStart, generatedAt: new Date().toISOString() });
}

/**
 * Add or update a teammate from the admin (no env edits). Owner only. Upserts
 * the team_members row and, when a code/rep name is given but does not exist
 * yet, mints the linked partner (affiliate) row and outbound rep so one action
 * wires a whole teammate.
 */
export async function POST(req: Request) {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (me.role !== 'owner') return NextResponse.json({ error: 'Owners only' }, { status: 403 });
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  let body: {
    email?: string; name?: string; role?: string; title?: string;
    password?: string; affiliateCode?: string; repName?: string; active?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const name = (body.name ?? '').trim().slice(0, 120);
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'Enter a name.' }, { status: 400 });

  const role = body.role === 'owner' ? 'owner' : 'staff';
  const affiliateCode = (body.affiliateCode ?? '').trim().toUpperCase() || null;
  const repName = (body.repName ?? '').trim() || null;

  const row: Record<string, unknown> = {
    email,
    name,
    role,
    title: (body.title ?? '').trim() || null,
    affiliate_code: affiliateCode,
    rep_name: repName,
    active: body.active !== false,
    updated_at: new Date().toISOString(),
  };
  if (body.password && body.password.length >= 6) row.password_hash = hashPassword(body.password);

  const { error } = await sb.from('team_members').upsert(row, { onConflict: 'email' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mint the linked partner row if a code was given and none exists.
  if (affiliateCode) {
    const { data: existing } = await sb.from('affiliates').select('id').eq('code', affiliateCode).maybeSingle();
    if (!existing) {
      await sb.from('affiliates').upsert(
        { email, name, status: 'approved', code: affiliateCode, approved_at: new Date().toISOString(), promote_where: 'MMS team' },
        { onConflict: 'email' },
      );
    }
  }
  // Mint the linked outbound rep if a name was given and none exists.
  if (repName) {
    const { data: existing } = await sb.from('outbound_reps').select('id').ilike('name', repName).maybeSingle();
    if (!existing) {
      await sb.from('outbound_reps').insert({ name: repName, role: role === 'owner' ? 'primary' : 'caller', active: true });
    }
  }

  return NextResponse.json({ ok: true });
}
