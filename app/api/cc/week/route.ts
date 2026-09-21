import { NextResponse } from 'next/server';
import { getDesk } from '@/lib/cc-desk';
import { brandFor } from '@/lib/cc-access';
import { buildWeek, weekEmail } from '@/lib/cc-week';
import { getSettings } from '@/lib/posting/settings';
import { mailStatus } from '@/lib/mail-desk';
import { sendViaResend } from '@/lib/send-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;

/**
 * THE WEEK, read and sent. GET counts it. POST mails the same count to the
 * addresses a person typed, because a person pressed Send: there is no
 * schedule behind this and nothing goes out on its own.
 */

async function report() {
  const got = await getDesk();
  if (!got.ok) return { got, week: null } as const;
  const { sb, account } = got.desk;
  const [posting, mail] = await Promise.all([
    getSettings(sb, account.clientEmail).catch(() => null),
    mailStatus(sb, account.clientEmail).catch(() => null),
  ]);
  const week = await buildWeek(sb, account, { marketing: Boolean(posting?.visible), mailConnected: Boolean(mail?.connected) });
  return { got, week } as const;
}

export async function GET() {
  const { got, week } = await report();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  return NextResponse.json({ week, sendTo: got.desk.who ? got.desk.author.email : null });
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  let body: { to?: string[]; note?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'We could not read that.' }, { status: 400 });
  }
  const to = [...new Set((body.to ?? []).map((a) => String(a).trim().toLowerCase()).filter(Boolean))];
  if (!to.length) return NextResponse.json({ error: 'Who should it go to?' }, { status: 400 });
  if (to.length > 5) return NextResponse.json({ error: 'Five addresses at most.' }, { status: 400 });
  const bad = to.find((a) => !EMAIL.test(a));
  if (bad) return NextResponse.json({ error: `${bad} does not look like an email address.` }, { status: 400 });

  const { got, week } = await report();
  if (!got.ok) return NextResponse.json({ error: got.error }, { status: got.status });
  if (!week) return NextResponse.json({ error: 'The week could not be counted just now.' }, { status: 500 });
  const { account, author } = got.desk;
  const brand = brandFor(account.project);

  const sent: string[] = [];
  const failed: Array<{ to: string; error: string }> = [];
  for (const addr of to) {
    const r = await sendViaResend({
      from: `${brand.business} Command Center <sarah@modernmustardseed.com>`,
      to: addr,
      replyTo: author.email,
      subject: `${brand.business}: the week of ${week.range}`,
      html: weekEmail(week, { ink: brand.colors.ink, accent: brand.colors.accent }, author.name, (body.note ?? '').trim().slice(0, 600) || undefined),
    });
    if (r.ok) sent.push(addr);
    else failed.push({ to: addr, error: r.error });
  }
  if (!sent.length) return NextResponse.json({ error: failed[0]?.error ?? 'Nothing went out.' }, { status: 502 });
  return NextResponse.json({ ok: true, sent, failed });
}
