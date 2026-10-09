'use client';

import { BOOTCAMP, HOSTS, OPERATOR, bootcampDeliverables, bootcampTiers, fmtMountain, fmtMountainTime, operatorWeeks, usd } from '@/data/bootcamp';
import { SITE } from '@/lib/seo';
import { btn, card, muted, useCopy } from './shared';

/**
 * THE OFFER, on one screen. Every tier, the program, the host terms, the
 * deliverables, the calendar and every public link, read straight from
 * data/bootcamp.ts so this tab can never disagree with the page or Stripe.
 * To tweak the offer, change that file; this tab and every public surface
 * move with it.
 */

const LINKS: { label: string; path: string; note: string }[] = [
  { label: 'Offer page', path: '/bootcamp', note: 'The three tiers and checkout' },
  { label: 'Free masterclass', path: '/bootcamp/masterclass', note: 'The top of the funnel; cold ads point here' },
  { label: 'The Operator Program', path: '/bootcamp/operator', note: 'The eight-week cohort' },
  { label: 'Host a Room', path: '/bootcamp/host', note: 'Host application' },
];

const MOMENTS: { key: keyof typeof BOOTCAMP.dates; label: string }[] = [
  { key: 'masterclass', label: 'Free masterclass' },
  { key: 'kickoff', label: 'Kickoff call' },
  { key: 'day1', label: 'Day 1' },
  { key: 'close', label: 'Enrollment closes' },
  { key: 'day2', label: 'Day 2' },
  { key: 'day3', label: 'Day 3' },
  { key: 'deliverables', label: 'Deck, Kit and Playbook open' },
  { key: 'operatorStart', label: 'Operator Program starts' },
];

function H({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="font-display text-xl font-semibold text-[#161616]">{children}</h2>
      {note && <p className={muted}>{note}</p>}
    </div>
  );
}

function Includes({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((i) => (
        <li key={i} className="grid grid-cols-[14px_1fr] gap-2 font-body text-sm text-[#161616]">
          <span aria-hidden className="mt-1.5 h-2 w-2 rounded-full bg-[#F5B700] border border-[#161616]" />
          {i}
        </li>
      ))}
    </ul>
  );
}

