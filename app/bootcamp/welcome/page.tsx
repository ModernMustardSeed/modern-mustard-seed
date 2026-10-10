import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { BOOTCAMP, OPERATOR, bootcampDays, fmtMountain, fmtMountainTime, getBootcampTier, usd } from '@/data/bootcamp';
import { Kicker, btn } from '@/components/bootcamp/ui';

/**
 * AFTER THE DOOR. Two arrivals: a free masterclass registration
 * (?masterclass=1) and a Stripe return (?session_id=). Nothing here is
 * indexed and nothing here is cached.
 */
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: `You Are In: ${BOOTCAMP.short}`,
  description: 'Your seat is saved. Here is exactly what happens next.',
  path: '/bootcamp/welcome',
  noindex: true,
});

type Session = { tier?: string; name?: string; email?: string; amountCents?: number };

const when = (iso: string) => `${fmtMountain(iso)}, ${fmtMountainTime(iso)} ${BOOTCAMP.tzLabel}`;
const ics = (which: 'masterclass' | 'kickoff' | 'day1' | 'day2' | 'day3') => `/api/bootcamp/invite.ics?which=${which}`;

function Shell({ kicker, title, lead, children }: { kicker: string; title: React.ReactNode; lead: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#fcfaf3] text-[#141210] min-h-[70vh]">
      <section className="halftone-bg border-b-2 border-[#141210]">
        <div className="max-w-2xl mx-auto px-5 pt-28 pb-14 md:pt-36 md:pb-20 text-center">
          <Kicker className="justify-center">{kicker}</Kicker>
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.02]">{title}</h1>
          <p className="font-body text-[#141210]/70 mt-5 max-w-lg mx-auto leading-relaxed">{lead}</p>
        </div>
      </section>
      <section className="py-14 md:py-20">
        <div className="max-w-2xl mx-auto px-5 space-y-4">{children}</div>
      </section>
    </div>
  );
}

