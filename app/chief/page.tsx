import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import {
  CHIEF,
  chiefTiers,
  chiefUsd,
  chiefCapabilities,
  chiefBoundaries,
  chiefFaq,
  humanAssistantYear,
} from '@/data/chief';
import DayWithYourChief from '@/components/chief/DayWithYourChief';
import ChiefCheckoutButton from '@/components/chief/ChiefCheckoutButton';

export const metadata = buildMetadata({
  title: CHIEF.metaTitle,
  description: CHIEF.metaDescription,
  path: '/chief',
});

const PHONE_TEL = '+14063121223';
const PHONE_DISPLAY = '(406) 312-1223';

const entry = chiefTiers[0];
const cabinet = chiefTiers[chiefTiers.length - 1];
const chiefYear = chiefUsd(entry.monthlyCents) * 12;

function chiefJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Chief, a personal AI chief of staff by Modern Mustard Seed',
        serviceType: 'Personal AI assistant and chief of staff (voice, text, and chat; calendar, email, calls, research, sales coaching, lead generation)',
        description:
          'A proactive AI chief of staff you call, text, or type to any hour. Trained on your business and your life, he runs your calendar, drafts and sends email, makes calls and books things, researches anything, runs sales role-play, builds your lead list, and delivers a morning briefing with scripture. Command center included.',
        provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        areaServed: 'US',
        url: `${SITE.url}/chief`,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: chiefUsd(entry.monthlyCents),
          highPrice: chiefUsd(cabinet.monthlyCents),
          offerCount: chiefTiers.length,
          availability: 'https://schema.org/InStock',
          url: `${SITE.url}/chief`,
        },
      },
      faqJsonLd(chiefFaq as unknown as { q: string; a: string }[]),
      breadcrumbJsonLd([
        { name: 'Modern Mustard Seed', url: SITE.url },
        { name: 'The Chief', url: `${SITE.url}/chief` },
      ]),
    ],
  };
}

