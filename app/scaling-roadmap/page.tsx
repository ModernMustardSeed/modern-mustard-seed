import Link from 'next/link';
import ScalingRoadmapEngine from '@/components/ScalingRoadmapEngine';
import { listFeatured } from '@/lib/roadmap-store';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'The Hundredfold Roadmap. A Free Scaling Plan For Your Business.',
  description:
    'Drop your website. Get a personalized scaling roadmap: the one constraint capping your growth, a rebuilt offer with a priced stack, a money model, a lead engine with a weekly number, and twelve months in four windows with a gate on each. Free.',
  path: '/scaling-roadmap',
});

// The revalidate window only affects the featured examples strip. The tool
// itself is a client component and always runs live.
export const revalidate = 3600;

const FAQS = [
  {
    q: 'What is the Hundredfold Roadmap?',
    a: 'A free, personalized scaling plan for one specific business. You give us your website address. We read your homepage, your pricing page, your services, and your about page, work out what you actually sell and to whom, and write a roadmap: an honest read on your stage, a scale score out of 100, the single constraint capping your growth, a rebuilt offer with a priced value stack and a guarantee, a money model, a lead engine with a weekly volume number, four dated phases with a numeric gate on each, a scoreboard, and three moves for this week.',
  },
  {
    q: 'Is it really free, and do I have to give you my email?',
    a: 'It is free and no email is required to read it. The full roadmap renders on the page the moment it finishes. If you want a copy emailed to you, and a permanent link, we ask for your email then. You can also copy the share link or print the roadmap to PDF without giving us anything.',
  },
  {
    q: 'How long does it take?',
    a: 'About ninety seconds. Most of that is real work: fetching up to four pages of your site, extracting what you sell and what you charge, and writing roughly three thousand words of plan specific to you. A progress indicator shows you where it is.',
  },
  {
    q: 'What makes this different from a generic business plan template?',
    a: 'Nothing in it is a template. Every line is written against your site. It quotes your headline back to you, names your services and your towns, prices your stack in dollars, and picks one lead channel based on your actual situation rather than listing all of them. If you read a sentence that could apply to any business, we failed.',
  },
  {
    q: 'What is a constraint, and why does the roadmap only name one?',
    a: 'A constraint is the one thing that, if fixed, makes everything downstream move. Businesses are capped by one thing at a time: leads, sales, delivery, cash, the offer, or the owner. Working on anything else while the real constraint is untouched is decoration. The roadmap picks one, defends it with evidence from your site, tells you what it costs you to keep ignoring it, and gives you a first move you can make this week.',
  },
  {
    q: 'What is the scale score out of 100?',
    a: 'Five dimensions, twenty points each: offer clarity, pricing power, lead engine, conversion path, and leverage. Offer clarity asks whether a stranger can tell what you sell and why it beats the alternative. Pricing power asks whether price is visible, premium, and anchored to an outcome instead of an hour. Lead engine asks whether anything repeatably brings new people in. Conversion path asks whether there is one obvious next step and a way to catch the people who are not ready. Leverage asks whether anything keeps working while you sleep. Most businesses land between 30 and 60.',
  },
  {
    q: 'What are the five stages?',
    a: 'Seed is pre-revenue or under about $50K a year, with no repeatable offer. Sprout is roughly $50K to $250K, where one offer works but delivery is all owner. Sapling is roughly $250K to $1M, with a repeatable offer, first hires, and the owner as the bottleneck. Tree is roughly $1M to $5M, with a real team and systems, where the constraint moves to leadership and margin. Orchard is $5M and up, or any business that runs without the owner in the room.',
  },
  {
    q: 'Do I have to hire you afterward?',
    a: 'No. The roadmap is complete and yours. It tells you what to do whether or not we ever speak. It also points out where an AI teammate would remove a real cost or delay for you specifically, because that is what we build, and if you want that part done for you we are right here.',
  },
  {
    q: 'Can I share the roadmap or send it to my team?',
    a: 'Yes. Every roadmap gets a permanent link you can copy and send. It also prints cleanly to PDF from your browser.',
  },
];

