import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { OPEN_STAGES, listJobs, riskOf } from '@/lib/cc-jobs';
import { mountainDate } from '@/lib/posting/time';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * YOUR DAY, assembled from rows at the moment it is asked for.
 *
 * Every room already knows its own corner of today. Nowhere said the whole of
 * it, so the first thing a person did every morning was walk five rooms and
 * hold the answer in their head. This is that walk, done once, in the order a
 * day actually runs: who is coming, what you said you would do, who is
 * waiting, and what goes out without you.
 *
 * Nothing here is written by a model, and nothing is a guess. A day that
 * contains one appointment says one appointment.
 */
export async function GET() {
  const got = await getDesk();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  const { sb, account, who } = got.desk;
  const email = account.clientEmail;
  const today = mountainDate();

  const [appointments, jobs, leads, posts] = await Promise.all([
    sb
      .from('client_appointments')
      .select('id, name, phone, email, starts_at, kind, status, notes')
      .eq('client_email', email)
      .gte('starts_at', `${today}T00:00:00`)
      .lte('starts_at', `${today}T23:59:59`)
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: true })
      .limit(12)
      .then((r) => r, () => ({ data: [] })),
    listJobs(sb, email).catch(() => []),
    sb
      .from('client_leads')
      // handled_at is the called mark, and it is a human mark only: no cron,
      // no reply and no self-booking sets it. See the lead desk.
      .select('id, name, phone, created_at, owner_name, handled_at')
      .eq('client_email', email)
      .is('handled_at', null)
      .order('created_at', { ascending: true })
      .limit(10)
      .then((r) => r, () => ({ data: [] })),
    sb
      .from('posting_posts')
      .select('id, headline, scheduled_for, status, platforms')
      .eq('client_email', email)
      .eq('scheduled_for', today)
      .limit(4)
      .then((r) => r, () => ({ data: [] })),
  ]);

  const open = (jobs as Awaited<ReturnType<typeof listJobs>>).filter((j) => OPEN_STAGES.includes(j.stage));

  // What a person said they would do, today or earlier and not yet done.
  const dueToday = open
    .filter((j) => j.next_step && j.next_step_on && j.next_step_on <= today)
    .sort((a, b) => (a.next_step_on ?? '').localeCompare(b.next_step_on ?? ''))
    .slice(0, 8)
    .map((j) => ({
      id: j.id,
      job: j.name,
      step: j.next_step,
      on: j.next_step_on,
      late: (j.next_step_on ?? today) < today,
      phone: j.contact_phone,
      owner: j.owner_name,
    }));

  // Gone quiet, loudest first. The board colours these; this counts them.
  const quiet = open
    .map((j) => ({ job: j, risk: riskOf(j) }))
    .filter((x) => x.risk.level === 'quiet' || x.risk.level === 'cold')
    .sort((a, b) => (b.job.value_cents ?? 0) - (a.job.value_cents ?? 0))
    .slice(0, 5)
    .map((x) => ({ id: x.job.id, job: x.job.name, why: x.risk.why, value_cents: x.job.value_cents }));

  return NextResponse.json({
    today,
    who: who?.name ?? null,
    appointments: (appointments.data ?? []).map((a) => ({
      id: String(a.id),
      name: (a.name as string) ?? null,
      phone: (a.phone as string) ?? null,
      at: a.starts_at as string,
      kind: (a.kind as string) ?? null,
      note: (a.notes as string) ?? null,
    })),
    dueToday,
    quiet,
    waiting: (leads.data ?? []).map((l) => ({ id: String(l.id), name: (l.name as string) ?? 'Someone', phone: (l.phone as string) ?? null, since: l.created_at as string, owner: (l.owner_name as string) ?? null })),
    posting: (posts.data ?? []).map((p) => ({ id: String(p.id), headline: (p.headline as string) ?? 'Post', status: p.status as string, platforms: (p.platforms as string[] | null) ?? [] })),
  });
}
