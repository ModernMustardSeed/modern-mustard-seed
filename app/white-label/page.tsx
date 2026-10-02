import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import { partnerMath } from '@/lib/partner-desk/letters';
import { WL_PROGRAM, WL_GROUPS, WL_TERMS, WL_KIT, WL_FAQ, WL_SAMPLE_CLIENTS, wlPublicLines } from '@/data/white-label';

export const metadata = buildMetadata({
  title: WL_PROGRAM.metaTitle,
  description: WL_PROGRAM.metaDescription,
  path: WL_PROGRAM.path,
});

const ART_ALT =
  'Painting: at a lantern-lit beachside dinner, Mr. Mustard shows friends a tablet of website layouts while Mrs. Mustard raises a glass, the kids wave sparklers and a lit-up yacht sits on the water behind';

const WAYS = [
  {
    tag: 'For your clients',
    title: 'AI you sell as yours.',
    line: 'Receptionists, custom agents, agentic dashboards and AI built into the sites you design. Your name on it, your price, your client.',
    items: ['AI receptionist and website agent', 'Custom agents with a real job', 'Agentic dashboards that act, not just report', 'AI built into the site you designed'],
  },
  {
    tag: 'When you are full',
    title: 'Your overflow, handled.',
    line: 'Send us the build you do not have room for. We make it to your design file and your standards, and you deliver it as yours.',
    items: ['Websites, five pages to fifty', 'Integrations and web apps', 'Dashboards and internal tools', 'Or keep a builder on call with The Agentic Bench'],
  },
  {
    tag: 'Inside your agency',
    title: 'AI in how you run.',
    line: 'Proposals drafted from the discovery call, client reports that write themselves, onboarding that runs on its own. Your studio, automated.',
    items: ['Proposals and reporting as agents', 'Client onboarding automated', 'Claude set up for your team', 'An engineering bench on subscription'],
  },
];

const WHO = ['Web designers', 'Marketing agencies', 'Brand and creative studios', 'IT and consultants'];

const STEPS = [
  { n: '01', title: 'Apply', when: 'Two minutes', body: 'Your demo, already wearing your agency’s name, lands in your inbox the moment you press apply.' },
  { n: '02', title: 'Get your portal', when: 'Within one business day', body: 'Sarah approves you and sends your portal, your signed price sheet and your demo with your margin in it.' },
  { n: '03', title: 'Sell it', when: 'Your meeting', body: 'Paste a prospect’s own website into the demo and hand them the call. Your portal makes a link you can send them after.' },
  { n: '04', title: 'Add the client', when: 'When they say yes', body: 'One form in your portal: what they do, how they book, what to switch on. We start within one business day.' },
  { n: '05', title: 'Test it', when: 'Inside seven days', body: 'You get a test number. Call it like a customer, then press Approve. Nothing is billed before you do.' },
  { n: '06', title: 'Go live, get paid', when: 'Every month after', body: 'It switches onto their real number. You bill your price. One invoice from us covers every live client.' },
];

const STATS = [
  { n: '$0', label: 'License fee' },
  { n: '0', label: 'Minimums' },
  { n: '7 days', label: 'Receptionist, sold to live' },
  { n: '1', label: 'Invoice a month' },
  { n: '100%', label: 'Your name' },
];

const partner = partnerMath();