const HOW_IT_WORKS = [
  {
    n: '01',
    t: 'Give us the address',
    d: 'Your website. That is the only required field. Six optional questions (revenue, team size, what you sell, what you charge, what is stuck, where you want to be) make the roadmap noticeably sharper, and take about a minute.',
  },
  {
    n: '02',
    t: 'We read the business',
    d: 'Homepage, pricing, services, about. What you sell, what you charge, who you serve, what proof you show, how someone becomes a customer, and what is missing from that path.',
  },
  {
    n: '03',
    t: 'We find the one constraint',
    d: 'Leads, sales, delivery, cash, offer, or owner. One of them is capping you right now. We name it and defend it with something we can point to on your own site.',
  },
  {
    n: '04',
    t: 'You get the plan',
    d: 'Rebuilt offer, priced stack, guarantee, money model, lead engine with a weekly number, four windows with a gate on each, a scoreboard, and three moves for this week. On screen, in your inbox, or printed.',
  },
];

const INSIDE = [
  {
    t: 'The honest read',
    d: 'Your stage on the growth ladder, a scale score out of 100, and one sentence you will either love or need to hear.',
  },
  {
    t: 'Your constraint',
    d: 'The single thing capping growth, the evidence for it, what it costs you to ignore, and the first move.',
  },
  {
    t: 'The four levers',
    d: 'Your current offer scored on dream outcome, believability, speed to result, and effort. With a specific fix on each.',
  },
  {
    t: 'The offer rebuild',
    d: 'A named offer, a priced value stack, a guarantee you could actually honor, an honest reason to buy now, and what to cut.',
  },
  {
    t: 'The money model',
    d: 'Attraction, core, continuity, upsell, downsell. Plus the cash rule and the lifetime-profit to cost-of-a-customer ratio to hold yourself to.',
  },
  {
    t: 'The lead engine',
    d: 'One channel, chosen for your situation, with a weekly volume number, a lead magnet, and hooks you can copy.',
  },
  {
    t: 'Four windows, four gates',
    d: 'Days 1-30, 31-90, 91-180, 181-365. Each with a goal, moves, a metric, and a number that must clear before you move on.',
  },
  {
    t: 'Your scoreboard',
    d: 'Six to eight numbers to put on the wall, with where you likely are and where you need to be.',
  },
];