function Step({ n, title, body, action }: { n: string; title: string; body: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-[4px] bg-white border-2 border-[#141210] p-6 flex gap-5">
      <p className="font-display text-4xl font-black text-[#f5b700] leading-none" aria-hidden="true">{n}</p>
      <div className="min-w-0 flex-1">
        <h2 className="font-display font-black text-lg">{title}</h2>
        <div className="font-body text-sm text-[#141210]/75 mt-1.5 leading-relaxed">{body}</div>
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

function CalLink({ which, label }: { which: Parameters<typeof ics>[0]; label: string }) {
  return (
    <a href={ics(which)} className="inline-flex items-center rounded-full border-2 border-[#141210] bg-white px-4 py-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#141210] hover:-translate-y-0.5 transition-all">
      {label}
    </a>
  );
}

export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const masterclass = sp.masterclass === '1';
  const sessionId = typeof sp.session_id === 'string' ? sp.session_id.trim() : '';

  if (masterclass) {
    return (
      <Shell kicker="Free masterclass · you are in" title={<>You are <em>in.</em></>} lead={`${when(BOOTCAMP.dates.masterclass)}. Sixty minutes. The link to the room is in your inbox now, with a reminder the day before and one an hour out.`}>
        <Step n="1" title="Put it on the calendar" body="One click. Your room link is in the confirmation email, and again in the reminder the morning of." action={<CalLink which="masterclass" label="Add to calendar" />} />
        <Step n="2" title="What to expect" body={<ul className="list-disc pl-4 space-y-1">{bootcampDays[0].beats.slice(0, 4).map((b) => <li key={b}>{b}</li>)}</ul>} />
        <Step n="3" title="Bring one idea" body="The thing you would hand to an agent tomorrow if you could. We take a few from the room at the end and show how the brief would read." />
        <div className="rounded-[4px] border-2 border-[#141210] bg-[#141210] text-[#fcfaf3] p-6 sm:p-8 shadow-[6px_6px_0_0_#f5b700] mt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#e8ecd0] font-bold">If you already know you want the rest</p>
          <h2 className="font-display text-2xl font-black mt-2 leading-tight">The bootcamp: three live sessions.</h2>
          <p className="font-body text-[15px] text-[#fcfaf3]/80 leading-relaxed mt-2">{BOOTCAMP.promise} {bootcampDays[0].dateLabel} to {bootcampDays[2].dateLabel}. Day 1 is guaranteed.</p>
          <Link href="/bootcamp#tiers" className={`${btn.onDark} mt-5`}>See the three seats</Link>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#141210]/50 text-center pt-6">Questions any time: sarah@modernmustardseed.com</p>
      </Shell>
    );
  }

  if (sessionId) {
    let session: Session | null = null;
    let failed = false;
    try {
      const res = await fetch(`${SITE.url}/api/bootcamp/session?session_id=${encodeURIComponent(sessionId)}`, { cache: 'no-store' });
      if (res.ok) session = (await res.json()) as Session;
      else failed = true;
    } catch {
      failed = true;
    }

    const tierSlug = session?.tier ?? '';
    const isOperator = tierSlug === 'operator';
    const tier = getBootcampTier(tierSlug);
    const tierName = isOperator ? OPERATOR.name : tier?.name ?? (failed ? 'Your seat' : 'Your seat');
    const first = session?.name?.trim().split(/\s+/)[0];

    if (isOperator) {
      return (
        <Shell kicker={`${OPERATOR.name} · seat confirmed`} title={<>{first ? `${first}, you` : 'You'} are <em>in the cohort.</em></>} lead={`Starts ${OPERATOR.starts}. Tuesdays 1:00 to 2:30 PM Mountain with a Thursday build lab every week. Your welcome note, with your room link, is in your inbox.`}>
          <Step n="1" title="Check your inbox" body={<>The welcome note from Sarah has your room link. Inside the room is the pre-work for week one, the Idea Director worksheet: about twenty minutes, then you are done until we start.{session?.email ? <> Sent to <strong>{session.email}</strong>.</> : null}</>} />
          <Step n="2" title="Your office opens before week one" body="Your SeedSide office is set up in the week before the cohort starts, so week one begins with a desk, not a setup call." />
          <Step n="3" title="The bootcamp sessions are yours too" body={`Every Operator seat includes the three bootcamp sessions, ${bootcampDays[0].dateLabel} to ${bootcampDays[2].dateLabel}. Add them now.`} action={<><CalLink which="kickoff" label="Kickoff" /><CalLink which="day1" label="Day 1" /><CalLink which="day2" label="Day 2" /><CalLink which="day3" label="Day 3" /></>} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#141210]/50 text-center pt-6">Questions any time: sarah@modernmustardseed.com</p>
        </Shell>
      );
    }

    return (
      <Shell
        kicker={failed ? `${BOOTCAMP.short} · seat confirmed` : `${tierName} · seat confirmed`}
        title={<>{first ? `${first}, you` : 'You'} have <em>a seat.</em></>}
        lead={
          failed
            ? 'Stripe has your payment and your receipt is on its way. We could not load the ticket details on this page just now; everything below still applies, and your welcome email has the rest.'
            : `${tierName}${session?.amountCents ? `, ${usd(session.amountCents)}` : ''}. Your welcome note is in your inbox with your room link; the Idea Director worksheet is waiting inside.`
        }
      >
        <Step n="1" title={`Kickoff: ${fmtMountain(BOOTCAMP.dates.kickoff)}`} body={`${fmtMountainTime(BOOTCAMP.dates.kickoff)} ${BOOTCAMP.tzLabel}. Setup done together: SeedSide, your calendar and inbox connected, so Day 1 starts at speed.`} action={<CalLink which="kickoff" label="Add kickoff" />} />
        <Step n="2" title={`Day 1: ${bootcampDays[0].dateLabel}`} body={`${bootcampDays[0].title}. ${bootcampDays[0].lead}`} action={<><CalLink which="day1" label="Add Day 1" /><CalLink which="day2" label="Add Day 2" /><CalLink which="day3" label="Add Day 3" /></>} />
        <Step n="3" title="Your room" body="One link, in your welcome email: the live sessions play there, questions go in from there, and replays go up there the same evening for the length of your ticket. The worksheet is inside too, about twenty minutes, before kickoff." />
        {tier && (
          <Step n="4" title="Bring a friend" body={<>Day 2 works better in pairs: two people from the same trade room push each other further. Send them to <span className="font-mono">{SITE.url.replace('https://', '')}/bootcamp</span>. Seats stay open until the night of Day 1.</>} action={<Link href="/bootcamp" className="inline-flex items-center rounded-full border-2 border-[#141210] bg-[#f5b700] px-4 py-2 font-sans text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#141210]">The offer page</Link>} />
        )}
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#141210]/50 text-center pt-6">Questions any time: sarah@modernmustardseed.com</p>
      </Shell>
    );
  }

  return (
    <Shell kicker={BOOTCAMP.short} title={<>Nothing to show <em>yet.</em></>} lead="This page follows a registration or a ticket. If you just paid and landed here without your details, your receipt is in your inbox and we are a reply away.">
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Link href="/bootcamp" className={btn.dark}>The bootcamp</Link>
        <Link href="/bootcamp/masterclass" className={btn.white}>Free masterclass</Link>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#141210]/50 text-center pt-6">sarah@modernmustardseed.com</p>
    </Shell>
  );
}
