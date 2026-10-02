import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';
import { WL_PROGRAM, WL_TERMS, WL_KIT, WL_FAQ, WL_SAMPLE_CLIENTS, wlPublicLines } from '@/data/white-label';

export const metadata = buildMetadata({
  title: WL_PROGRAM.metaTitle,
  description: WL_PROGRAM.metaDescription,
  path: WL_PROGRAM.path,
});

const ART_ALT =
  'Painting: at a lantern-lit beachside dinner, Mr. Mustard shows friends a tablet of website layouts while Mrs. Mustard raises a glass, the kids wave sparklers and a lit-up yacht sits on the water behind';

const FOR = [
  { who: 'Web designers', line: 'Your clients already ask what you can do with AI. Now the answer is a working receptionist on the site you built.' },
  { who: 'Marketing agencies', line: 'You fill the phone with leads. The receptionist makes sure every one of them gets answered and booked.' },
  { who: 'Brand and creative studios', line: 'Add a monthly line to every launch without hiring an engineer or learning a voice platform.' },
  { who: 'IT and consultants', line: 'You are already the person they trust with technology. Put agents in front of them with your name on it.' },
];

const STEPS = [
  { n: '01', title: 'You sell it', body: 'Pitch with the live demo in your name. Set your price. Send us what the client does, their hours and how they book.' },
  { n: '02', title: 'We build it', body: 'The agent is trained, tested and on a number inside seven days. It speaks as your client’s business.' },
  { n: '03', title: 'You approve it', body: 'You call it, poke at it and sign off before your client ever hears it.' },
  { n: '04', title: 'You bill, we run it', body: 'You invoice your client. We send you one invoice a month for every client, and keep everything running.' },
];

const STATS = [
  { n: '$0', label: 'License fee' },
  { n: '0', label: 'Minimums' },
  { n: '7 days', label: 'Sold to live' },
  { n: '1', label: 'Invoice a month' },
  { n: '100%', label: 'Your name' },
];

export default function WhiteLabelPage() {
  const lines = wlPublicLines();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: `${WL_PROGRAM.name} by Modern Mustard Seed`,
        serviceType: 'White label AI voice agents, website agents and automations for agencies',
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
        eyebrow={<span>White label // For agencies</span>}
        title={<>Sell AI under your name. <em>We build it.</em></>}
        art={{ src: '/art/riviera/work', alt: ART_ALT, caption: 'Your clients, your table' }}
        sticker="Your brand"
      >
        <p>{WL_PROGRAM.promise}</p>
        <div className={pop.actions}>
          <a href="#demo" className={pop.cta}>Try the demo in your name</a>
          <Link href="/inquire?kind=white-label" className={pop.ctaAlt}>Ask for your price sheet</Link>
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

      {/* ─── WHO IT IS FOR ─── */}
      <section className="py-16 md:py-24" aria-labelledby="for-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ Who it is for ]</p>
          <h2 id="for-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
            You have the clients. <em className="italic">They are asking about AI.</em>
          </h2>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-5 max-w-2xl">
            Hiring an AI engineer to answer that question costs more than most agencies clear in a quarter. This program is the engineer, already trained, already running agents for real businesses, working behind your name.
          </p>
          <div className="grid sm:grid-cols-2 gap-5 mt-10">
            {FOR.map((f) => (
              <div key={f.who} className="border-2 border-[#0b3b44] rounded-2xl bg-white p-6">
                <h3 className="font-display text-xl font-black">{f.who}</h3>
                <p className="font-body text-[15px] text-[#0b3b44]/75 leading-relaxed mt-2">{f.line}</p>
              </div>
            ))}
          </div>
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
          <h2 id="services-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">Seven services. Your name on every one.</h2>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4 max-w-2xl">Four run monthly, so every client you sell adds to what you earn next month. Three are one-time projects. Wholesale prices arrive on your own price sheet, signed for your agency.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {lines.map((l) => (
              <div key={l.slug} className="flex flex-col bg-white border-2 border-[#0b3b44] rounded-2xl p-6 shadow-[5px_5px_0_0_#0b3b44]">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#0a7c78]">{l.cadence === 'monthly' ? 'Monthly, per client' : 'Project, per client'}</p>
                <h3 className="font-display text-xl font-black mt-2">{l.name}</h3>
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
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-16 md:py-20 bg-[#d8f3f0] border-y-2 border-[#0b3b44]" aria-labelledby="how-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ How it works ]</p>
          <h2 id="how-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">Sold on Monday. Answering by next Monday.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-[#fbf5ea] border-2 border-[#0b3b44] rounded-2xl p-6">
                <p className="font-display text-3xl font-black text-[#f5b700] [-webkit-text-stroke:1px_#0b3b44]">{s.n}</p>
                <h3 className="font-display text-lg font-black mt-2">{s.title}</h3>
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
            <Link href="/inquire?kind=white-label" className="inline-flex items-center justify-center rounded-full bg-[#f5b700] border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#0b3b44]">Ask for your price sheet</Link>
            <Link href="/white-label/demo" className="inline-flex items-center justify-center rounded-full bg-white border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em]">Open the demo</Link>
          </div>
          <p className="font-body text-sm text-[#0b3b44]/60 mt-8">
            Referring instead of reselling? The <Link href="/partners" className="underline">Partner Program</Link> pays a commission on every business you send us.
          </p>
        </div>
      </section>
    </div>
  );
}