export default async function ScalingRoadmapPage() {
  const featured = await listFeatured(3);

  return (
    <>
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            '@id': `${SITE.url}/scaling-roadmap#service`,
            name: 'The Hundredfold Roadmap',
            description:
              'A free personalized business scaling roadmap generated from your website. Names the one constraint capping growth, rebuilds the offer with a priced value stack, designs the money model and lead engine, and sequences twelve months into four phases with a numeric gate on each.',
            provider: { '@id': `${SITE.url}/#organization` },
            serviceType: 'Business scaling roadmap',
            areaServed: 'Worldwide',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          },
          serviceJsonLd({
            name: 'Business Scaling Roadmap',
            description:
              'Free AI-built scaling plan for your business: constraint, offer rebuild, money model, lead engine, and a twelve month phase plan with gates.',
          }),
          {
            // The shared howToJsonLd helper is playbook-shaped (slug + dates, no
            // steps), so the stepped version is written out here.
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            '@id': `${SITE.url}/scaling-roadmap#howto`,
            name: 'How to get your scaling roadmap',
            description: 'Four steps from a website address to a personalized twelve month scaling plan.',
            totalTime: 'PT2M',
            supply: { '@type': 'HowToSupply', name: 'Your website address' },
            step: HOW_IT_WORKS.map((s, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: s.t,
              text: s.d,
              url: `${SITE.url}/scaling-roadmap#step-${i + 1}`,
            })),
            inLanguage: 'en-US',
          },
          faqJsonLd(FAQS),
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Scaling Roadmap', url: '/scaling-roadmap' },
          ]),
        ]}
      />

      <article className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative">
          {/* Hero */}
          <header className="max-w-4xl mx-auto px-6 md:px-8 text-center mb-14">
            <span className="text-[10px] uppercase tracking-[0.45em] text-[#C4160B] font-mono font-bold mb-7 block">
              The Hundredfold Roadmap
            </span>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[1.02] mb-7">
              The plan to scale{' '}
              <span className="text-[#F5B700] italic" style={{ WebkitTextStroke: '2px #161616' }}>
                your business
              </span>
            </h1>
            <p className="font-display italic font-bold text-2xl md:text-3xl text-[#161616] leading-snug mb-5">
              Built from your website. In ninety seconds.
            </p>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto">
              Not a template, not a checklist, not a webinar. A real roadmap for your business: the one
              thing capping your growth, the offer to sell instead, what to charge, where the next
              hundred customers come from, and what has to be true before you are allowed to move on.
            </p>
          </header>

          {/* The tool */}
          <section className="max-w-5xl mx-auto px-6 md:px-8 mb-24">
            <ScalingRoadmapEngine />
          </section>

          {/* What is inside */}
          <section className="max-w-5xl mx-auto px-6 md:px-8 mb-24">
            <div className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.45em] text-[#C4160B] font-mono font-bold mb-5 block">
                What is inside
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                Eight sections,{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  no filler
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {INSIDE.map((c) => (
                <div key={c.t} className="pop-card p-7">
                  <h3 className="font-display text-xl text-[#161616] font-black tracking-tight mb-2">{c.t}</h3>
                  <p className="text-[#3a3733] text-sm font-body leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Worked examples */}
          {featured.length > 0 && (
            <section className="max-w-5xl mx-auto px-6 md:px-8 mb-24">
              <div className="text-center mb-10">
                <span className="text-[10px] uppercase tracking-[0.45em] text-[#C4160B] font-mono font-bold mb-5 block">
                  See a real one
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-3">
                  We ran it on{' '}
                  <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                    ourselves
                  </span>{' '}
                  first
                </h2>
                <p className="text-[#3a3733] text-base font-body leading-relaxed max-w-2xl mx-auto">
                  Every word of these is the real output, unedited, including the parts that sting.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {featured.map((r) => (
                  <Link
                    key={r.id}
                    href={`/scaling-roadmap/r/${r.slug}`}
                    className="pop-card p-7 hover:-translate-y-1 transition-transform block"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-[#161616]/50 truncate">
                        {r.host}
                      </span>
                      <span className="font-display text-2xl font-black text-[#161616] shrink-0">
                        {r.scale_score}
                      </span>
                    </div>
                    <h3 className="font-display text-lg text-[#161616] font-black tracking-tight leading-snug mb-3">
                      {r.business_name}
                    </h3>
                    <p className="text-[#3a3733] text-sm font-body italic leading-relaxed">
                      &ldquo;{r.headline}&rdquo;
                    </p>
                    <span className="mt-5 block text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1E50C8]">
                      Read the roadmap &rarr;
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* How it works */}
          <section className="max-w-5xl mx-auto px-6 md:px-8 mb-24">
            <div className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.45em] text-[#C4160B] font-mono font-bold mb-5 block">
                How it works
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                Four steps
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HOW_IT_WORKS.map((s, i) => (
                <div key={s.n} id={`step-${i + 1}`} className="pop-card p-7 flex gap-5 scroll-mt-28">
                  <span
                    className="font-display text-4xl font-black leading-none shrink-0"
                    style={{ color: '#F5B700', WebkitTextStroke: '1.5px #161616' }}
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-display text-xl text-[#161616] font-black tracking-tight mb-2">{s.t}</h3>
                    <p className="text-[#3a3733] text-sm font-body leading-relaxed">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* The offer to build it with them */}
          <section className="max-w-4xl mx-auto px-6 md:px-8 mb-24">
            <div className="pop-card-yellow p-8 md:p-12">
              <span className="text-[10px] uppercase tracking-[0.45em] text-[#161616] font-mono font-bold mb-5 block">
                After the roadmap
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-4">
                Want help{' '}
                <span className="text-white" style={{ WebkitTextStroke: '2px #161616' }}>
                  running it
                </span>
                ?
              </h2>
              <p className="text-[#161616]/80 text-base md:text-lg font-body font-medium leading-relaxed mb-7">
                The roadmap is yours either way. But most of phase one is work a machine should be doing:
                answering the phone, following up, keeping the pipeline warm, making the pictures, getting
                found. That is the whole job here. Bring the roadmap to a free call and we will tell you
                which parts we would take off your plate first.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="px-7 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-white bg-[#161616] rounded-xl border-2 border-[#161616] hover:-translate-y-0.5 transition-all"
                >
                  Book a free call
                </Link>
                <Link
                  href="/demos"
                  className="px-7 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-white rounded-xl border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  See the free demos
                </Link>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto px-6 md:px-8">
            <div className="text-center mb-10">
              <span className="text-[10px] uppercase tracking-[0.45em] text-[#C4160B] font-mono font-bold mb-5 block">
                Questions
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight">
                Before you run it
              </h2>
            </div>
            <div className="space-y-4">
              {FAQS.map((f) => (
                <details key={f.q} className="pop-card p-6 group">
                  <summary className="font-display text-lg md:text-xl text-[#161616] font-black tracking-tight cursor-pointer list-none flex items-start justify-between gap-4">
                    {f.q}
                    <span className="text-[#F5B700] font-mono text-xl leading-none shrink-0 group-open:rotate-45 transition-transform" style={{ WebkitTextStroke: '1px #161616' }}>
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[#3a3733] text-sm md:text-base font-body leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
