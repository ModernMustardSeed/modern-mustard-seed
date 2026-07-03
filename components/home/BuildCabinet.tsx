import Link from 'next/link';
import { getContent } from '@/lib/content';

/**
 * BuildCabinet. Beat 04: everything the studio builds, as four arcade-cabinet
 * cards on a snap rail (the MUSTARD MODE TrackRail language). Absorbs the old
 * StartingPoints, WhatAreYouBuilding, WhatGetsBuilt, and YourSiteWorksForYou
 * sections: each cabinet carries the pitch, the capability chips, and a real
 * receipt pulled from the shipped case studies.
 */

const CABINETS = [
  {
    key: 'site',
    name: 'Sites + Stores',
    color: '#E0301E',
    pitch:
      'Not a brochure, a working engine. Elite design, funnels and a lead magnet live on day one, an AI concierge trained on your business, SEO and GEO baked in.',
    chips: ['Funnels day one', 'AI concierge', 'SEO + GEO'],
    receiptSlug: 'cross-and-covenant',
    intent: 'website',
  },
  {
    key: 'app',
    name: 'Apps + Dashboards',
    color: '#1E50C8',
    pitch:
      'Booking apps, CRMs, ops dashboards, zero-to-one products. Built around how you actually work, replacing the spreadsheet you outgrew last year.',
    chips: ['Booking + CRM', 'Ops dashboards', 'Zero-to-one'],
    receiptSlug: 'ptg-deal-analyzer',
    intent: 'dashboard',
  },
  {
    key: 'voice',
    name: 'Voice Agents',
    color: '#F5B700',
    pitch:
      'A 24/7 AI receptionist that answers every call in a natural human voice, books appointments, and routes the urgent ones to you. Speaks 100+ languages.',
    chips: ['24/7 answering', '100+ languages', 'Live in ~2 weeks'],
    receiptSlug: 'voicestaff',
    intent: 'phone-agent',
  },
  {
    key: 'ai-tool',
    name: 'Specialty AI Tools',
    color: '#E0301E',
    pitch:
      'The custom tool only your business has. Public agents that qualify leads and take orders, internal agents that draft follow-ups and triage the inbox.',
    chips: ['Industry tools', 'Internal agents', 'Automations'],
    receiptSlug: 'deed-ai',
    intent: 'ai-tool',
  },
];

export default function BuildCabinet() {
  return (
    <section className="bg-[#FBF6EA] py-20 md:py-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">
          What we build // Pick your cabinet
        </p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02] max-w-3xl">
          One studio. Four machines.
        </h2>
        <p className="font-sans text-base text-[#161616]/75 mt-5 max-w-2xl">
          First real website or fiftieth product, the pattern is the same: fixed scope, fixed quote,
          live in weeks. You do not need to know AI. You do not need a technical co-founder.
        </p>
      </div>

      <div className="mt-10 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
        <div className="flex flex-col md:flex-row gap-6 px-6 md:px-0 md:overflow-x-auto md:snap-x md:snap-mandatory md:pb-6 md:pr-12 mm-cabinet-rail">
          <style>{`
            .mm-cabinet-rail::-webkit-scrollbar { height: 8px; }
            .mm-cabinet-rail::-webkit-scrollbar-track { background: #16161622; }
            .mm-cabinet-rail::-webkit-scrollbar-thumb { background: #F5B700; border: 1px solid #161616; }
          `}</style>
          {CABINETS.map((c, i) => {
            const receipt = getContent('work', c.receiptSlug)?.meta;
            const metric = receipt?.metrics?.[0];
            return (
              <div
                key={c.key}
                className="md:snap-start md:shrink-0 md:w-[380px] bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-7 flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono font-bold text-[11px] tracking-[0.14em]"
                    style={{ color: c.color === '#F5B700' ? '#8A6A00' : c.color }}
                  >
                    [ BUILD 0{i + 1}/04 ]
                  </span>
                  <span className="font-mono font-bold text-[10px] text-[#161616]/50">LIVE IN WEEKS</span>
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
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/45 mt-0.5">
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
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
        <p className="font-sans text-sm text-[#161616]/70 max-w-xl">
          <span className="font-bold text-[#161616]">It is yours, fully.</span> The repo, the
          database, the deploy, the prompts, and every account transfer to you on launch day. No
          lock-in, no retainer required.
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