export default function ChiefPage() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <JsonLd data={chiefJsonLd()} />

      {/* ── Hero ── */}
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-6xl mx-auto px-6 pt-32 pb-16 md:pt-40 lg:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#C4160B] font-bold">
                A new flagship // Not a receptionist. Your right hand.
              </span>
              <h1 className="font-display text-[2.7rem] sm:text-6xl xl:text-[4.2rem] font-bold mt-4 leading-[0.98] tracking-tight">
                Your chief of staff, <em className="italic text-[#C4160B]">on call day and night.</em>
              </h1>
              <p className="font-body text-[17px] text-[#161616]/75 mt-5 leading-relaxed max-w-xl">
                {CHIEF.promise}
              </p>
              <div className="mt-7 rounded-xl border-2 border-[#161616] bg-white shadow-[5px_5px_0_0_#F5B700] px-5 py-4 max-w-xl">
                <p className="font-body text-[15px] leading-relaxed">
                  <strong className="font-display italic text-[1.15rem]">You thought a personal assistant was expensive.</strong>{' '}
                  A human chief of staff runs ${humanAssistantYear.low.toLocaleString()} to ${humanAssistantYear.high.toLocaleString()} a year.
                  Yours starts at <strong>${chiefUsd(entry.monthlyCents)}</strong> a month.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 bg-[#161616] text-[#FBF6EA] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#F5B700] hover:-translate-y-0.5 transition-transform"
                >
                  Hire your Chief →
                </Link>
                <a
                  href={`tel:${PHONE_TEL}`}
                  className="inline-flex items-center gap-2 bg-white text-[#161616] border-2 border-[#161616] rounded-full px-7 py-4 font-sans font-bold uppercase tracking-[0.14em] text-[12px] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Hear him: {PHONE_DISPLAY}
                </a>
              </div>
              <p className="font-body text-[13px] text-[#161616]/70 mt-4">
                Call and talk to Mr. Mustard yourself. The demo is the trial. No card, no meeting.
              </p>
            </div>

            {/* Hero visual: a text from your Chief (CSS phone, no external art) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="w-[268px] rounded-[2.2rem] border-[6px] border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616] p-3 pt-6 rotate-[2deg]">
                <div className="rounded-[1.5rem] bg-[#eef1f6] overflow-hidden">
                  <div className="bg-[#161616] text-[#FBF6EA] px-4 py-2.5 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-[#F5B700] border-2 border-[#FBF6EA] flex items-center justify-center text-[15px]" aria-hidden>🌱</span>
                    <div className="leading-tight">
                      <p className="font-sans font-bold text-[12px]">The Chief</p>
                      <p className="font-mono text-[9px] text-[#FBF6EA]/60">6:31 AM</p>
                    </div>
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white border border-black/5 px-3.5 py-2.5 shadow-sm">
                      <p className="font-body text-[12.5px] leading-snug text-[#161616]">
                        Morning. Verse of the day, 58° and clear, and the 3 things that matter before noon. Coffee first.
                      </p>
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white border border-black/5 px-3.5 py-2.5 shadow-sm">
                      <p className="font-body text-[12.5px] leading-snug text-[#161616]">
                        Drafted your reply to the Hendricks proposal. Want me to send it, or read it to you?
                      </p>
                    </div>
                    <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-[#F5B700] border-2 border-[#161616] px-3.5 py-2 shadow-[2px_2px_0_0_#161616]">
                      <p className="font-body font-semibold text-[12.5px] leading-snug text-[#161616]">Send it. And book me 30 min with Sarah.</p>
                    </div>
                    <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white border border-black/5 px-3.5 py-2.5 shadow-sm">
                      <p className="font-body text-[12.5px] leading-snug text-[#161616]">Sent, and you’re booked Thursday at 10. Done. 👊</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16 lg:py-20 space-y-20 lg:space-y-24">
        {/* ── The wedge: Sidekick answers your customers. The Chief works for you. ── */}
        <section className="grid sm:grid-cols-2 gap-5">
          <div className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]/55">The Sidekick</span>
            <h3 className="font-display italic font-extrabold text-2xl mt-2">Answers your customers.</h3>
            <p className="font-body text-[14px] text-[#161616]/70 mt-2.5 leading-relaxed flex-1">
              An inbound AI front desk. It picks up your phone when the world calls in, books appointments, and takes
              clean messages 24/7.
            </p>
            <Link href="/sidekick" className="mt-4 font-sans font-bold text-[12px] uppercase tracking-[0.14em] text-[#1E50C8] hover:underline underline-offset-4">
              Meet the Sidekick →
            </Link>
          </div>
          <div className="flex flex-col border-2 border-[#161616] bg-[#F5B700] rounded-2xl shadow-[6px_6px_0_0_#161616] p-7">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#161616]">The Chief</span>
            <h3 className="font-display italic font-extrabold text-2xl mt-2">Works for you.</h3>
            <p className="font-body text-[14px] text-[#161616]/80 mt-2.5 leading-relaxed flex-1">
              Your outbound, proactive right hand. He runs your calendar, your email, your calls, your research, your
              prep, and your morning. One picks up when the world calls in. The other runs your week.
            </p>
            <span className="mt-4 font-sans font-bold text-[12px] uppercase tracking-[0.14em] text-[#161616]">You are here ↓</span>
          </div>
        </section>

        {/* ── The film ── */}
        <section id="film">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Meet him // The film
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            This is The Chief.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            He runs your calendar, your inbox, and your calls, and preps your pitch before the big one. Thirty seconds
            with the assistant who works while you sleep.
          </p>
          <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616] overflow-hidden">
            <video
              className="block w-full h-auto"
              controls
              playsInline
              preload="none"
              poster="/video/chief-ad-poster.jpg"
            >
              <source src="/video/chief-ad.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {/* ── Signature moment: A Day With Your Chief ── */}
        <section id="day">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            A day with your Chief // Drag it
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            One day. Everything he quietly handled.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed mb-9">
            From the wake-up call to the wind-down. Drag through a single day and watch the small stuff, and the big
            stuff, get taken care of before you had to ask.
          </p>
          <DayWithYourChief />
        </section>

        {/* ── What he does ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            What he does // Basically everything
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Everything you would hand a great assistant.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {chiefCapabilities.map((c) => (
              <div
                key={c.name}
                className="flex flex-col border-2 border-[#161616] bg-white rounded-2xl shadow-[5px_5px_0_0_#161616] p-5 transition-transform hover:-translate-y-1"
              >
                <span className="text-2xl leading-none" aria-hidden>{c.icon}</span>
                <h3 className="font-display font-extrabold text-lg mt-2.5">{c.name}</h3>
                <p className="font-body text-[13px] text-[#161616]/70 mt-1.5 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── The anchor math ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10 overflow-hidden">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">The math // The part that stings</span>
          <h2 className="font-display italic font-extrabold text-3xl md:text-[2.8rem] mt-3 leading-[1.03] text-[#FBF6EA] max-w-3xl">
            A human assistant costs a salary. Yours costs a subscription.
          </h2>
          <div className="mt-8 space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-sans font-bold text-[13px] uppercase tracking-[0.14em] text-[#FBF6EA]/70">Human executive assistant</span>
                <span className="font-mono font-bold text-[15px] text-[#FBF6EA] tabular-nums whitespace-nowrap">
                  ${humanAssistantYear.low.toLocaleString()}–${humanAssistantYear.high.toLocaleString()}/yr
                </span>
              </div>
              <div className="mt-2 h-6 rounded-full bg-[#FBF6EA]/10 overflow-hidden border border-[#FBF6EA]/15">
                <div className="h-full rounded-full bg-[#E0301E]" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-sans font-bold text-[13px] uppercase tracking-[0.14em] text-[#F5B700]">The Chief</span>
                <span className="font-mono font-bold text-[15px] text-[#F5B700] tabular-nums whitespace-nowrap">
                  ${chiefYear.toLocaleString()}/yr
                </span>
              </div>
              <div className="mt-2 h-6 rounded-full bg-[#FBF6EA]/10 overflow-hidden border border-[#FBF6EA]/15">
                <div
                  className="h-full rounded-full bg-[#F5B700]"
                  style={{ width: `${Math.max(6, Math.round((chiefYear / humanAssistantYear.high) * 100))}%` }}
                />
              </div>
            </div>
          </div>
          <p className="font-body text-[15px] text-[#FBF6EA]/75 mt-7 max-w-2xl leading-relaxed">
            He works every hour, never calls in sick, remembers everything, and starts at{' '}
            <strong className="text-[#F5B700]">${chiefUsd(entry.monthlyCents)}/mo</strong>. Most owners keep tens of
            thousands of dollars and still get more done.
          </p>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing">
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
            Pricing // Month to month, cancel anytime
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] max-w-3xl">
            Pick how much of your life he runs.
          </h2>
          <p className="font-body text-[15px] text-[#161616]/70 mt-4 max-w-2xl leading-relaxed">
            Every plan is hard-capped on voice minutes and never overages. Hit the cap and he keeps going on text, chat,
            and email. No trials, because the free demo call was the trial.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mt-10 items-stretch">
            {chiefTiers.map((tier) => {
              const featured = tier.featured;
              return (
                <div
                  key={tier.slug}
                  className={`relative flex flex-col border-2 border-[#161616] rounded-2xl p-7 ${
                    featured ? 'bg-[#F5B700] shadow-[8px_8px_0_0_#161616]' : 'bg-white shadow-[6px_6px_0_0_#161616]'
                  }`}
                >
                  {featured && (
                    <span
                      aria-hidden
                      className="absolute -top-4 -right-3 rotate-[8deg] bg-[#C4160B] text-[#FBF6EA] font-mono font-extrabold text-[10px] uppercase tracking-[0.14em] px-3 py-1.5 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616]"
                    >
                      Most hire this
                    </span>
                  )}
                  <span className={`font-mono font-bold text-[10px] uppercase tracking-[0.2em] ${featured ? 'text-[#161616]' : 'text-[#C4160B]'}`}>
                    {tier.chip}
                  </span>
                  <h3 className="font-display italic font-extrabold text-2xl mt-2">{tier.name}</h3>
                  <p className="font-mono font-bold text-[15px] mt-3">
                    ${chiefUsd(tier.monthlyCents).toLocaleString()}/mo{' '}
                    <span className={featured ? 'text-[#161616]/75' : 'text-[#161616]/70'}>
                      + ${chiefUsd(tier.setupCents).toLocaleString()} setup
                    </span>
                  </p>
                  <p className={`font-body text-[13.5px] mt-3 leading-relaxed ${featured ? 'text-[#161616]/80' : 'text-[#161616]/70'}`}>
                    {tier.pitch}
                  </p>
                  <ul className="mt-5 space-y-2 flex-1">
                    {tier.includes.map((line) => (
                      <li key={line} className="flex gap-2.5 font-body text-[13px] leading-snug">
                        <span className="text-[#C4160B] font-bold shrink-0" aria-hidden>›</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <ChiefCheckoutButton
                    tier={tier.slug}
                    className={`mt-6 w-full text-center border-2 border-[#161616] rounded-full px-5 py-3.5 font-sans font-extrabold text-[11px] uppercase tracking-[0.16em] transition-all hover:-translate-y-0.5 disabled:opacity-60 ${
                      featured
                        ? 'bg-[#161616] text-[#F5B700] shadow-[4px_4px_0_0_#FBF6EA]'
                        : 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616]'
                    }`}
                  >
                    {tier.cta}
                  </ChiefCheckoutButton>
                </div>
              );
            })}
          </div>
          <p className="font-body text-[13px] text-[#161616]/70 mt-6 text-center">
            The setup fee is one time and covers the hand-training that makes him yours. Live within 7 days. Cancel anytime.
          </p>
        </section>

        {/* ── How it works ── */}
        <section className="bg-[#161616] border-2 border-[#161616] rounded-2xl shadow-[8px_8px_0_0_#F5B700] p-7 sm:p-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold">How it works</span>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 mt-6">
            {[
              ['1', 'Meet him free', `Call ${PHONE_DISPLAY} and talk to Mr. Mustard yourself, or hire him and skip the line. The demo is the trial.`],
              ['2', 'We train him by hand', 'In your first week we load your world: your business, your calendar, your people, your voice, and how you like things done. He becomes yours.'],
              ['3', 'He runs your week', 'He calls you awake, drafts your email, books your day, preps your meetings, and follows up on your leads. You just say the word.'],
            ].map(([n, t, d]) => (
              <div key={n} className="flex gap-4 sm:block">
                <span className="font-display text-5xl font-bold text-[#F5B700] leading-none shrink-0">{n}</span>
                <div className="sm:mt-3">
                  <h3 className="font-display font-bold text-lg text-[#FBF6EA] leading-tight">{t}</h3>
                  <p className="font-body text-[13.5px] text-[#FBF6EA]/65 mt-1.5 leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Boundaries: the honesty section ── */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7">
            <p className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#8f6600]">What he handles</p>
            <ul className="mt-4 space-y-3">
              {chiefBoundaries.handles.map((line) => (
                <li key={line} className="flex gap-3 font-body text-[14px] leading-snug">
                  <span className="text-[#8f6600] font-bold shrink-0" aria-hidden>✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-[#161616] bg-white rounded-2xl shadow-[6px_6px_0_0_#161616] p-7">
            <p className="font-mono font-bold text-[10px] uppercase tracking-[0.2em] text-[#C4160B]">Where he draws the line</p>
            <ul className="mt-4 space-y-3">
              {chiefBoundaries.wont.map((line) => (
                <li key={line} className="flex gap-3 font-body text-[14px] leading-snug">
                  <span className="text-[#C4160B] font-bold shrink-0" aria-hidden>—</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase text-center">
            Straight answers // No sales call required
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-5xl mt-3 leading-[1.02] text-center">
            Questions, answered plainly.
          </h2>
          <div className="mt-10 max-w-3xl mx-auto space-y-4">
            {chiefFaq.map((f) => (
              <details key={f.q} className="group rounded-xl border-2 border-[#161616] bg-white p-5 open:shadow-[4px_4px_0_0_#F5B700] transition-shadow">
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="flex-shrink-0 text-[#C4160B] transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-[#5c554a] leading-relaxed font-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Close ── */}
        <section className="relative halftone-bg border-2 border-[#161616] rounded-2xl bg-[#F5B700] p-10 md:p-14 text-center overflow-hidden">
          <div className="relative">
            <h2 className="font-display italic font-extrabold text-3xl md:text-5xl leading-[1.02]">
              Stop doing it all yourself.
            </h2>
            <p className="font-body text-[15px] text-[#161616]/80 mt-4 max-w-xl mx-auto leading-relaxed">
              Hear him first at {PHONE_DISPLAY}, or hire him today and have your own Chief on the line this week. From
              ${chiefUsd(entry.monthlyCents)}/mo, a fraction of a human assistant.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 justify-center">
              <Link
                href="#pricing"
                className="inline-block border-2 border-[#161616] bg-[#161616] text-[#F5B700] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Hire your Chief →
              </Link>
              <a
                href={`tel:${PHONE_TEL}`}
                className="inline-block border-2 border-[#161616] bg-white text-[#161616] rounded-full px-9 py-4 font-sans font-extrabold text-[12px] uppercase tracking-[0.16em] shadow-[5px_5px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Call and hear him
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
