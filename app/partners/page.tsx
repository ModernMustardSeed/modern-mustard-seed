import Image from 'next/image';
import PartnersApply from '@/components/partners/PartnersApply';
import PartnerEarningsCalculator from '@/components/partners/PartnerEarningsCalculator';
import { buildMetadata } from '@/lib/seo';
import { partnerMath } from '@/lib/partner-desk/letters';

const m = partnerMath();
const $ = m.dollars;

export const metadata = buildMetadata({
  title: `Partner Program. Earn ${m.pct}% of every monthly invoice, for a year, on every business you refer`,
  description: `The Modern Mustard Seed partner, ambassador and referral program. Send us a business, we build them a free demo, and if they keep it you earn ${m.pct}% of every monthly invoice for ${m.months} months: ${$(m.talkingWebsite.year)} per Talking Website. Plus ${m.buildPct}% to ${m.producerPct}% on custom builds and ${m.productPct}% on every playbook. Free access, your own link, a field guide. Apply today.`,
  path: '/partners',
});

const LADDER = [
  {
    rung: '01',
    rate: `${m.pct}%`,
    accent: '#F5B700',
    label: `Every month, for ${m.months} months`,
    detail: `Send a business. If they keep the ${m.talkingWebsite.name} you earn ${$(m.talkingWebsite.perMonth)} a month, ${$(m.talkingWebsite.year)} over the year, per business. A ${m.voice.name} alone pays ${$(m.voice.perMonth)} a month. Ten kept Talking Websites is ${$(m.tenTalkingWebsites.perMonth)} a month to you.`,
    tag: 'The part that compounds',
  },
  {
    rung: '02',
    rate: `${m.buildPct} to ${m.producerPct}%`,
    accent: '#E0301E',
    label: 'On custom builds',
    detail: `Send a business that needs a real build (a store, an app, an agentic system) and earn ${m.buildPct}% of the project. Once you are closing them regularly we move you to Producer rates, ${m.producerPct}%.`,
    tag: 'The biggest checks',
  },
  {
    rung: '03',
    rate: `${m.productPct}%`,
    accent: '#1E50C8',
    label: 'On every playbook',
    detail: `Share a playbook or bundle and earn half the moment someone buys. Every one of them is yours free, so you only ever recommend what you have used.`,
    tag: 'The easy front door',
  },
];

const KINDS = [
  {
    t: 'Creators',
    d: 'Your audience runs a business: contractors, salon owners, restaurant people, real estate agents, side-hustlers going full time. One video about the site that answers its own phone, with your link under it, keeps paying for a year.',
  },
  {
    t: 'Referral pros',
    d: 'Bookkeepers, insurance agents, commercial realtors, sign shops, printers, coaches. You meet a new owner every week, and the first two things they ask for are a website and a way to stop missing calls. Send the name. We do the rest.',
  },
  {
    t: 'Communities',
    d: 'Chambers, networking circles, church business ministries, group admins. One link for your members, a free demo for any who ask, and the commission paid to the organisation on every member who keeps their site.',
  },
];

const STEPS = [
  { n: '1', t: 'Apply', d: 'Sarah reads every application. Approved partners get their link, their dashboard, free access to everything, and a field guide the same day.' },
  { n: '2', t: 'Send a business name', d: 'That is the whole job. A name and a town. You never pitch, quote, or close.' },
  { n: '3', t: 'We build their demo, free', d: 'Their own site and a voice agent they can call, built to their trade, before anyone pays a cent. They see it on your link.' },
  { n: '4', t: 'They keep it, you get paid', d: `${m.pct}% of every monthly invoice for ${m.months} months, on a ledger you can see, paid out on a schedule you set.` },
];

const DAY_ONE = [
  { t: 'Free access to everything', d: 'Every playbook and program is yours, free, so you only ever recommend what you have actually used.' },
  { t: 'Your own tracked link', d: 'A personal link that follows your people for 60 days and ties every demo, subscription and build back to you.' },
  { t: 'A field guide, not just a link', d: 'Scripts for comments, DMs, posts and a phone call, pre-filled with your link. Copy, reword, send.' },
  { t: 'A dashboard with real numbers', d: 'Clicks, demos built, businesses kept, what is pending and what is paid. No cap on any of it.' },
];

