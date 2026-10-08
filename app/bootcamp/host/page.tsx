import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { BOOTCAMP, HOSTS, OPERATOR, bootcampTiers, usd } from '@/data/bootcamp';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import HostForm from '@/components/bootcamp/HostForm';
import { Check, Kicker, h2Cls, h2SmCls, leadCls } from '@/components/bootcamp/ui';

/** HOST A ROOM. The terms, the math, the application. No names, no logos: the first hosts are not signed yet. */

export const metadata = buildMetadata({
  title: `${HOSTS.name}: Run the Bootcamp for Your Audience and Keep Every Ticket`,
  description: HOSTS.pitch,
  path: '/bootcamp/host',
});

const GETS = [
  { title: 'Swipe copy and graphics', body: 'The email, the post, the DM and the story text, written and ready. Change a word or send it as is.' },
  { title: 'Your tracking link', body: 'A link under your name that credits every seat for 180 days, whether they buy that night or after the masterclass replay.' },
  { title: 'A live dashboard', body: 'Clicks, seats, tickets by tier, revenue and what is owed to you, updated as it happens.' },
  { title: 'The founding host badge', body: `The first ${HOSTS.foundingHosts} hosts keep these terms on all four 2027 launches and are named on the door of their room.` },
];

export default function HostPage() {
  const [ga, vip] = bootcampTiers;
  const operatorShare = Math.round((OPERATOR.priceCents * HOSTS.programPct) / 100);
  const math = [
    { line: `10 tickets at ${usd(ga.priceCents)}`, n: usd(ga.priceCents * 10), note: 'All of it is yours.' },
    { line: `100 VIP seats at ${usd(vip.priceCents)}`, n: usd(vip.priceCents * 100), note: 'All of it is yours, and you host your own room on Day 2.' },
    { line: `Every Operator seat, ${usd(OPERATOR.priceCents)}`, n: usd(operatorShare), note: `${HOSTS.programPct}% of each seat your people take, for the whole cohort.` },
  ];

  return (
    <div className="bg-[#fbf5ea] text-[#0b3b44] overflow-x-clip">
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: BOOTCAMP.short, url: '/bootcamp' }, { name: HOSTS.name, url: '/bootcamp/host' }])} />

      <PopPageHero
        eyebrow={<span>{HOSTS.name} · {HOSTS.ticketPct}% of every ticket</span>}
        title={<>Run it for your audience. Keep <em>every ticket.</em></>}
        titleId="host-heading"
        art={{ src: '/art/bootcamp/rooms', alt: 'Cut-paper diorama: four paper rooms on a quay, one per trade. A builder with a house frame under a mustard awning, a clinic chair under a coral awning, a service van under a Tiffany blue awning, and an agency easel under a lagoon green awning.', caption: 'Your name on the door.' }}
        sticker="Hosts"
        issue={{ no: String(HOSTS.foundingHosts), lines: ['founding hosts', 'all 2027 launches'] }}
      >
        <p>{HOSTS.pitch}</p>
        <div className={pop.actions}>
          <a href="#apply" className={pop.cta}>{HOSTS.cta}</a>
          <a href="#math" className={pop.ctaAlt}>See the math</a>
        </div>
        <p className={pop.note}>Newsletters, podcasts, communities, agencies with a client list. If people already listen to you about running a business, this is for you.</p>
      </PopPageHero>

      {/* THE TERMS */}
      <section className="py-14 md:py-20" aria-labelledby="terms-heading">
        <div className="max-w-5xl mx-auto px-5 grid lg:grid-cols-[1fr_1fr] gap-10 lg:gap-14">
          <div>
            <Kicker>The terms</Kicker>
            <h2 id="terms-heading" className={h2Cls}>Six lines. <em>No fine print.</em></h2>
            <ul className="mt-8 space-y-3">
              {HOSTS.terms.map((t) => <Check key={t}>{t}</Check>)}
            </ul>
          </div>
          <div>
            <Kicker>What you get</Kicker>
            <h2 className={h2Cls}>Ready the day <em>you are approved.</em></h2>
            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {GETS.map((g) => (
                <div key={g.title} className="rounded-2xl border-2 border-[#0b3b44] bg-white p-5 shadow-[5px_5px_0_0_#0b3b44]">
                  <h3 className="font-display text-lg font-black">{g.title}</h3>
                  <p className="font-body text-[14.5px] text-[#0b3b44]/75 leading-relaxed mt-2">{g.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* THE MATH */}
      <section id="math" className="py-16 md:py-20 bg-[#0b3b44] text-[#fbf5ea] border-y-2 border-[#0b3b44] scroll-mt-24" aria-labelledby="math-heading">
        <div className="max-w-5xl mx-auto px-5">
          <Kicker dark>The math, plainly</Kicker>
          <h2 id="math-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">What a room <em>pays its host.</em></h2>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {math.map((m) => (
              <div key={m.line} className="rounded-2xl border-2 border-[#81d8d0] bg-[#0e4b56] p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#81d8d0] font-bold">{m.line}</p>
                <p className="font-display text-4xl sm:text-5xl font-black tracking-tight text-[#f5b700] mt-3 leading-none">{m.n}</p>
                <p className="font-body text-[14.5px] text-[#fbf5ea]/80 leading-relaxed mt-3">{m.note}</p>
              </div>
            ))}
          </div>
          <p className="font-body text-sm text-[#fbf5ea]/60 mt-8 max-w-2xl">Paid within ten days after Day 3, to the account you name. Stripe handles the tickets, so the count is the count.</p>
        </div>
      </section>

      {/* APPLY */}
      <section id="apply" className="py-16 md:py-24 scroll-mt-24" aria-labelledby="apply-heading">
        <div className="max-w-5xl mx-auto px-5 grid lg:grid-cols-[0.8fr_1.2fr] gap-10 items-start">
          <div>
            <Kicker>Apply</Kicker>
            <h2 id="apply-heading" className={h2SmCls}>Tell us about <em>your room.</em></h2>
            <p className={leadCls}>Sarah reads every application herself. If the fit is right, your link, dashboard and swipe copy arrive in the approval email, the same day.</p>
            <p className="font-body text-sm text-[#0b3b44]/60 mt-6">Not sure your audience fits? Apply anyway and say so in the last field. The four rooms are the start, not the limit.</p>
            <Link href="/bootcamp" className="mt-6 inline-flex font-sans text-xs font-extrabold uppercase tracking-[0.16em] text-[#0a7c78] underline underline-offset-4">What your people will see</Link>
          </div>
          <HostForm />
        </div>
      </section>
    </div>
  );
}
