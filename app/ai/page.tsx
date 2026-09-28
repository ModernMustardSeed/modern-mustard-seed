import Link from '@/components/AttributionLink';
import { buildMetadata } from '@/lib/seo';
import { JsonLd, breadcrumbJsonLd, faqJsonLd, serviceJsonLd, webPageJsonLd } from '@/lib/jsonld';
import { DEMO_PRODUCTS, formatUsd } from '@/lib/demo-order';
import { DEMO_LINE } from '@/data/trade-pages';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

/**
 * /ai: the door for people who search the word "AI". The studio calls the
 * work agentic systems; searchers type "AI for my business", "AI agents",
 * "AI receptionist" and "AI website". This page answers in their words,
 * says plainly what we build, and hands them to the page for each product.
 */

const description =
  'AI for your business, built by Modern Mustard Seed in Kalispell, Montana: AI websites, AI voice agents that answer every call, AI agents that run the work behind the counter, and custom AI software. Set package prices. You own everything.';

export const metadata = buildMetadata({
  title: 'AI for Your Business: AI Websites, AI Agents and AI Receptionists',
  description,
  path: '/ai',
});

const voice = DEMO_PRODUCTS.voice;

const builds = [
  {
    title: 'An AI website',
    href: '/agentic-websites',
    text: 'A beautiful website that explains the business clearly, answers questions from your real information, and hands every enquiry to the right next step. Built to be found by Google and by ChatGPT.',
    tag: 'Websites that answer',
  },
  {
    title: 'An AI receptionist',
    href: '/voice-agents',
    text: 'A voice agent that answers every call in a natural voice, day and night, books the job on your calendar, and wakes you only for a real emergency. No voicemail. No missed sale.',
    tag: 'Voice agents',
  },
  {
    title: 'AI agents for the busywork',
    href: '/agentic-native',
    text: 'Agents that take the repetitive work off your team: follow-ups, quotes, scheduling, intake, reporting. Your company running on agentic systems, with your people in charge.',
    tag: 'Agentic systems',
  },
  {
    title: 'A website and a phone that share one brain',
    href: '/talking-website',
    text: 'The Talking Website: a custom site and a voice agent built around the same business facts, so what people read and what callers hear always agree.',
    tag: 'The Talking Website',
  },
  {
    title: 'Custom AI software',
    href: '/services',
    text: 'The tool you wish existed, built around the way your business actually works: applications, stores, internal systems and the AI inside them. Scoped to a set package price.',
    tag: 'Custom software',
  },
  {
    title: 'A clear AI plan',
    href: '/advisory',
    text: 'Not sure where AI belongs? We decide with you what deserves to be built, what to simplify, and what to leave alone, in the order that pays back first.',
    tag: 'Advisory',
  },
];

const faq = [
  {
    q: 'What does Modern Mustard Seed build with AI?',
    a: 'We build AI websites, AI voice agents that answer your phone, AI agents that automate the work behind the counter, and custom AI software. We call the whole category agentic systems: AI that does a real job inside your business, not a chatbot bolted onto a page.',
  },
  {
    q: 'What is the difference between AI and agentic?',
    a: 'AI is the broad term. Agentic describes AI that takes action: it answers the call, books the appointment, sends the follow-up, updates the record. Everything we build is agentic, with clear limits on what it may do and a human handoff when it should stop.',
  },
  {
    q: 'Can AI answer my business phone?',
    a: `Yes. Our voice agents answer every call in a natural voice, book work on your calendar and take messages. Call the studio line at ${DEMO_LINE.display} and Mr. Mustard, our own AI receptionist, will answer. A standalone voice agent is ${formatUsd(voice.setupCents)} setup and ${formatUsd(voice.monthlyCents)} a month.`,
  },
  {
    q: 'What does AI for a small business cost?',
    a: `Every engagement is a set package price, never an hourly bill. A voice agent is ${formatUsd(voice.setupCents)} setup and ${formatUsd(voice.monthlyCents)} a month, websites have three published sizes on the websites page, and custom AI systems are scoped to a set package price before any work starts.`,
  },
  {
    q: 'Will AI replace my staff?',
    a: 'We build AI to take the repetitive work off your people, not to remove them. The phone gets answered at 2am, the follow-up goes out on time, and your team spends the day on the work only they can do.',
  },
  {
    q: 'Do I own what you build?',
    a: 'Yes. You own the code, the accounts and the finished work. Changes to what we build are included.',
  },
  {
    q: 'Do you only work in Montana?',
    a: 'We are based in Kalispell, Montana, and build for businesses nationwide.',
  },
];