export default function PartnersPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      {/* Hero */}
      <section className="relative px-6 pt-36 pb-16 overflow-hidden halftone-bg">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-6">The Partner Program</span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-[#161616]">
            Send us a business.<br className="hidden sm:block" /> Get paid for a year.
          </h1>
          <p className="mt-7 text-[#3A3733] text-lg font-body font-light max-w-2xl mx-auto leading-relaxed">
            You introduce. We build them a free demo: their own site and a voice agent built to their trade. If they keep it, you earn {m.pct}% of every monthly invoice for {m.months} months. That is {$(m.talkingWebsite.year)} per Talking Website. No selling, no quota, no cap.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#apply" className="inline-block px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all">
              Apply to partner
            </a>
            <a href="#math" className="text-[12px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/70 hover:text-[#161616] transition-colors underline underline-offset-4 decoration-[#F5B700] decoration-2">
              Run your numbers
            </a>
          </div>
        </div>

        {/* The partner-recruiting spot, framed. */}
        <div className="relative z-10 max-w-4xl mx-auto mt-14">
          <div className="rounded-3xl overflow-hidden border-[3px] border-[#161616] bg-[#161616] shadow-[10px_10px_0_0_#161616]">
            <video
              className="w-full aspect-video object-cover block"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/ads/partner-yacht-poster.png"
              aria-hidden="true"
              style={{ backgroundColor: '#161616' }}
            >
              <source src="/ads/partner-yacht-16x9.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* The ladder */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Three ways to earn, one honest program</span>
          <h2 className="font-display text-4xl font-semibold text-[#161616]">The recurring piece is the whole point.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {LADDER.map((r) => (
            <div key={r.rung} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-xs font-bold text-[#161616]/40 tracking-[0.2em]">{r.rung}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold px-2.5 py-1 rounded-full border-2 border-[#161616]" style={{ background: r.accent, color: r.accent === '#F5B700' ? '#161616' : '#FBF6EA' }}>{r.tag}</span>
              </div>
              <div className="font-display text-5xl sm:text-6xl font-bold text-[#161616] leading-none mb-1">{r.rate}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#161616]/60 font-mono font-bold mb-4">{r.label}</div>
              <p className="text-[#3A3733] font-body text-sm leading-relaxed">{r.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who this is for */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Who this is for</span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#161616]">Anyone a business owner already trusts.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {KINDS.map((k) => (
            <div key={k.t} className="bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-2xl p-7">
              <h3 className="font-display text-2xl font-semibold mb-3 text-[#F5B700]">{k.t}</h3>
              <p className="font-body text-sm leading-relaxed text-[#FBF6EA]/85">{k.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#161616] p-8 md:p-12">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">How it works</span>
          <h2 className="font-display text-3xl font-semibold text-[#161616] mb-8">Four steps, and you only do one of them.</h2>
          <ol className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-[#F5B700] border-2 border-[#161616] font-display font-bold text-lg">{s.n}</span>
                <div>
                  <h3 className="font-sans font-bold text-[#161616] mb-1 text-[15px]">{s.t}</h3>
                  <p className="text-[#3A3733] font-body text-sm leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Signature moment: earnings calculator */}
      <section id="math" className="max-w-5xl mx-auto px-6 pb-16 scroll-mt-24">
        <PartnerEarningsCalculator
          pct={m.pct}
          months={m.months}
          talkingWebsiteCents={m.talkingWebsite.perMonth}
          voiceCents={m.voice.perMonth}
          buildPct={m.buildPct}
          productPct={m.productPct}
        />
      </section>

      {/* What you get day one */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#161616] p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="shrink-0 mx-auto md:mx-0">
              <Image src="/brand/mascot.png" alt="The Modern Mustard Seed mascot" width={885} height={1180} className="h-40 w-auto" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">What you get on day one</span>
              <h2 className="font-display text-3xl font-semibold text-[#161616] mb-6">A whole field guide, not just a link</h2>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                {DAY_ONE.map((x) => (
                  <div key={x.t} className="flex gap-3">
                    <span className="text-[#F5B700] text-lg leading-none mt-0.5">●</span>
                    <div>
                      <h3 className="font-sans font-bold text-[#161616] mb-1 text-[15px]">{x.t}</h3>
                      <p className="text-[#3A3733] font-body text-sm leading-relaxed">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The real why */}
      <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <h2 className="font-display text-3xl font-semibold text-[#161616] mb-4">The real why</h2>
        <p className="text-[#3A3733] font-body leading-relaxed text-lg">
          Every business we build for gets a site they own and a phone that gets answered, at a set price, with every edit included forever. The people who send them to us should be paid the same way we price: one structure for everyone, written down, no fine print. You tell people the truth, including that you earn a commission, and everyone wins.
        </p>
      </section>

      {/* Apply */}
      <section id="apply" className="px-6 py-16 scroll-mt-20 halftone-bg">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Apply</span>
          <h2 className="font-display text-4xl font-semibold text-[#161616]">Tell us a little about you</h2>
          <p className="text-[#3A3733] font-body mt-3 max-w-xl mx-auto">Sarah reviews every application personally. Approved partners get their link, free access, and the field guide the same day.</p>
        </div>
        <PartnersApply />
      </section>
    </div>
  );
}
