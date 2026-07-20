import Link from 'next/link';
import Image from 'next/image';
import { getContent } from '@/lib/content';

/**
 * BuildCabinet. Beat 04: the three fast-lane builds as arcade-cabinet cards
 * in a static grid (Sarah, 2026-07-19: three cards, no horizontal scrolling,
 * about-a-week delivery front and center). The deeper builds (custom software,
 * full apps, online stores) live in the strip under the grid. Each cabinet
 * carries the pitch, the capability chips, and a real receipt pulled from the
 * shipped case studies.
 */

const CABINETS = [
  {
    key: 'site',
    name: 'Websites',
    color: '#E0301E',
    pitch:
      'Not a brochure, a working engine. Elite design, funnels and a lead magnet live on day one, an AI concierge trained on your business, SEO and GEO baked in.',
    chips: ['Funnels day one', 'AI concierge', 'SEO + GEO'],
    receiptSlug: 'cross-and-covenant',
    intent: 'website',
  },
  {
    key: 'voice',
    name: 'Voice Agents',
    color: '#F5B700',
    pitch:
      'A 24/7 AI receptionist that answers every call in a natural human voice, books appointments, and routes the urgent ones to you. Speaks 100+ languages.',
    chips: ['24/7 answering', '100+ languages', 'Books appointments'],
    receiptSlug: 'voicestaff',
    intent: 'phone-agent',
  },
  {
    key: 'command',
    name: 'Command Centers',
    color: '#1E50C8',
    pitch:
      'Your whole operation on one screen: leads, jobs, follow-ups, and the AI agents that work them while you sleep. Built around how you actually run the day.',
    chips: ['Ops on one screen', 'AI agents built in', 'Replaces the spreadsheet'],
    receiptSlug: 'wild-daisy-command-center',
    intent: 'dashboard',
  },
];

export default function BuildCabinet() {
  return (
    <section className="bg-[#FBF6EA] py-20 md:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-14 items-center">
        <div>
          <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">
            What we build // Pick your cabinet
          </p>
          <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02]">
            One studio. Three machines.
          </h2>
          <p className="font-sans text-base text-[#161616]/75 mt-5 max-w-xl">
            Websites, voice agents, and command centers go live in about a week. Fixed scope, fixed
            quote, no surprises. You do not need to know AI. You do not need a technical co-founder.
          </p>
        </div>

        {/* The studio bench: where the seed ships. */}
        <figure className="relative rotate-[1.5deg] rounded-2xl border-[3px] border-[#161616] bg-white p-2.5 shadow-[9px_9px_0_0_#F5B700] max-w-[520px] w-full mx-auto lg:mx-0 lg:ml-auto">
          <Image
            src="/home/studio-bench.jpg"
            alt="Pop-art screenprint of the studio bench where an idea becomes a shipped product: a glowing monitor, blueprints, a rotary telephone, and a mustard seedling sprouting on the desk"
            width={1600}
            height={1200}
            sizes="(min-width: 1024px) 40vw, 92vw"
            className="rounded-xl border-2 border-[#161616] w-full h-auto"
          />
          <figcaption className="px-2 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[#5c554a] text-center">
            The bench where the seed ships
          </figcaption>
        </figure>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10 grid md:grid-cols-3 gap-6 items-stretch">
        {CABINETS.map((c, i) => {
          const receipt = getContent('work', c.receiptSlug)?.meta;
          const metric = receipt?.metrics?.[0];
          return (
            <div
              key={c.key}
              className="bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-7 flex flex-col"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="font-mono font-bold text-[11px] tracking-[0.14em]"
                  style={{ color: c.color === '#F5B700' ? '#8A6A00' : c.color }}
                >
                  [ BUILD 0{i + 1}/03 ]
                </span>
                <span className="font-mono font-bold text-[10px] text-[#5c554a]">LIVE IN ABOUT A WEEK</span>
              </div>
              <h3 className="font-display italic font-extrabold text-3xl text-[#161616] mt-4">{c.name}</h3>
              <p className="font-sans text-sm text-[#161616]/75 mt-2 leading-relaxed flex-1">{c.pitch}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {c.chips.map((chip) => (
                  <span
                    key={chip}
                    className="font-mono text-[10px] font-bold text-[#161616] border border-[#161616] px-2 py-1 bg-[#FBF6EA]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              {receipt && metric && (
                <Link
                  href={`/work/${c.receiptSlug}`}
                  className="group mt-6 block border-t-2 border-dashed border-[#161616]/20 pt-4"
                >
                  <p className="font-mono font-bold text-[10px] tracking-wider text-[#E0301E] uppercase">
                    The receipt
                  </p>
                  <p className="font-display font-black text-lg text-[#161616] mt-1 group-hover:text-[#E0301E] transition-colors">
                    {metric.value}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5c554a] mt-0.5">
                    {metric.label} · {receipt.title.split(':')[0]} →
                  </p>
                </Link>
              )}
              <Link
                href={`/build-queue?intent=${c.intent}`}
                className="mt-5 text-center font-sans font-bold text-sm bg-[#F5B700] text-[#161616] border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] px-5 py-3 hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#161616] transition-all"
              >
                Start this build
              </Link>
            </div>
          );
        })}
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <p className="font-sans text-sm text-[#161616]/70 max-w-xl">
          <span className="font-bold text-[#161616]">Bigger seed?</span> Custom software, full apps,
          and online stores are the deeper builds. They take more than a week, and they are worth
          it. Same promise either way: fixed quote before work starts, and on launch day you own it
          all, the repo, the database, the deploy, every account.
        </p>
        <Link
          href="/work"
          className="inline-flex items-center gap-2 font-mono font-bold text-[11px] uppercase tracking-[0.2em] text-[#161616] hover:text-[#E0301E] transition-colors shrink-0"
        >
          See all the work →
        </Link>
      </div>
    </section>
  );
}