export default function OfferTab() {
  const { copy, labelFor } = useCopy();
  const offerText = [
    BOOTCAMP.name,
    BOOTCAMP.promise,
    '',
    ...bootcampTiers.map((t) => `${t.name}, ${usd(t.priceCents)}: ${t.pitch}`),
    `${OPERATOR.name}, ${usd(OPERATOR.priceCents)}: ${OPERATOR.pitch}`,
    '',
    `Free masterclass ${fmtMountain(BOOTCAMP.dates.masterclass)} at ${fmtMountainTime(BOOTCAMP.dates.masterclass)} Mountain: ${SITE.url}/bootcamp/masterclass`,
  ].join('\n');

  return (
    <div className="space-y-8">
      <section className="rounded-xl border-2 border-[#161616] bg-[#161616] p-5 text-[#FBF6EA] shadow-[4px_4px_0_0_#F5B700]">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#F5B700]">The promise</p>
        <p className="font-display text-2xl leading-snug mt-2 text-[#FBF6EA]">{BOOTCAMP.promise}</p>
        <p className="font-body text-sm mt-3 text-[#FBF6EA]/80 max-w-3xl">{BOOTCAMP.thesis}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => copy(offerText, 'offer-all')} className="rounded-full border-2 border-[#F5B700] bg-[#F5B700] px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-[#161616]">
            {labelFor('offer-all', 'Copy the offer in six lines')}
          </button>
          <code className="self-center font-mono text-[11px] text-[#FBF6EA]/70">Edit: data/bootcamp.ts</code>
        </div>
      </section>

      <section className="space-y-3">
        <H note="Plain links; each host's tracked link lives in the Hosts tab">Links</H>
        <div className="grid sm:grid-cols-2 gap-3">
          {LINKS.map((l) => {
            const url = `${SITE.url}${l.path}`;
            return (
              <article key={l.path} className={`${card} p-4 flex items-start justify-between gap-3`}>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-[#161616]">{l.label}</h3>
                  <a href={l.path} target="_blank" rel="noopener noreferrer" className="block font-mono text-xs text-[#161616] underline underline-offset-2 truncate">
                    {url.replace(/^https?:\/\//, '')}
                  </a>
                  <p className="font-body text-xs text-[#3A3733] mt-1">{l.note}</p>
                </div>
                <button type="button" onClick={() => copy(url, `link-${l.path}`)} className={`${btn} shrink-0`}>
                  {labelFor(`link-${l.path}`)}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <H note={`Every ticket includes the first month of SeedSide · ${BOOTCAMP.sessionTime}`}>The tickets</H>
        <div className="grid md:grid-cols-3 gap-3">
          {bootcampTiers.map((t) => (
            <article key={t.slug} className={`${card} p-5 ${t.featured ? 'shadow-[4px_4px_0_0_#F5B700]' : ''}`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{t.chip}</p>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <h3 className="font-display text-xl font-semibold text-[#161616]">{t.name}</h3>
                <span className="font-display text-3xl font-semibold text-[#161616]">{usd(t.priceCents)}</span>
              </div>
              <p className="font-body text-sm text-[#3A3733] mt-2">{t.pitch}</p>
              <Includes items={t.includes} />
            </article>
          ))}
        </div>
        <p className={`${card} p-4 font-body text-sm text-[#161616]`}>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733] block mb-1">The guarantee</span>
          {BOOTCAMP.guarantee}
        </p>
      </section>

      <section className="space-y-3">
        <H note={`${OPERATOR.chip} · starts ${OPERATOR.starts}`}>The backend</H>
        <article className={`${card} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-xl font-semibold text-[#161616]">{OPERATOR.name}</h3>
            <span className="font-display text-3xl font-semibold text-[#161616]">{usd(OPERATOR.priceCents)}</span>
          </div>
          <p className="font-body text-sm text-[#3A3733] mt-2 max-w-3xl">{OPERATOR.pitch}</p>
          <div className="grid lg:grid-cols-2 gap-6 mt-2">
            <Includes items={OPERATOR.includes} />
            <ol className="mt-3 space-y-2">
              {operatorWeeks.map((w) => (
                <li key={w.n} className="grid grid-cols-[64px_1fr] gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold text-[#3A3733] pt-0.5">Week {w.n}</span>
                  <p className="font-body text-sm text-[#161616]">
                    <span className="font-bold">{w.title}.</span> {w.outcome}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </article>
      </section>

      <section className="space-y-3">
        <H note="Built and served from the room after Day 3">What the tiers unlock</H>
        <div className="grid md:grid-cols-3 gap-3">
          {bootcampDeliverables.map((d) => (
            <article key={d.slug} className={`${card} p-4`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] font-bold text-[#3A3733]">{d.minTier === 'vip' ? 'VIP and up' : 'Platinum and the cohort'}</p>
              <h3 className="font-bold text-sm text-[#161616] mt-1">{d.name}</h3>
              <p className="font-body text-sm text-[#3A3733] mt-1">{d.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <H note="Mountain Time">The calendar</H>
          <ul className={`${card} divide-y divide-[#161616]/10`}>
            {MOMENTS.map((m) => {
              const iso = BOOTCAMP.dates[m.key];
              return (
                <li key={m.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="font-body text-sm text-[#161616]">{m.label}</span>
                  <span className="font-mono text-xs text-[#161616] text-right">
                    {fmtMountain(iso, { year: 'numeric' })}, {fmtMountainTime(iso)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="space-y-3">
          <H note={`First ${HOSTS.foundingHosts} are founding hosts`}>Host terms</H>
          <article className={`${card} p-4`}>
            <p className="font-body text-sm text-[#3A3733]">{HOSTS.pitch}</p>
            <Includes items={HOSTS.terms} />
          </article>
        </div>
      </section>
    </div>
  );
}