export default function WhiteLabelPage() {
  const lines = wlPublicLines();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: `${WL_PROGRAM.name} by Modern Mustard Seed`,
        serviceType: 'White label AI agents, agentic dashboards, AI website integration, automation and overflow engineering for agencies',
        description: WL_PROGRAM.metaDescription,
        provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        areaServed: { '@type': 'Country', name: 'United States' },
        audience: { '@type': 'BusinessAudience', audienceType: 'Web design and marketing agencies' },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'White label services',
          itemListElement: lines.map((l) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: l.name, description: l.pitch },
            url: `${SITE.url}/white-label#services`,
          })),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: WL_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#fbf5ea] text-[#0b3b44]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PopPageHero
        eyebrow={<span>Agentic partner // For agencies</span>}
        title={<>Your agency’s agentic partner. <em>Your name on all of it.</em></>}
        art={{ src: '/art/riviera/work', alt: ART_ALT, caption: 'Your clients, your table' }}
        sticker="Your engineers"
      >
        <p>{WL_PROGRAM.promise}</p>
        <div className={pop.actions}>
          <a href="#demo" className={pop.cta}>Try the demo in your name</a>
          <Link href="/white-label/apply" className={pop.ctaAlt}>Apply now</Link>
        </div>
        <p className={pop.note}>Built and run by Sarah Scarano at Modern Mustard Seed. Your clients never see our name.</p>
      </PopPageHero>

      {/* ─── THE TERMS IN FIVE NUMBERS ─── */}
      <section className="bg-[#0b3b44]" aria-label="The program in numbers">
        <div className="max-w-5xl mx-auto px-5 py-8 md:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-7">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl md:text-4xl font-black text-[#f5b700] tracking-tight leading-none">{s.n}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fbf5ea]/70 mt-2 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THREE WAYS WE WORK WITH YOU ─── */}
      <section className="py-16 md:py-24" aria-labelledby="ways-heading">
        <div className="max-w-6xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ Your agentic partner ]</p>
          <h2 id="ways-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05] max-w-4xl">
            The engineering team behind your agency. <em className="italic">Without hiring one.</em>
          </h2>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-5 max-w-2xl">
            Your clients are asking about AI, and hiring an AI engineer costs more than most agencies clear in a quarter. We are that engineer, already building agents, dashboards and automations for real businesses, working behind your name.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {WAYS.map((w, i) => (
              <div key={w.tag} className={`flex flex-col rounded-2xl border-2 border-[#0b3b44] p-7 ${i === 0 ? 'bg-[#0b3b44] text-[#fbf5ea] shadow-[8px_8px_0_0_#f5b700]' : 'bg-white shadow-[6px_6px_0_0_#0b3b44]'}`}>
                <p className={`font-mono text-[10px] uppercase tracking-[0.24em] font-bold ${i === 0 ? 'text-[#81d8d0]' : 'text-[#0a7c78]'}`}>{w.tag}</p>
                <h3 className="font-display text-2xl font-black mt-2">{w.title}</h3>
                <p className={`font-body text-[15px] leading-relaxed mt-3 ${i === 0 ? 'text-[#fbf5ea]/85' : 'text-[#0b3b44]/75'}`}>{w.line}</p>
                <ul className="mt-5 space-y-2 flex-1">
                  {w.items.map((x) => (
                    <li key={x} className={`flex gap-2.5 font-body text-[14.5px] leading-snug ${i === 0 ? 'text-[#fbf5ea]/90' : 'text-[#0b3b44]/85'}`}>
                      <span aria-hidden="true" className="text-[#f5b700] font-black">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="font-body text-sm text-[#0b3b44]/65 mt-8">Built for {WHO.join(', ').replace(/, ([^,]*)$/, ' and $1')} who already have clients.</p>
        </div>
      </section>

      {/* ─── THE LIVE DEMO ─── */}
      <section id="demo" className="py-16 md:py-20 bg-[#0b3b44] text-[#fbf5ea] scroll-mt-24" aria-labelledby="demo-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-14 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#81d8d0] font-bold mb-3">[ The live demo ]</p>
            <h2 id="demo-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
              Type your agency’s name. <em className="italic text-[#f5b700]">Watch it become yours.</em>
            </h2>
            <p className="font-body text-[#fbf5ea]/80 leading-relaxed mt-5">
              The demo opens a page in your name and color, for a client like yours, with a working AI receptionist on it. Call it, book an appointment, read the transcript as it happens. Then show it to a client.
            </p>
          </div>
          <form action="/white-label/demo" method="get" className="bg-[#fbf5ea] text-[#0b3b44] rounded-2xl border-2 border-[#fbf5ea] p-6 shadow-[8px_8px_0_0_#f5b700]">
            <label className="block">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a] mb-2">Your agency</span>
              <input name="agency" required maxLength={60} placeholder="Your agency name" className="w-full rounded-lg border-2 border-[#0b3b44] bg-white px-4 py-3 font-body text-[15px] outline-none focus:shadow-[3px_3px_0_0_#f5b700]" />
            </label>
            <label className="block mt-4">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a] mb-2">A client like yours</span>
              <select name="sample" className="w-full rounded-lg border-2 border-[#0b3b44] bg-white px-4 py-3 font-body text-[15px] outline-none">
                {WL_SAMPLE_CLIENTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="block mt-4">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#5c554a] mb-2">Your town</span>
              <input name="city" maxLength={60} placeholder="Kalispell" className="w-full rounded-lg border-2 border-[#0b3b44] bg-white px-4 py-3 font-body text-[15px] outline-none focus:shadow-[3px_3px_0_0_#f5b700]" />
            </label>
            <button type="submit" className="mt-6 w-full inline-flex items-center justify-center rounded-full bg-[#f5b700] border-2 border-[#0b3b44] px-6 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#0b3b44]">
              Open my demo
            </button>
            <p className="font-body text-xs text-[#0b3b44]/60 mt-3">Free. No email needed. The call uses your microphone.</p>
          </form>
        </div>
      </section>

      {/* ─── WHAT YOU CAN SELL ─── */}
      <section id="services" className="py-16 md:py-24 scroll-mt-24" aria-labelledby="services-heading">
        <div className="max-w-6xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ What you can sell ]</p>
          <h2 id="services-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">Every package, <em className="italic">set price, your name.</em></h2>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4 max-w-2xl">AI that answers, websites when you are full, and the agentic systems, dashboards and studios your clients cannot get anywhere else. Wholesale prices arrive on your own price sheet, signed for your agency.</p>
          {WL_GROUPS.map((g) => {
            const shelf = lines.filter((l) => l.group === g.key);
            return (
              <div key={g.key} className="mt-12">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-[#0b3b44] pb-3">
                  <h3 className="font-display text-2xl md:text-3xl font-black">{g.title}</h3>
                  <p className="font-body text-sm text-[#0b3b44]/70 max-w-md">{g.blurb}</p>
                </div>
                <div className={`grid md:grid-cols-2 ${shelf.length === 4 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-5 mt-6`}>
                  {shelf.map((l) => (
                    <div key={l.slug} className="flex flex-col bg-white border-2 border-[#0b3b44] rounded-2xl p-6 shadow-[5px_5px_0_0_#0b3b44]">
                      <h4 className="font-display text-xl font-black">{l.name}</h4>
                      <p className="font-body text-[15px] text-[#0b3b44]/75 leading-relaxed mt-2">{l.pitch}</p>
                      <ul className="mt-4 space-y-2 flex-1">
                        {l.includes.map((x) => (
                          <li key={x} className="flex gap-2.5 font-body text-[14px] leading-snug text-[#0b3b44]/85">
                            <span aria-hidden="true" className="text-[#f5b700] font-black">✓</span>
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-16 md:py-20 bg-[#d8f3f0] border-y-2 border-[#0b3b44]" aria-labelledby="how-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ How it works ]</p>
          <h2 id="how-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">From apply to paid, every step written down.</h2>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4 max-w-2xl">Every step sends the next email on its own, and your portal always shows where each client stands.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-[#fbf5ea] border-2 border-[#0b3b44] rounded-2xl p-6">
                <p className="font-display text-3xl font-black text-[#f5b700] [-webkit-text-stroke:1px_#0b3b44]">{s.n}</p>
                <h3 className="font-display text-lg font-black mt-2">{s.title}</h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0a7c78] font-bold mt-1">{s.when}</p>
                <p className="font-body text-[14.5px] text-[#0b3b44]/75 leading-relaxed mt-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE TERMS ─── */}
      <section className="py-16 md:py-24" aria-labelledby="terms-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ The terms ]</p>
          <h2 id="terms-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">Written down. <em className="italic">No fine print.</em></h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8 mt-10">
            {WL_TERMS.map((t) => (
              <div key={t.title} className="border-t-4 border-[#f5b700] pt-4">
                <h3 className="font-display text-lg font-black">{t.title}</h3>
                <p className="font-body text-[15px] text-[#0b3b44]/75 leading-relaxed mt-2">{t.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl border-2 border-[#0b3b44] bg-white p-6 md:p-8 shadow-[6px_6px_0_0_#f5b700]">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#0a7c78] font-bold">The day you join</p>
            <div className="grid sm:grid-cols-2 gap-6 mt-4">
              {WL_KIT.map((k) => (
                <div key={k.title}>
                  <h3 className="font-display text-lg font-black">{k.title}</h3>
                  <p className="font-body text-[14.5px] text-[#0b3b44]/75 leading-relaxed mt-1.5">{k.body}</p>
                </div>
              ))}
            </div>
            <p className="font-body text-sm text-[#0b3b44]/70 mt-6">
              <strong>Founding agencies.</strong> The first {WL_PROGRAM.foundingAgencies} agencies keep their wholesale prices locked for {WL_PROGRAM.foundingMonths} months.
            </p>
          </div>
        </div>
      </section>

      {/* ─── REFER OR RESELL ─── */}
      <section className="py-16 md:py-20 bg-[#0b3b44] text-[#fbf5ea]" aria-labelledby="which-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#81d8d0] font-bold mb-3">[ Refer or resell ]</p>
          <h2 id="which-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">Two ways to work with us. <em className="italic text-[#f5b700]">Pick the one that fits.</em></h2>
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            <div className="rounded-2xl border-2 border-[#f5b700] bg-[#fbf5ea] text-[#0b3b44] p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#0a7c78]">White Label · this page</p>
              <h3 className="font-display text-2xl font-black mt-2">You sell it as yours.</h3>
              <ul className="mt-4 space-y-2 font-body text-[15px]">
                {['Your name on everything, ours nowhere', 'You set the price and bill the client', 'You keep the margin, every month', 'For agencies with clients already'].map((x) => (
                  <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-[#0a7c78] font-black">✓</span>{x}</li>
                ))}
              </ul>
              <Link href="/white-label/apply" className="mt-6 inline-flex rounded-full bg-[#0b3b44] text-[#fbf5ea] px-6 py-3 font-sans font-extrabold text-xs uppercase tracking-[0.18em]">Apply to resell</Link>
            </div>
            <div className="rounded-2xl border-2 border-[#fbf5ea]/30 p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#81d8d0]">Partner Program</p>
              <h3 className="font-display text-2xl font-black mt-2">You send them to us.</h3>
              <ul className="mt-4 space-y-2 font-body text-[15px] text-[#fbf5ea]/85">
                {['We sell, build and bill, under our name', `You earn ${partner.pct}% of every invoice for ${partner.months} months`, 'Nothing to manage after the introduction', 'For anyone who knows business owners'].map((x) => (
                  <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-[#f5b700] font-black">✓</span>{x}</li>
                ))}
              </ul>
              <Link href="/partners" className="mt-6 inline-flex rounded-full border-2 border-[#fbf5ea] px-6 py-3 font-sans font-extrabold text-xs uppercase tracking-[0.18em]">See the Partner Program</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── QUESTIONS ─── */}
      <section className="py-16 md:py-20 border-t-2 border-[#0b3b44]" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ Straight answers ]</p>
          <h2 id="faq-heading" className="font-display text-3xl md:text-4xl font-black tracking-tight">White label, answered.</h2>
          <div className="mt-8 divide-y-2 divide-[#0b3b44]/10 border-y-2 border-[#0b3b44]/10">
            {WL_FAQ.map((f) => (
              <details key={f.q} className="py-5 group">
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="text-[#0a7c78] group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                </summary>
                <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/white-label/apply" className="inline-flex items-center justify-center rounded-full bg-[#f5b700] border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#0b3b44]">Apply now</Link>
            <Link href="/white-label/demo" className="inline-flex items-center justify-center rounded-full bg-white border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em]">Open the demo</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
