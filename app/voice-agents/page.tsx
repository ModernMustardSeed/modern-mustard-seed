import Link from 'next/link';
import Image from 'next/image';
import { CALL_STATS } from '@/data/proof-stats';
import NewsletterSignup from '@/components/NewsletterSignup';
import MissedCallCalculator from '@/components/MissedCallCalculator';
import RestaurantVoiceSection from '@/components/RestaurantVoiceSection';
import VoiceTalkButton from '@/components/VoiceTalkButton';
import MrMustardHeroCTA from '@/components/MrMustardHeroCTA';
import RingMeNow from '@/components/RingMeNow';
import CallTheNumber from '@/components/voice-agents/CallTheNumber';
import CallTicker from '@/components/voice-agents/CallTicker';
import NightShiftFilm from '@/components/voice-agents/NightShiftFilm';
import StickyCallBar from '@/components/voice-agents/StickyCallBar';
import { DEMO_LINE } from '@/data/trade-pages';
import { DEMO_PRODUCTS, DEMO_BUNDLE, formatUsd } from '@/lib/demo-order';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Voice Agents That Answer Every Call, in Any Language',
  description:
    'Call (406) 312-1223 and talk to a real AI voice agent right now, free. A 24/7 voice agent that picks up every call in a natural human voice, books appointments, answers FAQs, and routes urgent calls to you. Multilingual: it greets and serves callers in 100+ languages and detects the caller automatically. For restaurants, it takes phone orders, books tables, and saves the dinner rush from voicemail. Stop losing customers to voicemail or a language barrier.',
  path: '/voice-agents',
});

/**
 * /voice-agents, rebuilt 2026-07-28 around ONE instruction: call this number.
 *
 * The signature moment is the number itself, screenprinted at poster scale in
 * three misregistered color plates with ring waves pulsing off it, repeated in
 * a sticky bar on phones and again in the closer. Everything else on the page
 * exists to get a stranger to dial it and hear Mr. Mustard answer.
 *
 * Art system: the mid-century screenprint plates (trades bench phone, the
 * Lichtenstein switchboard), the Night Shift commercial, halftone + film grain
 * on the dark bands, and full-bleed alternating cream / white / ink / gold.
 * Locked MMS pop-art cabin tokens throughout.
 */

// Verified figures only. Every one is published, dated, and cited on the card.
// See the missed-call-stats research: the "85% never call back" and
// "$126K a year" numbers everybody repeats have no primary source.
//
// These now live in data/proof-stats.ts, because the cold email sequence quotes
// the same numbers and two hand-maintained copies of a statistic will disagree
// eventually. The bar for adding one is written at the top of that file.
const stats = CALL_STATS;

const handles = [
  {
    title: 'Books the appointment',
    body: 'Checks your real availability and puts the booking on your calendar while the caller is still on the line.',
  },
  {
    title: 'Answers your FAQs',
    body: 'Hours, pricing, location, services, directions. In your words, the way you would say it.',
  },
  {
    title: 'Routes the urgent ones',
    body: 'A real emergency rings straight through to you. You decide what counts as urgent.',
  },
  {
    title: 'Qualifies the caller',
    body: 'Asks the right questions, captures the details, and drops a clean lead into your CRM with notes.',
  },
  {
    title: 'Covers after-hours and overflow',
    body: 'When you are closed, on a job, or every line is busy, the agent is still answering.',
  },
  {
    title: 'Follows up by text',
    body: 'Sends a confirmation, a reminder, or a booking link so nothing slips between the call and the visit.',
  },
];

const steps = [
  {
    eyebrow: 'Step 1',
    title: 'We learn your business',
    body: 'Your services, your hours, your FAQs, the way you talk, and exactly what counts as an emergency.',
  },
  {
    eyebrow: 'Step 2',
    title: 'We build and train the agent',
    body: 'A natural custom voice, your script, your calendar and CRM wired in, and tested against real call flows before it ever picks up.',
  },
  {
    eyebrow: 'Step 3',
    title: 'It answers from day one',
    body: 'Live on your number in about a week. It is yours, fully, with every call captured from the first ring.',
  },
];