export default function AIPage() {
  return (
    <article className="bg-[#fbf5ea] text-[#0b3b44] pb-24 overflow-x-clip">
      <JsonLd data={[
        webPageJsonLd({ path: '/ai', name: 'AI for Your Business', description }),
        serviceJsonLd({ path: '/ai', name: 'AI websites, AI voice agents and AI agents for business', description }),
        faqJsonLd(faq),
        breadcrumbJsonLd([{ name: 'Home', url: '/' }, { name: 'AI for Your Business', url: '/ai' }]),
      ]} />

      <PopPageHero
        eyebrow={<span>AI for your business · Kalispell, Montana · Nationwide</span>}
        title={<>AI that answers, books and runs <em>the busywork.</em></>}
        titleId="ai-heading"
        issue={{ no: 'No.1', lines: ['AI for business', 'Built and owned'] }}
        art={{
          src: '/art/riviera/yacht',
          alt: 'Painting: on the aft deck of a white yacht, Mr. Mustard works from his phone and laptop at a teak table while Mrs. Mustard reads under her straw hat, the kids jump into the turquoise water and the seed dog watches, the business running while the family plays.',
          caption: 'The business runs. The family sails.',
        }}
        sticker="AI on!"
        mascot={{ bubble: 'I answer the phones here!' }}
        marquee={['AI websites', 'AI receptionists', 'AI agents', 'Custom AI software', 'Set package prices', 'You own everything']}
      >
        <p>We are Modern Mustard Seed, a design and AI studio in Kalispell, Montana. We build AI websites, AI voice agents that answer every call, and AI agents that run the work behind the counter, so the business keeps moving while you live your life.</p>
        <div className={pop.actions}>
          <Link href="/inquire" className={pop.cta}>Tell us what you have in mind <span aria-hidden="true">↗</span></Link>
          <a href={`tel:${DEMO_LINE.tel}`} className={pop.ctaAlt}>Hear our AI answer · {DEMO_LINE.display}</a>
        </div>
      </PopPageHero>

      <section className="max-w-6xl mx-auto px-6 pt-4 pb-16" aria-labelledby="builds-heading">
        <p className="font-mono text-xs font-bold uppercase text-[#0a7c78]">What we build with AI</p>
        <h2 id="builds-heading" className="font-display text-4xl md:text-6xl mt-3 max-w-3xl">Six ways AI can work <em>for you.</em></h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed">Pick the job you want off your plate. Each one is a real product with its own page, a set package price, and a person who builds it: Sarah Scarano.</p>
        <ul className="mt-10 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {builds.map((b) => (
            <li key={b.title}>
              <Link href={b.href} className="group flex h-full flex-col rounded-3xl bg-white p-7 shadow-[0_24px_50px_-34px_rgba(11,59,68,0.5)] ring-1 ring-[#0b3b44]/10 transition hover:-translate-y-1 hover:ring-[#81d8d0]">
                <span className="self-start rounded-full bg-[#d8f3f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0a7c78]">{b.tag}</span>
                <h3 className="font-display text-2xl mt-4">{b.title}</h3>
                <p className="mt-3 leading-relaxed text-[#2c4c52] flex-1">{b.text}</p>
                <span className="mt-5 font-semibold text-[#0b3b44] group-hover:text-[#0a7c78]">See how it works <span aria-hidden="true">→</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[#0e5f63] text-[#fbf5ea] py-16" data-ground="sea" aria-labelledby="agentic-heading">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-[#81d8d0]">AI or agentic?</p>
            <h2 id="agentic-heading" className="font-display text-4xl md:text-5xl mt-3 text-white">AI that does the job, <em>not just talks about it.</em></h2>
          </div>
          <div className="space-y-4 text-lg leading-relaxed text-[#d8f3f0]">
            <p>Most &quot;AI&quot; you have seen is a chatbot that answers questions. We build agentic systems: AI that takes the action. It answers the call, books the appointment, sends the follow-up and updates the record.</p>
            <p>Every system has limits we set with you: what it may say, what it may touch, and when it hands off to a person. A booking only counts when your calendar confirms it.</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16" aria-labelledby="steps-heading">
        <p className="font-mono text-xs font-bold uppercase text-[#0a7c78]">How it starts</p>
        <h2 id="steps-heading" className="font-display text-4xl md:text-5xl mt-3">Three steps, <em>no jargon.</em></h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-5">
          {[
            ['Tell us the job.', 'The call you keep missing, the follow-up that never goes out, the quote that takes all evening. One sentence is enough.'],
            ['We map the first win.', 'We pick the one job AI should take first, the one that pays back fastest, and scope it to a set package price.'],
            ['We build it. You own it.', 'We design, build and launch it, then hand you the keys: the code, the accounts and the finished work. Changes are included.'],
          ].map(([t, d], i) => (
            <li key={t} className="rounded-3xl bg-white p-7 ring-1 ring-[#0b3b44]/10">
              <span className="font-display italic text-4xl text-[#0a7c78]">0{i + 1}</span>
              <h3 className="font-display text-2xl mt-3">{t}</h3>
              <p className="mt-3 leading-relaxed text-[#2c4c52]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="max-w-4xl mx-auto px-6 pb-8" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-4xl md:text-5xl">AI questions, <em>straight answers.</em></h2>
        <div className="mt-8 divide-y divide-[#0b3b44]/15 border-y border-[#0b3b44]/15">
          {faq.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
                {f.q}
                <span aria-hidden="true" className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#81d8d0] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-[#2c4c52]">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link href="/inquire" className="inline-flex items-center gap-3 rounded-full bg-[#0b3b44] px-7 py-4 font-semibold text-white shadow-[0_14px_30px_-14px_rgba(11,59,68,0.8)] hover:-translate-y-0.5 transition">Tell us what you have in mind <span aria-hidden="true" className="text-[#f5b700]">↗</span></Link>
          <Link href="/presence-audit" className="inline-flex items-center rounded-full bg-white px-7 py-4 font-semibold ring-1 ring-[#0b3b44]/20 hover:ring-[#81d8d0] transition">Get the free presence audit</Link>
        </div>
      </section>
    </article>
  );
}
