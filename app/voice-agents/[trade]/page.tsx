import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { buildMetadata, SITE } from '@/lib/seo';
import { JsonLd, faqJsonLd, serviceJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { getTradePage, liveTradePages, tradeFaqs, DEMO_LINE } from '@/data/trade-pages';
import { sidekickTiers, sidekickUsd } from '@/data/sidekick';
import MissedCallMath from '@/components/voice-agents/MissedCallMath';

/**
 * The receptionist trade fleet: /voice-agents/[trade].
 * Rendered from TRADE_PRESETS (the same source the forged demos use), so the
 * page can never drift from what the product actually says on a call.
 * Only LIVE_TRADE_SLUGS build; everything else 404s until Sarah releases it.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return liveTradePages().map((t) => ({ trade: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ trade: string }> }) {
  const { trade } = await params;
  const page = getTradePage(trade);
  if (!page) return buildMetadata({ noindex: true });
  return buildMetadata({
    title: `AI Receptionist For ${page.forWord}. Hear It Answer Live`,
    description: `A 24/7 AI receptionist built for ${page.forWord.toLowerCase()}: ${page.services.toLowerCase()}. Forge a free demo trained on your business and hear it answer in 60 seconds.`,
    path: `/voice-agents/${page.slug}`,
  });
}

export default async function TradePage({ params }: { params: Promise<{ trade: string }> }) {
  const { trade } = await params;
  const page = getTradePage(trade);
  if (!page) notFound();

  const { preset, forWord, services, ticketWord } = page;
  const faqs = tradeFaqs(forWord, services, preset.avgTicket, ticketWord);

  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <JsonLd
        data={[
          serviceJsonLd({
            name: `24/7 AI Receptionist for ${forWord}`,
            description: `AI phone receptionist for ${forWord.toLowerCase()}: ${services.toLowerCase()}. Answers every call, books the work, texts a summary.`,
          }),
          faqJsonLd(faqs),
          breadcrumbJsonLd([
            { name: 'Voice Agents', url: `${SITE.url}/voice-agents` },
            { name: forWord, url: `${SITE.url}/voice-agents/${page.slug}` },
          ]),
        ]}
      />

      {/* ─────────────── HERO ─────────────── */}
      <section className="relative overflow-hidden border-b-2 border-[#161616] halftone-bg">
        <div className="relative z-[2] max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-14 md:pb-20">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] font-bold bg-white text-[#E0301E] border-2 border-[#161616] rounded-full px-3.5 py-1.5 shadow-[3px_3px_0_0_#161616]">
                ☎ Built For {forWord}
              </span>
              <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-tight text-5xl md:text-6xl lg:text-[4.4rem]">
                Every call answered. Every {preset.jobWord} caught.
              </h1>
              <p className="mt-6 max-w-xl text-lg md:text-xl text-[#3d382e] font-body leading-relaxed">
                A 24/7 AI receptionist that answers as your company, books the work, and texts you the summary.
                While you are on the roof, under the sink, or with a customer, it is on the phone.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sidekick"
                  className="rounded-full border-2 border-[#161616] bg-[#F5B700] text-[#161616] px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
                >
                  Ring My Own Phone
                </Link>
                <a
                  href={`tel:${DEMO_LINE.tel}`}
                  className="rounded-full border-2 border-[#161616] bg-white px-8 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
                >
                  Hear It: {DEMO_LINE.display}
                </a>
              </div>
              <p className="mt-6 font-body text-[15px] text-[#5c554a]">
                The demo line answers live, any hour. The forged demo goes further: it answers as{' '}
                <em className="italic">your</em> business, trained on your services, in about 60 seconds.
              </p>
            </div>
            <div className="lg:col-span-5">
              <figure className="relative rotate-[-1.5deg] rounded-2xl border-[3px] border-[#161616] bg-white p-2.5 shadow-[9px_9px_0_0_#F5B700]">
                <Image
                  src="/voice-agents/trades-hero.jpg"
                  alt="Screenprint art: a vintage phone ringing on a tradesman's workbench beside work gloves and coffee"
                  width={1600}
                  height={900}
                  priority
                  sizes="(min-width: 1024px) 40vw, 92vw"
                  className="rounded-xl border-2 border-[#161616] w-full h-auto"
                />
                <figcaption className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c554a] text-center">
                  The bench phone never rings unanswered again
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── MISSED-CALL MATH ─────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">
            Run Your Own Numbers
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            What does the phone you cannot answer cost?
          </h2>
          <div className="mt-8">
            <MissedCallMath avgTicket={preset.avgTicket} ticketWord={ticketWord} />
          </div>
        </div>
      </section>

      {/* ─────────────── WHAT IT HANDLES + A SAMPLE NIGHT ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 grid lg:grid-cols-2 gap-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">
              Trained On Your Trade
            </p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
              It already speaks {forWord.toLowerCase()}.
            </h2>
            <p className="mt-5 font-body text-lg text-[#3d382e] leading-relaxed">{services}.</p>
            <p className="mt-4 font-body text-[15px] text-[#5c554a] leading-relaxed">
              Booked jobs land on your schedule, every caller gets a text confirmation, and you get the summary
              the moment each call ends. Emergencies get flagged so the right ones wake you up.
            </p>
            <div className="mt-8 rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-5 shadow-[4px_4px_0_0_#161616]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#8f6600]">
                Your Command Board
              </p>
              <p className="mt-2 font-display text-xl font-extrabold">{preset.signature.title}</p>
              <p className="mt-1 font-body text-sm text-[#5c554a]">{preset.signature.sub}</p>
              <p className="mt-3 font-body text-sm text-[#3d382e]">
                Every forged demo ships with a full business command center for your trade, and it stays free with your
                receptionist. This board is its centerpiece. See it live inside your demo.
              </p>
            </div>
          </div>
          <div>
            <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] p-6 shadow-[6px_6px_0_0_#F5B700]">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] font-bold text-[#F5B700]">
                  While You Slept
                </p>
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#FBF6EA]/50">
                  Sample Night
                </span>
              </div>
              <ul className="mt-5 space-y-4">
                {preset.overnightCalls.map((c) => (
                  <li key={c.time} className="border-b border-[#FBF6EA]/15 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-sans font-bold text-[#FBF6EA]">{c.caller}</span>
                      <span className="font-mono text-xs text-[#F5B700]">{c.time}</span>
                    </div>
                    <p className="mt-1 font-body text-sm text-[#FBF6EA]/70">“{c.need}”</p>
                    <p className="mt-1 font-body text-sm text-[#8FA98F]">→ {c.outcome}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-body text-xs text-[#FBF6EA]/50">
                Sample calls showing real product behavior for this trade.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── HOW IT STARTS ─────────────── */}
      <section className="border-b-2 border-[#161616] bg-[#F5B700]">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            Hear it before you ever pay for it.
          </h2>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              {
                n: '01',
                t: 'Forge The Demo',
                b: 'Type your business name at the demo station. In about 60 seconds a receptionist trained on your company exists.',
              },
              {
                n: '02',
                t: 'Call Your Own Demo',
                b: 'Your phone rings. You hear it answer as your business, handle a booking, and take a message. Judge it with your own ears.',
              },
              {
                n: '03',
                t: 'We Install It',
                b: `A human at Modern Mustard Seed wires it to your real line, services, hours, and booking flow. Plans from $${sidekickUsd(sidekickTiers[0].monthlyCents)} a month, hard caps, no trial games.`,
              },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616]">
                <p className="font-mono font-bold text-sm text-[#8f6600]">{s.n}</p>
                <h3 className="mt-2 font-sans font-extrabold text-lg">{s.t}</h3>
                <p className="mt-2 font-body text-sm text-[#3d382e] leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section className="border-b-2 border-[#161616]">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#8f6600]">
            Straight Answers
          </p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl font-extrabold leading-[1.05]">
            What {forWord.toLowerCase()} ask us first.
          </h2>
          <div className="mt-8 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[4px_4px_0_0_#161616]"
              >
                <summary className="cursor-pointer list-none font-sans font-bold text-[15px] flex items-start justify-between gap-4">
                  {f.q}
                  <span className="font-mono text-[#8f6600] group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 font-body text-sm text-[#3d382e] leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── CLOSE ─────────────── */}
      <section className="halftone-bg">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold leading-[1.02]">
            Your next {preset.jobWord} is calling.
          </h2>
          <p className="mt-4 font-body text-lg text-[#3d382e]">
            Forge the free demo and hear your own receptionist in about a minute.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/sidekick"
              className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              Ring My Own Phone
            </Link>
            <a
              href={`tel:${DEMO_LINE.tel}`}
              className="rounded-full border-2 border-[#161616] bg-white px-9 py-4 font-sans font-extrabold text-sm uppercase tracking-[0.14em] shadow-[5px_5px_0_0_#161616] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_0_#161616]"
            >
              Call The Demo Line
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