const faq = [
  {
    q: 'Can I just call it and hear it myself?',
    a: `Yes, that is the whole point. Dial ${DEMO_LINE.display} any hour and Mr. Mustard picks up. Ask him what he would do for your business, make him role-play answering your phone, or have him book you a real call with Sarah before you hang up. Free, no form, no card.`,
  },
  {
    q: 'Does it actually sound human?',
    a: 'Yes. Natural voice, natural pacing, and your script. Most callers cannot tell, and the ones who can do not mind, because they got a real answer instead of voicemail.',
  },
  {
    q: 'What happens with a call it cannot handle?',
    a: 'It does not guess. It captures the details, books a callback, or routes a true emergency straight to you. You set the rules for what it handles and what it escalates.',
  },
  {
    q: 'How fast can it go live?',
    a: 'Most voice agents are live in about a week, answering the number you already have, from first conversation to answering real calls.',
  },
  {
    q: 'Does it work with my calendar and CRM?',
    a: 'Yes. It books against your real availability and writes every call into your CRM, whether that is Zoho, HubSpot, Acuity, or a custom build.',
  },
  {
    q: 'What does it cost?',
    a: 'Quoted after a short discovery call and scoped to your call volume. It usually costs less than a part-time receptionist and never misses a call.',
  },
  {
    q: 'Will it really cover nights and weekends?',
    a: 'That is the entire point. It answers every call, every hour, including the after-hours calls quietly going to voicemail right now.',
  },
  {
    q: 'Can the voice agent speak other languages?',
    a: 'Yes. It speaks over 100 languages and detects the caller automatically, then answers in their language. English, Spanish, French, Portuguese, German, Mandarin, and dozens more. Pick a language on the live demo and talk to it yourself.',
  },
  {
    q: 'Will it switch languages if my customer does?',
    a: 'Yes. It detects the language the caller is speaking and responds in kind, and it can switch mid-conversation. That means you serve Spanish-speaking and multilingual customers without a second phone line or a bilingual receptionist.',
  },
  {
    q: 'Can it take restaurant orders and send them to my kitchen?',
    a: 'Yes. It reads your menu, takes the full takeout or delivery order, repeats it back to the caller, and sends it to your kitchen or POS, with a pay link or card capture if you want payment up front.',
  },
  {
    q: 'Can it handle the dinner rush when every call comes at once?',
    a: 'That is when it earns its keep. It answers every line at the same time, so the Friday-night flood of takeout and reservation calls all get handled instead of rolling to voicemail.',
  },
];

/** What The Talking Website saves against buying the two pieces apart. Derived,
 *  never typed, so it can never drift from what Stripe charges. */
const bundleSavings = {
  setup: DEMO_PRODUCTS.voice.setupCents + DEMO_PRODUCTS.site.setupCents - DEMO_BUNDLE.setupCents,
  monthly:
    DEMO_PRODUCTS.voice.monthlyCents + DEMO_PRODUCTS.site.monthlyCents - DEMO_BUNDLE.monthlyCents,
};

/** One half of The Talking Website, on the dark band. */
function Half({ label, body, price }: { label: string; body: string; price: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#FBF6EA]/20 bg-[#1F1F1F] p-6 md:p-7">
      <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
        {label}
      </span>
      <p className="mt-3 font-body text-[15px] leading-6 text-[#FBF6EA]/70">{body}</p>
      <p className="mt-4 font-mono text-[13px] font-bold text-[#FBF6EA]">{price}</p>
    </div>
  );
}

/** Section eyebrow, the red mono label from the locked system. */
function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={`block font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-[0.32em] ${
        light ? 'text-[#F5B700]' : 'text-[#C4160B]'
      }`}
    >
      {children}
    </span>
  );
}

export default function VoiceAgentsPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Voice Agents', url: '/voice-agents' },
          ]),
          serviceJsonLd({
            name: 'Multilingual Voice Agents',
            description: `Custom 24/7 voice agents that answer every call in a natural human voice, in 100+ languages with automatic language detection. They book appointments, answer FAQs, qualify leads, and route urgent calls. Built and live in about a week. Hear one now by calling ${DEMO_LINE.display}.`,
          }),
          faqJsonLd(faq),
        ]}
      />

      <StickyCallBar />

      <div className="bg-[#FBF6EA] text-[#161616]">
        {/* ═══════════ HERO: the number is the hero ═══════════ */}
        <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA] pt-32 md:pt-40">
          <div aria-hidden="true" className="absolute inset-0 halftone-ink opacity-90" />
          <div aria-hidden="true" className="absolute inset-0 film-grain" />
          {/* Gold light pooling behind the number, like a desk lamp at 2am */}
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-[58%] h-[720px] w-[1100px] max-w-[150vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.16]"
            style={{ background: 'radial-gradient(closest-side, #F5B700, transparent)' }}
          />

          <div className="relative max-w-6xl mx-auto px-6 md:px-8">
            <Eyebrow light>Voice Agents · Talking Websites · 100+ Languages</Eyebrow>
            <h1 className="mt-6 font-display text-[2.9rem] leading-[0.95] sm:text-6xl lg:text-[4.6rem] font-black tracking-tight">
              Your phone rings at 2am.
              <br />
              <span className="text-[#F5B700]">Somebody picks up.</span>
            </h1>

            <div className="mt-10 grid lg:grid-cols-12 gap-10 lg:gap-12 items-center pb-4">
              <div className="lg:col-span-6">
                <p className="max-w-xl font-body text-lg md:text-xl leading-relaxed text-[#FBF6EA]/72">
                  A Modern Mustard Seed voice agent answers every call in a natural human voice,
                  books the job on your calendar, and wakes you only for a real emergency. No
                  voicemail. No missed sale. No leak.
                </p>
                <p className="mt-6 max-w-xl font-body text-base leading-relaxed text-[#F5B700]">
                  You do not have to take our word for it. Ours is awake right now, and the number
                  is right there.
                </p>
                <div className="mt-8 flex flex-wrap gap-2.5">
                  {['Answers on the first ring', 'Books on your calendar', 'Speaks 100+ languages'].map(
                    (chip) => (
                      <span
                        key={chip}
                        className="rounded-full border-2 border-[#FBF6EA]/25 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#FBF6EA]/70"
                      >
                        {chip}
                      </span>
                    )
                  )}
                </div>

                {/* The other direction. The signature moment below asks them to
                    dial; this asks for nothing but the number and dials them.
                    Whichever one they are willing to do, they hear the product. */}
                <div className="mt-8">
                  <RingMeNow source="voice-agents-hero" />
                </div>
              </div>

              {/* Screenprint plate: the bench phone that never rings unanswered */}
              <div className="lg:col-span-6">
                <figure className="relative rotate-[-2deg] rounded-2xl border-[3px] border-[#FBF6EA] bg-[#FBF6EA] p-2.5 shadow-[10px_10px_0_0_#F5B700]">
                  <Image
                    src="/voice-agents/trades-hero.jpg"
                    alt="Screenprint art: a black rotary phone ringing on a red workbench beside leather gloves and a coffee mug"
                    width={1600}
                    height={900}
                    sizes="(min-width: 1024px) 48vw, 92vw"
                    className="w-full h-auto rounded-xl border-2 border-[#161616]"
                  />
                  <figcaption className="px-2 pt-2.5 pb-1 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/70">
                    Nobody is standing there. It still gets answered.
                  </figcaption>
                </figure>
              </div>
            </div>

            {/* Screenprint rule */}
            <div aria-hidden="true" className="mt-12 h-2 w-full stripe-ink opacity-25" />

            {/* ── THE SIGNATURE MOMENT ── */}
            <div className="py-14 md:py-20">
              <CallTheNumber />
            </div>
          </div>
        </section>

        {/* ═══════════ A SAMPLE NIGHT (ticker) ═══════════ */}
        <section>
          <CallTicker />
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-4">
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#161616]/70">
              A sample night on the line. Illustrative, not a call log.
            </p>
          </div>
        </section>

        {/* ═══════════ BROWSER DEMO ═══════════ */}
        <section id="browser-demo" className="scroll-mt-24 border-y-2 border-[#161616] bg-white">
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="text-center mb-9">
              <Eyebrow>No Phone Handy?</Eyebrow>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                Talk to him right{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  here
                </span>
                , in this tab
              </h2>
              <p className="mt-5 max-w-2xl mx-auto font-body text-base md:text-lg leading-relaxed text-[#3a3733]">
                Yes, this is a talking website. Same agent, same brain, no phone required. Pick a
                language and say hi.
              </p>
            </div>
            <VoiceTalkButton />
          </div>
        </section>

        {/* ═══════════ THE COST OF A PHONE NOBODY ANSWERS ═══════════ */}
        <section className="border-b-2 border-[#161616] bg-[#FBF6EA]">
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="max-w-2xl">
              <Eyebrow>The Real Numbers</Eyebrow>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                A phone nobody answers is a{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  bill
                </span>
                , not a missed call
              </h2>
              <p className="mt-5 font-body text-base md:text-lg leading-relaxed text-[#3a3733]">
                Every figure below is published, dated, and cited. The ones everybody else quotes
                (85% never call back, $126,000 a year) have no primary source, so they are not here.
              </p>
            </div>

            {/*
              The column count follows the DATA, it is not a fixed four. When
              the 52% figure was pulled on 2026-08-18 this grid still said
              lg:grid-cols-4 and left three cards sitting in a four-wide row
              with a hole on the end, which reads as a missing card rather than
              a considered set. Tailwind cannot take a runtime class name, so
              the three real cases are written out and picked.
            */}
            <div
              className={`mt-11 grid grid-cols-1 sm:grid-cols-2 gap-5 ${
                stats.length % 4 === 0 ? 'lg:grid-cols-4' : stats.length % 3 === 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
              }`}
            >
              {stats.map((s) => (
                <div key={s.label} className="pop-card p-7 flex flex-col">
                  <span
                    className="block font-display text-[3.5rem] lg:text-[4.1rem] font-black leading-none tracking-tight text-[#F5B700]"
                    style={{ WebkitTextStroke: '2.5px #161616' }}
                  >
                    {s.figure}
                  </span>
                  <span className="mt-3 block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#C4160B]">
                    {s.label}
                  </span>
                  <p className="mt-3 font-body text-sm leading-6 text-[#3a3733] flex-1">{s.body}</p>
                  <span className="mt-4 block font-mono text-[9px] uppercase tracking-[0.14em] text-[#161616]/70">
                    {s.source}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ THE BUILD ═══════════ */}
        <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#F5B700]">
          <div aria-hidden="true" className="absolute inset-0 stripe-ink opacity-[0.07]" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#161616] bg-white px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#C4160B] shadow-[3px_3px_0_0_#161616]">
                  New · The Free Demo
                </span>
                <h2 className="mt-6 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.03] text-[#161616]">
                  That was ours. Now hear one trained on{' '}
                  <span className="italic">yours</span>.
                </h2>
                <p className="mt-5 max-w-xl font-body text-base md:text-lg leading-relaxed text-[#161616]/80">
                  Tell Mr. Mustard about your business. He trains a personalized front desk on the
                  spot, then you call it and hear it answer as <em>your</em> company. Free, no card.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/demos"
                    className="rounded-full border-2 border-[#161616] bg-[#161616] px-9 py-4 text-center font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#FBF6EA]"
                  >
                    Build Mine, Free →
                  </Link>
                  <Link
                    href="/voice-agents/whitepaper"
                    className="rounded-full border-2 border-[#161616] bg-white px-9 py-4 text-center font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
                  >
                    Read The Whitepaper
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rotate-[1.5deg] rounded-2xl border-[3px] border-[#161616] bg-[#161616] p-7 md:p-8 shadow-[9px_9px_0_0_#FBF6EA]">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#F5B700]">
                    One Form, Start To Finish
                  </span>
                  <ol className="mt-5 space-y-4">
                    {[
                      'Tell him your business, your trade, your town.',
                      'Watch him train an agent on it, live.',
                      'Talk to it, or have it ring your cell.',
                    ].map((line, i) => (
                      <li key={line} className="flex gap-3.5 items-start">
                        <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#F5B700] font-mono text-[11px] font-bold text-[#F5B700]">
                          {i + 1}
                        </span>
                        <span className="font-body text-[15px] leading-6 text-[#FBF6EA]/80">
                          {line}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ THE TALKING WEBSITE (the cross-sell) ═══════════ */}
        <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
          <div aria-hidden="true" className="absolute inset-0 halftone-ink opacity-80" />
          <div aria-hidden="true" className="absolute inset-0 film-grain" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="text-center max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#E0301E] bg-[#E0301E] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white">
                First Of Its Kind
              </span>
              <h2 className="mt-6 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.03]">
                Put him on your website and you get{' '}
                <span className="text-[#F5B700]">{DEMO_BUNDLE.name}</span>
              </h2>
              <p className="mt-6 font-body text-base md:text-lg leading-relaxed text-[#FBF6EA]/70">
                Not a website with a chat bubble bolted on. Your site and your voice agent built as
                one thing, off one brain, so the answer a visitor reads on the page is the exact
                answer a caller hears at midnight. Nobody else is selling this yet.
              </p>
            </div>

            {/* The two halves becoming one */}
            <div className="mt-12 grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 items-stretch max-w-4xl mx-auto">
              <Half
                label="Your website"
                body="Built from scratch, funnels and SEO baked in, live on your domain in about a week."
                price={`${formatUsd(DEMO_PRODUCTS.site.setupCents)} + ${formatUsd(DEMO_PRODUCTS.site.monthlyCents)}/mo`}
              />
              <div
                aria-hidden="true"
                className="hidden md:flex items-center justify-center font-display text-4xl font-black text-[#F5B700]"
              >
                +
              </div>
              <Half
                label="Your voice agent"
                body="The one you just called, answering your real number 24/7 in your business name."
                price={`${formatUsd(DEMO_PRODUCTS.voice.setupCents)} + ${formatUsd(DEMO_PRODUCTS.voice.monthlyCents)}/mo`}
              />
            </div>

            {/* The offer */}
            <div className="mt-8 max-w-4xl mx-auto rounded-2xl border-[3px] border-[#F5B700] bg-[#F5B700] p-7 md:p-9 text-[#161616] shadow-[8px_8px_0_0_#FBF6EA]">
              <div className="md:flex md:items-center md:justify-between gap-8">
                <div className="md:flex-1">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#161616]/70">
                    Take both, together
                  </span>
                  <h3 className="mt-2 font-display text-3xl md:text-4xl font-black tracking-tight italic">
                    {DEMO_BUNDLE.name}
                  </h3>
                  <p className="mt-3 font-display text-2xl md:text-3xl font-black tracking-tight">
                    {formatUsd(DEMO_BUNDLE.setupCents)} to build ·{' '}
                    {formatUsd(DEMO_BUNDLE.monthlyCents)}/mo
                  </p>
                  <p className="mt-3 font-body text-[15px] leading-6 text-[#161616]/80 max-w-xl">
                    That is {formatUsd(bundleSavings.setup)} off the build and{' '}
                    {formatUsd(bundleSavings.monthly)}/mo off buying them apart. Month to month, cancel
                    anytime, no trials.
                  </p>
                </div>
                <div className="mt-6 md:mt-0 flex flex-col gap-3 shrink-0">
                  <Link
                    href="/demos"
                    className="text-center rounded-full border-2 border-[#161616] bg-[#161616] px-8 py-4 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
                  >
                    See Mine Built Free →
                  </Link>
                  <Link
                    href="/websites"
                    className="text-center rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.25)] transition-all hover:-translate-y-0.5"
                  >
                    About The Website
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ CALCULATOR ═══════════ */}
        <section id="calculator" className="scroll-mt-24 border-b-2 border-[#161616] bg-white">
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="text-center mb-10">
              <Eyebrow>Run Your Own Numbers</Eyebrow>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                What is your unanswered phone{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  worth
                </span>
                ?
              </h2>
            </div>
            <MissedCallCalculator />
          </div>
        </section>

        {/* ═══════════ WHAT IT HANDLES ═══════════ */}
        <section className="border-b-2 border-[#161616] bg-[#FBF6EA]">
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="text-center mb-12">
              <Eyebrow>What It Handles</Eyebrow>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                A front desk that never{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  sleeps
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {handles.map((h, i) => (
                <article
                  key={h.title}
                  className="pop-card p-7 md:p-8 transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="block font-mono text-[11px] font-bold tabular-nums text-[#8f6600]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-black tracking-tight leading-snug">
                    {h.title}
                  </h3>
                  <p className="mt-2.5 font-body text-sm md:text-[15px] leading-7 text-[#3a3733]">
                    {h.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ SWITCHBOARD PLATE: every line at once ═══════════ */}
        <section className="relative border-b-2 border-[#161616]">
          <div className="relative h-40 md:h-56 overflow-hidden">
            <Image
              src="/switchboard/exchange-hero.jpg"
              alt="Pop-art screenprint of a telephone switchboard, every jack patched with red, blue, and yellow cords"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-[#161616]/60" />
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <p
                className="text-balance text-center font-display text-2xl md:text-4xl font-black tracking-tight text-[#FBF6EA]"
                style={{ textShadow: '0 2px 14px rgba(22,22,22,0.75)' }}
              >
                Every line. At the same time.{' '}
                <span className="text-[#F5B700]">Nobody on hold.</span>
              </p>
            </div>
          </div>
        </section>

        {/* ═══════════ THE NIGHT SHIFT FILM ═══════════ */}
        <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
          <div aria-hidden="true" className="absolute inset-0 halftone-ink opacity-70" />
          <div aria-hidden="true" className="absolute inset-0 film-grain" />
          <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-5">
                <Eyebrow light>The Night Shift</Eyebrow>
                <h2 className="mt-5 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.03] text-balance">
                  There is only one of you.
                  <br />
                  <span className="text-[#F5B700]">Now there are two.</span>
                </h2>
                <p className="mt-6 font-body text-base md:text-lg leading-relaxed text-[#FBF6EA]/70">
                  Sixty seconds on what happens to the calls that come in after you go home. Sound
                  on.
                </p>
                <a
                  href={`tel:${DEMO_LINE.tel}`}
                  className="mt-8 inline-flex items-center gap-2.5 rounded-full border-2 border-[#F5B700] bg-transparent px-7 py-3.5 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#F5B700] transition-all hover:bg-[#F5B700] hover:text-[#161616] hover:-translate-y-0.5"
                >
                  ☎ Hear Him Now · {DEMO_LINE.display}
                </a>
              </div>
              <div className="lg:col-span-7">
                <NightShiftFilm />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ RESTAURANTS ═══════════ */}
        <section className="border-b-2 border-[#161616] bg-white">
          <div className="max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-24 [&>div]:mb-0">
            <RestaurantVoiceSection />
          </div>
        </section>

        {/* ═══════════ MULTILINGUAL ═══════════ */}
        <section className="border-b-2 border-[#161616] bg-[#FBF6EA]">
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7">
                <Eyebrow>Speaks 100+ Languages</Eyebrow>
                <h2 className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                  It answers in your customer&apos;s{' '}
                  <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                    language
                  </span>
                </h2>
                <p className="mt-5 max-w-xl font-body text-base md:text-lg leading-relaxed text-[#3a3733]">
                  English, Spanish, French, Portuguese, German, Mandarin, and dozens more. Your
                  agent detects the caller and replies in their language automatically, and can
                  switch mid-call. No second line, no bilingual hire. Pick a language on the demo
                  above and hear it for yourself.
                </p>
              </div>
              <div className="lg:col-span-5">
                <div className="flex flex-wrap gap-2.5">
                  {[
                    '🇺🇸 English',
                    '🇲🇽 Español',
                    '🇫🇷 Français',
                    '🇧🇷 Português',
                    '🇩🇪 Deutsch',
                    '🇨🇳 中文',
                    '🇷🇺 Русский',
                    '🇻🇳 Tiếng Việt',
                    '+94 more',
                  ].map((t) => (
                    <span
                      key={t}
                      className="rounded-full border-2 border-[#161616] bg-white px-3.5 py-2 font-sans text-[13px] font-bold shadow-[3px_3px_0_0_#161616]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ HOW IT WORKS ═══════════ */}
        <section className="border-b-2 border-[#161616] bg-white">
          <div className="max-w-6xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="text-center mb-12">
              <Eyebrow>How It Works</Eyebrow>
              <h2 className="mt-4 font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                Live in about{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  a week
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((s) => (
                <article
                  key={s.title}
                  className="pop-card p-8 transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-[#C4160B]">
                    {s.eyebrow}
                  </span>
                  <h3 className="mt-3.5 font-display text-xl md:text-2xl font-black tracking-tight leading-snug">
                    {s.title}
                  </h3>
                  <p className="mt-3 font-body text-sm md:text-[15px] leading-7 text-[#3a3733]">
                    {s.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FAQ ═══════════ */}
        <section className="border-b-2 border-[#161616] bg-[#FBF6EA]">
          <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
            <div className="text-center mb-10">
              <Eyebrow>Common Questions</Eyebrow>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-black tracking-tight">
                Ask him these too. He{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  answers
                </span>
                .
              </h2>
            </div>
            <div className="space-y-4">
              {faq.map((item) => (
                <details key={item.q} className="pop-card p-6 group cursor-pointer">
                  <summary className="flex justify-between items-start gap-4 list-none">
                    <h3 className="font-display text-lg font-black tracking-tight">{item.q}</h3>
                    <span className="flex-shrink-0 text-2xl font-black text-[#C4160B] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 font-body text-sm md:text-base leading-7 text-[#3a3733]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ CLOSER: the number, one more time, bigger ═══════════ */}
        <section className="relative overflow-hidden border-b-2 border-[#161616] bg-[#161616] text-[#FBF6EA]">
          <div aria-hidden="true" className="absolute inset-0 halftone-ink" />
          <div aria-hidden="true" className="absolute inset-0 film-grain" />
          <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-20 md:py-28">
            <div className="text-center mb-4">
              <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
                Stop reading. Start{' '}
                <span className="text-[#F5B700]">dialing</span>.
              </h2>
              <p className="mt-5 max-w-xl mx-auto font-body text-base md:text-lg leading-relaxed text-[#FBF6EA]/70">
                Sixty seconds on the phone with him will tell you more than this whole page did. Ask
                him what he could do for your business.
              </p>
            </div>

            <div className="mt-12">
              <CallTheNumber location="voice-agents-closer" />
            </div>

            <div className="mt-14 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/book"
                className="rounded-full border-2 border-[#F5B700] bg-[#F5B700] px-9 py-4 text-center font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#161616] transition-all hover:-translate-y-0.5"
              >
                Book A Discovery Call
              </Link>
              <Link
                href="/playbooks/14-day-voice-agent"
                className="rounded-full border-2 border-[#FBF6EA]/40 px-9 py-4 text-center font-sans text-[12px] font-extrabold uppercase tracking-[0.18em] text-[#FBF6EA] transition-all hover:border-[#FBF6EA] hover:-translate-y-0.5"
              >
                Read The 14-Day Playbook
              </Link>
            </div>
          </div>
        </section>

        {/* ═══════════ CHAT + NEWSLETTER ═══════════ */}
        <div className="max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-24">
          <MrMustardHeroCTA location="voice-agents" />
          <div className="mt-14">
            <NewsletterSignup
              headline="Speed-to-lead plays. Weekly."
              subhead="How small businesses stop the leak with AI, automation, and faster follow-up. Free to read. Free to copy."
            />
          </div>
        </div>
      </div>
    </>
  );
}
