'use client';

/**
 * MUSTARD LIFE. The Family Business Issue.
 *
 * A glossy lifestyle-magazine parody in comic form: the Mustard family lives
 * absurdly well (yacht, rooftop, film set) and every time someone asks who is
 * minding the business, the answer is a Modern Mustard Seed product doing the
 * work. Every price on the page derives from the same data tables checkout
 * reads (data/sidekick.ts, lib/demo-order.ts, data/ads.ts, ...), never typed.
 *
 * All panel art is generated with the locked Mustard family character refs and
 * contains no text by brand rule; every word on this page is real HTML.
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { SIDEKICK, sidekickTiers, sidekickUsd } from '@/data/sidekick';
import { DEMO_PRODUCTS, DEMO_BUNDLE } from '@/lib/demo-order';
import { picturesTiers } from '@/data/pictures';
import { broadcastTiers, broadcastEntry } from '@/data/ads';
import { pressTiers } from '@/data/press';
import { launchTiers } from '@/data/mustard-launch';
import { geoTiers } from '@/data/geo';
import { PRICE_TIERS, BUILD_FEE_USD } from '@/data/switchboard';
import { hatcheryTiers } from '@/data/hatchery';
import { mustardLevels } from '@/data/mustard-mode/offer';
import { products } from '@/data/products';

const INK = '#161616';
const GOLD = '#F5B700';
const usd = (cents: number) => `$${sidekickUsd(cents)}`;

/* ------------------------------------------------------------------ */
/* Derived prices. The law: never type a price, always derive it.      */
/* ------------------------------------------------------------------ */
const P = {
  sidekick: sidekickTiers.find((t) => t.slug === 'sidekick')!,
  sidekickPro: sidekickTiers.find((t) => t.slug === 'sidekick-pro')!,
  site: DEMO_PRODUCTS.site,
  os: DEMO_PRODUCTS.os,
  bundle: DEMO_BUNDLE,
  spot: picturesTiers.find((t) => t.name === 'THE SPOT')!,
  premiere: picturesTiers.find((t) => t.name === 'THE PREMIERE')!,
  seasonPass: picturesTiers.find((t) => t.name === 'SEASON PASS')!,
  justCommercial: broadcastEntry,
  onAir: broadcastTiers.find((t) => t.slug === 'ads-onair')!,
  primeTime: broadcastTiers.find((t) => t.slug === 'ads-primetime')!,
  piece: pressTiers.find((t) => t.name === 'THE PIECE')!,
  pressKit: pressTiers.find((t) => t.name === 'THE KIT')!,
  handPress: pressTiers.find((t) => t.name === 'THE HAND PRESS')!,
  launchKit: launchTiers.find((t) => t.name === 'The Launch Kit')!,
  launchRoom: launchTiers.find((t) => t.name === 'The Launch Room')!,
  fixPack: geoTiers.find((t) => t.name === 'THE FIX PACK')!,
  fullDesk: geoTiers.find((t) => t.name === 'THE FULL DESK')!,
  watch: geoTiers.find((t) => t.name === 'THE WATCH')!,
  watchPro: geoTiers.find((t) => t.name === 'THE WATCH PRO')!,
  hatch: hatcheryTiers[0],
  heartbeat: hatcheryTiers.find((t) => t.name === 'Heartbeat')!,
  spotlight: hatcheryTiers.find((t) => t.name === 'Spotlight')!,
  player: mustardLevels.find((l) => l.name === 'Player')!,
  builder: mustardLevels.find((l) => l.name === 'Builder')!,
  cabinet: mustardLevels.find((l) => l.name === "Founders' Cabinet")!,
  storeFrom: Math.min(...products.filter((p) => !p.comingSoon).map((p) => p.priceUsd)),
  switchTop: PRICE_TIERS[0],
  switchBest: PRICE_TIERS[PRICE_TIERS.length - 1],
  buildFee: BUILD_FEE_USD,
};

/* ------------------------------------------------------------------ */
/* Scroll-pop: one observer, .mlc-pop elements get .in when visible.   */
/* ------------------------------------------------------------------ */
function usePops(root: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const els = Array.from(host.querySelectorAll<HTMLElement>('.mlc-pop'));
    if (!('IntersectionObserver' in window)) return;
    // Animations arm only once JS is live; without JS everything stays visible.
    host.classList.add('mlc-ready');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [root]);
}

/* ------------------------------------------------------------------ */
/* Small parts                                                         */
/* ------------------------------------------------------------------ */

function Bubble({
  children,
  who,
  tail = 'left',
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  who?: string;
  tail?: 'left' | 'right' | 'none';
  className?: string;
  delay?: number;
}) {
  return (
    <div className={`mlc-pop relative ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="relative rounded-2xl border-2 border-[#161616] bg-white px-5 py-4 shadow-[4px_4px_0_0_#161616]">
        {who && (
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-[#E0301E] mb-1.5">{who}</p>
        )}
        <p className="font-display text-lg md:text-xl font-bold leading-snug text-[#161616]">{children}</p>
        {tail !== 'none' && (
          <span
            aria-hidden
            className={`absolute -bottom-[13px] h-6 w-6 rotate-45 border-b-2 border-r-2 border-[#161616] bg-white ${
              tail === 'left' ? 'left-8' : 'right-8'
            }`}
          />
        )}
      </div>
    </div>
  );
}

function PriceTag({
  name,
  price,
  note,
  featured = false,
  delay = 0,
}: {
  name: string;
  price: string;
  note?: string;
  featured?: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`mlc-pop mlc-tag relative rounded-xl border-2 border-[#161616] px-4 py-3 ${
        featured ? 'bg-[#F5B700] shadow-[4px_4px_0_0_#161616]' : 'bg-white shadow-[4px_4px_0_0_#F5B700]'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span
        aria-hidden
        className="absolute -top-2 left-4 h-4 w-10 rounded-[3px] border border-[#161616]/30 bg-[#FBF6EA]/80 rotate-[-4deg]"
      />
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-[#161616]">{name}</p>
      <p className="font-display text-2xl font-black leading-none text-[#161616] mt-1">{price}</p>
      {note && <p className="font-body text-[11px] leading-snug text-[#161616]/70 mt-1.5">{note}</p>}
    </div>
  );
}

function Cta({ href, children, solid = false }: { href: string; children: React.ReactNode; solid?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border-2 border-[#161616] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#161616] shadow-[3px_3px_0_0_#161616] ${
        solid ? 'bg-[#161616] text-[#F5B700] hover:shadow-[5px_5px_0_0_rgba(22,22,22,0.35)] shadow-[3px_3px_0_0_rgba(22,22,22,0.35)]' : 'bg-[#F5B700] text-[#161616]'
      }`}
    >
      {children}
      <span aria-hidden>→</span>
    </Link>
  );
}

function PageRule({ page, title }: { page: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#E0301E]">{title}</span>
      <span className="h-[2px] flex-1 bg-[#161616]/15" />
      <span className="font-mono text-[10px] font-bold tracking-[0.3em] text-[#161616]/50">MUSTARD LIFE · {page}</span>
    </div>
  );
}

function Art({
  src,
  alt,
  aspect,
  priority = false,
  tilt = 0,
  sizes = '(min-width: 1024px) 60vw, 100vw',
}: {
  src: string;
  alt: string;
  aspect: string;
  priority?: boolean;
  tilt?: number;
  sizes?: string;
}) {
  return (
    <div
      className="mlc-pop relative overflow-hidden rounded-2xl border-2 border-[#161616] bg-[#161616] shadow-[8px_8px_0_0_#161616]"
      style={{ aspectRatio: aspect, transform: tilt ? `rotate(${tilt}deg)` : undefined }}
    >
      <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The magazine                                                        */
/* ------------------------------------------------------------------ */

export default function MustardLifeComic() {
  const rootRef = useRef<HTMLDivElement>(null);
  usePops(rootRef);

  return (
    <div ref={rootRef} className="relative bg-[#FBF6EA] text-[#161616]">
      <style>{`
        .mlc-ready .mlc-pop { opacity: 0; transform: translateY(18px) scale(0.97); transition: opacity .55s cubic-bezier(.2,.9,.3,1.2), transform .55s cubic-bezier(.2,.9,.3,1.2); }
        .mlc-ready .mlc-pop.in { opacity: 1; transform: translateY(0) scale(1); }
        .mlc-tag.in:hover { transform: translateY(-3px) rotate(-1deg); }
        .mlc-tag { transition: opacity .55s cubic-bezier(.2,.9,.3,1.2), transform .3s ease; }
        .mlc-coverline { transition: transform .25s ease; }
        .mlc-coverline:hover { transform: rotate(0deg) scale(1.03) !important; }
        @media (prefers-reduced-motion: reduce) {
          .mlc-pop { opacity: 1; transform: none; transition: none; }
        }
      `}</style>

      {/* ════════════════ THE COVER ════════════════ */}
      <section className="relative min-h-[100svh] overflow-hidden border-b-2 border-[#161616]">
        <div className="absolute inset-0">
          <Image
            src="/comic/cover.webp"
            alt="The Mustard family on the bow of a yacht at golden hour. Mr. Mustard at the wheel in a captain's hat, Mrs. Mustard waving from a deck lounger, the seedling kids watching dolphins."
            fill
            priority
            quality={70}
            sizes="100vw"
            className="object-cover object-[50%_38%]"
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#FBF6EA]/70 via-[#FBF6EA]/20 to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#161616]/60 via-[#161616]/15 to-transparent" />
        </div>

        <div className="relative z-[2] mx-auto flex min-h-[100svh] max-w-6xl flex-col px-5 md:px-8 pt-20 md:pt-24 pb-6">
          {/* Masthead */}
          <header className="text-center">
            <p className="font-mono text-[9px] md:text-[10px] font-bold uppercase tracking-[0.5em] text-[#161616]/80">
              The World&rsquo;s Most Trusted Publication About One Family
            </p>
            <h1
              className="font-display font-black italic leading-[0.85] tracking-tight text-[#161616] text-[19vw] md:text-[9.5rem] lg:text-[11rem]"
              style={{ textShadow: `4px 4px 0 ${GOLD}` }}
            >
              Mustard Life
            </h1>
            <div className="mt-2 inline-flex items-center gap-3 rounded-full border-2 border-[#161616] bg-[#F5B700] px-5 py-1.5 shadow-[3px_3px_0_0_#161616]">
              <span className="font-mono text-[10px] md:text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#161616]">
                The Family Business Issue
              </span>
            </div>
          </header>

          {/* Cover lines */}
          <div className="mt-auto grid gap-3 pb-16 sm:pb-6 pr-16 sm:pr-0 sm:max-w-sm">
            {[
              { t: 'EXCLUSIVE: They Put AI on the Phones and Sailed Away', p: 'p. 04', r: -1.5 },
              { t: 'At Home on the Water with Mr. and Mrs. Mustard', p: 'p. 02', r: 1 },
              { t: 'Inside: Every Price We Charge, Printed in Ink', p: 'p. 03', r: -0.75 },
            ].map((l, i) => (
              <div
                key={l.t}
                className="mlc-pop mlc-coverline w-fit rounded-lg border-2 border-[#161616] bg-white/95 px-4 py-2.5 shadow-[4px_4px_0_0_#161616]"
                style={{ transform: `rotate(${l.r}deg)`, transitionDelay: `${200 + i * 130}ms` }}
              >
                <p className="font-display text-sm md:text-base font-extrabold leading-tight">
                  {l.t} <span className="font-mono text-[10px] font-bold text-[#E0301E]">{l.p}</span>
                </p>
              </div>
            ))}
            <div className="flex items-end justify-between gap-4">
              <div className="mlc-pop rounded-lg border-2 border-[#161616] bg-[#161616] px-4 py-2 shadow-[4px_4px_0_0_#F5B700]" style={{ transitionDelay: '620ms' }}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5B700]">
                  Free. The Magazine, Not the Yacht.
                </p>
              </div>
              <div aria-hidden className="hidden sm:flex h-10 items-end gap-[2px] rounded-sm border-2 border-[#161616] bg-white px-1.5 pt-1.5">
                {[3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 3, 1, 2, 1, 3].map((w, i) => (
                  <span key={i} className="bg-[#161616]" style={{ width: w, height: '100%' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ EDITOR'S LETTER + IN THIS ISSUE ════════════════ */}
      <section id="contents" className="relative border-b-2 border-[#161616]">
        <div aria-hidden className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 02" title="From the Editor's Desk" />
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
            <div className="mlc-pop">
              <div className="rounded-2xl border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] -rotate-[0.6deg]">
                <p className="font-serif text-xl md:text-2xl italic leading-relaxed text-[#161616]">
                  &ldquo;People keep asking how our family is always on the water while every phone gets answered,
                  every website gets built, and every ad gets run. This issue is our answer. It is also, and we
                  want to be honest about this, thirty pages of shameless advertising.&rdquo;
                </p>
                <p className="mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#8f6600]">
                  Mr. Mustard, Editor-in-Chief (Unpaid)
                </p>
                <p className="mt-1 font-body text-[12px] text-[#5c554a]">
                  Reader discretion advised: contains real prices.
                </p>
              </div>
            </div>

            {/* In This Issue: the whole catalog, one glance */}
            <div className="mlc-pop" style={{ transitionDelay: '120ms' }}>
              <div className="rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] overflow-hidden">
                <div className="border-b-2 border-[#161616] bg-[#161616] px-6 py-3">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.4em] text-[#F5B700]">In This Issue</p>
                </div>
                <ul className="divide-y divide-dashed divide-[#161616]/20 px-6 py-2">
                  {[
                    { p: '04', label: 'The Sidekick Forge', note: `AI receptionist, from ${usd(P.sidekick.setupCents)} + ${usd(P.sidekick.monthlyCents)}/mo`, href: '#sidekick' },
                    { p: '06', label: 'Websites and Command Centers', note: `from ${usd(P.site.setupCents)} + ${usd(P.site.monthlyCents)}/mo`, href: '#websites' },
                    { p: '10', label: 'Pictures and Broadcast', note: `commercials from $${P.justCommercial.priceUsd}, managed ads from ${usd(P.onAir.setupCents)}`, href: '#pictures' },
                    { p: '12', label: 'Press, Launch, and the GEO Desk', note: `from $${P.piece.priceUsd}`, href: '#press' },
                    { p: '14', label: 'The Switchboard', note: `franchises, from $${P.switchBest.perLocationUsd}/location`, href: '#switchboard' },
                    { p: '16', label: 'The Hatchery and Night School', note: `mascots $${P.hatch.priceUsd}, courses from $${P.storeFrom}`, href: '#hatchery' },
                    { p: '18', label: 'The Custom Shop', note: 'sites, stores, apps, whole systems', href: '#builds' },
                    { p: '20', label: 'The Free Classifieds', note: 'everything on this page costs nothing', href: '#classifieds' },
                    { p: '22', label: 'Find Your Horizon', note: 'the partner program', href: '#partners' },
                  ].map((row) => (
                    <li key={row.p}>
                      <a href={row.href} className="group flex items-baseline gap-3 py-3">
                        <span className="font-mono text-[11px] font-bold text-[#E0301E]">{row.p}</span>
                        <span className="font-display text-base md:text-lg font-extrabold group-hover:text-[#1E50C8] transition-colors">
                          {row.label}
                        </span>
                        <span aria-hidden className="mx-1 flex-1 border-b-2 border-dotted border-[#161616]/25 translate-y-[-4px]" />
                        <span className="font-body text-[12px] text-[#5c554a] text-right">{row.note}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ p.04 THE SIDEKICK ════════════════ */}
      <section id="sidekick" className="relative border-b-2 border-[#161616]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 04" title="Cover Story" />
          <h2 className="font-display text-4xl md:text-6xl font-black italic leading-[0.95] mb-3">
            Who answers the phones?
          </h2>
          <p className="font-serif italic text-lg md:text-xl text-[#5c554a] mb-10 max-w-2xl">
            Our reporter spent three days aboard. The office never called back. The office never needed to.
          </p>

          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
            <div className="space-y-6">
              <Art
                src="/comic/phones.webp"
                alt="Mr. Mustard relaxing on the yacht's aft deck with lemonade while a glowing golden telephone answers itself beside him."
                aspect="16/9"
                tilt={-0.4}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Bubble who="Mustard Life" tail="none" delay={100}>
                  You have not answered a phone since March.
                </Bubble>
                <Bubble who="Mr. Mustard" tail="none" delay={220}>
                  And yet no phone has gone unanswered.
                </Bubble>
              </div>
              <p className="mlc-pop font-body text-[15px] leading-relaxed text-[#3a3733] max-w-2xl" style={{ transitionDelay: '150ms' }}>
                The Sidekick answers his line 24 hours a day, books the appointments, flags the urgent calls to
                his cell, and sends him a tidy summary of every conversation. Tell Mr. Mustard about your
                business and he trains one for you while you watch, then it talks to you live. The demo is free
                and takes about a minute. {SIDEKICK.creditNote}
              </p>
            </div>

            <div className="space-y-4">
              <PriceTag
                name={P.sidekick.name}
                price={`${usd(P.sidekick.setupCents)} + ${usd(P.sidekick.monthlyCents)}/mo`}
                note={`${P.sidekick.minutesCap} answered minutes a month. At the cap he takes messages only. Never a surprise bill.`}
              />
              <PriceTag
                name={P.sidekickPro.name}
                price={`${usd(P.sidekickPro.setupCents)} + ${usd(P.sidekickPro.monthlyCents)}/mo`}
                note={`${P.sidekickPro.minutesCap} minutes, caller memory, real calendar booking, a monthly retrain call with Sarah.`}
                featured
                delay={120}
              />
              <div className="mlc-pop flex flex-col gap-3 pt-2" style={{ transitionDelay: '220ms' }}>
                <Cta href="/sidekick" solid>Forge Yours Free</Cta>
                <p className="font-mono text-[11px] text-[#5c554a] leading-relaxed">
                  Or call Mr. Mustard himself: <a className="font-bold text-[#1E50C8]" href="tel:+14063121223">{SIDEKICK.phoneLine}</a>. He loves visitors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ p.06 WEBSITES + p.08 COMMAND ════════════════ */}
      <section id="websites" className="relative border-b-2 border-[#161616]">
        <div aria-hidden className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 06" title="Home and Office" />
          <h2 className="font-display text-4xl md:text-6xl font-black italic leading-[0.95] mb-10">
            Brunch is a department now.
          </h2>

          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] items-start">
            <div className="space-y-4 order-2 lg:order-1">
              <Bubble who="Mrs. Mustard" delay={80}>
                We built your website before the espresso cooled.
              </Bubble>
              <p className="mlc-pop font-body text-[15px] leading-relaxed text-[#3a3733]" style={{ transitionDelay: '160ms' }}>
                At the Demo Station, the studio forges a working website for your business free, before you pay
                anything or talk to anyone. Tour it, love it, and the team customizes it and puts it live on
                your own domain.
              </p>
              <PriceTag
                name={P.site.name}
                price={`${usd(P.site.setupCents)} + ${usd(P.site.monthlyCents)}/mo`}
                note={P.site.finePrint}
                delay={220}
              />
              <div className="mlc-pop pt-1" style={{ transitionDelay: '300ms' }}>
                <Cta href="/demos">See Yours Built Free</Cta>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Art
                src="/comic/rooftop.webp"
                alt="The Mustard family working on a rooftop terrace at dusk, a glowing holographic website floating above the table."
                aspect="16/9"
                tilt={0.5}
              />
            </div>
          </div>

          <div className="mt-20 grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
            <div className="space-y-6">
              <Art
                src="/comic/command.webp"
                alt="Mr. Mustard swiveling in a captain's chair on the yacht bridge while glowing consoles run the business, the seedling kids steering in tiny chairs."
                aspect="16/9"
                tilt={-0.5}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Bubble who="Mr. Mustard" tail="none" delay={100}>
                  It runs the business. I just like the chair.
                </Bubble>
                <Bubble who="The Kids" tail="none" delay={220}>
                  We are also very important.
                </Bubble>
              </div>
            </div>
            <div className="space-y-4">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#E0301E]">p. 08 · The Bridge</p>
              <p className="mlc-pop font-body text-[15px] leading-relaxed text-[#3a3733]">
                The Business Command Center wires your calls, customers, and reviews into one glowing dashboard.
                Take all three and it becomes one system with one login.
              </p>
              <PriceTag
                name={P.os.name}
                price={`${usd(P.os.setupCents)} + ${usd(P.os.monthlyCents)}/mo`}
                note={P.os.blurb}
              />
              <PriceTag
                name={P.bundle.name}
                price={`${usd(P.bundle.setupCents)} + ${usd(P.bundle.monthlyCents)}/mo`}
                note={P.bundle.blurb}
                featured
                delay={120}
              />
              <div className="mlc-pop pt-1" style={{ transitionDelay: '220ms' }}>
                <Cta href="/demos" solid>Open the Demo Station</Cta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ p.10 PICTURES + BROADCAST ════════════════ */}
      <section id="pictures" className="relative border-b-2 border-[#161616]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 10" title="The Arts Section" />
          <h2 className="font-display text-4xl md:text-6xl font-black italic leading-[0.95] mb-10">
            Lights. Camera. Mustard.
          </h2>

          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
            <div className="space-y-6">
              <Art
                src="/comic/pictures.webp"
                alt="Mrs. Mustard posing like a movie star under studio lights while Mr. Mustard directs from a director's chair in a beret."
                aspect="16/9"
                tilt={0.4}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Bubble who="Mrs. Mustard" tail="none" delay={100}>
                  I do my own stunts.
                </Bubble>
                <Bubble who="Mr. Mustard, Directing" tail="none" delay={220}>
                  Gorgeous. Now say it like you answer phones for a living.
                </Bubble>
              </div>
              <p className="mlc-pop font-body text-[15px] leading-relaxed text-[#3a3733] max-w-2xl">
                Mustard Pictures makes your business a cinematic commercial, starting with a free Screen Test
                you can watch before paying a cent. Mustard Broadcast then puts it on the air: campaigns built
                and managed in your own ad account, budgets watched weekly, reports in plain English.
              </p>
            </div>

            <div className="space-y-4">
              <PriceTag name={`Pictures · ${P.spot.name}`} price={`$${P.spot.priceUsd}`} note="One cinematic 30-second spot, three cuts, full rights." />
              <PriceTag name={`Pictures · ${P.premiere.name}`} price={`$${P.premiere.priceUsd}`} note="The full premiere treatment." delay={90} />
              <PriceTag name={`Broadcast · ${P.onAir.name}`} price={`${usd(P.onAir.setupCents)} + ${usd(P.onAir.monthlyCents)}/mo`} note={P.onAir.pitch} delay={180} />
              <PriceTag name={`Broadcast · ${P.primeTime.name}`} price={`${usd(P.primeTime.setupCents)} + ${usd(P.primeTime.monthlyCents)}/mo`} note={P.primeTime.pitch} featured delay={270} />
              <div className="mlc-pop flex flex-wrap gap-3 pt-2" style={{ transitionDelay: '340ms' }}>
                <Cta href="/pictures">Free Screen Test</Cta>
                <Cta href="/ads" solid>Go On Air</Cta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ p.12 TRIPTYCH: PRESS / LAUNCH / GEO ════════════════ */}
      <section id="press" className="relative border-b-2 border-[#161616]">
        <div aria-hidden className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 12" title="Three Short Features" />
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                art: '/comic/press.webp',
                alt: 'The seedling kids covered in golden ink proudly holding freshly printed sheets by an antique letterpress.',
                head: 'The kids found the letterpress.',
                sub: 'The letterpress will recover. Mustard Press typesets print that actually wins customers, and the first proof is free.',
                tags: [
                  { name: P.piece.name, price: `$${P.piece.priceUsd}` },
                  { name: P.handPress.name, price: `$${P.handPress.priceUsd}` },
                ],
                cta: { label: 'Free Typeset Proof', href: '/press' },
              },
              {
                art: '/comic/launch.webp',
                alt: 'The Mustard family on a picnic blanket watching a small golden rocket lift off into a twilight sky.',
                head: 'Every launch needs witnesses.',
                sub: 'Mustard Launch is your AI launch coach. Type the idea, get the whole plan, count down to open. The Blueprint is free.',
                tags: [
                  { name: P.launchKit.name, price: `$${P.launchKit.priceUsd}` },
                  { name: P.launchRoom.name, price: `$${P.launchRoom.priceUsd}/mo` },
                ],
                cta: { label: 'Free Blueprint', href: '/mustard-launch' },
              },
              {
                art: '/comic/geo.webp',
                alt: "Mr. Mustard in a detective cape examining a glowing globe through a huge magnifying glass while the seed puppies sniff the floor.",
                head: 'Can the AIs find you?',
                sub: 'When people ask ChatGPT who to hire, the GEO Desk makes sure the answer is you. Your findability grade is free.',
                tags: [
                  { name: P.fixPack.name, price: `$${P.fixPack.priceUsd}` },
                  { name: P.watch.name, price: `from $${P.watch.priceUsd}/mo` },
                ],
                cta: { label: 'Free AI Grade', href: '/website-audit' },
              },
            ].map((f, i) => (
              <article key={f.head} className="flex flex-col gap-4">
                <Art src={f.art} alt={f.alt} aspect="1/1" tilt={i === 1 ? 0 : i === 0 ? -0.6 : 0.6} sizes="(min-width: 768px) 33vw, 100vw" />
                <h3 className="mlc-pop font-display text-2xl font-black italic leading-tight" style={{ transitionDelay: '80ms' }}>{f.head}</h3>
                <p className="mlc-pop font-body text-[14px] leading-relaxed text-[#3a3733]" style={{ transitionDelay: '140ms' }}>{f.sub}</p>
                <div className="grid grid-cols-2 gap-3">
                  {f.tags.map((t, j) => (
                    <PriceTag key={t.name} name={t.name} price={t.price} delay={180 + j * 80} />
                  ))}
                </div>
                <div className="mlc-pop" style={{ transitionDelay: '320ms' }}>
                  <Cta href={f.cta.href}>{f.cta.label}</Cta>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ p.14 SWITCHBOARD ════════════════ */}
      <section id="switchboard" className="relative border-b-2 border-[#161616]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 14" title="Society Pages" />
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] items-start">
            <div className="space-y-4 order-2 lg:order-1">
              <h2 className="font-display text-4xl md:text-5xl font-black italic leading-[0.95]">
                Forty locations, darling. One board.
              </h2>
              <Bubble who="Mrs. Mustard, Operator" delay={80}>
                Hold please. Kidding. Nobody holds here.
              </Bubble>
              <p className="mlc-pop font-body text-[15px] leading-relaxed text-[#3a3733]" style={{ transitionDelay: '160ms' }}>
                The Switchboard is the concierge desk for franchises and multi-location brands: every location
                answered around the clock, every call logged on one command board the whole operation can see.
              </p>
              <PriceTag
                name="The Switchboard"
                price={`$${P.switchBest.perLocationUsd} to $${P.switchTop.perLocationUsd}/location/mo`}
                note={`Volume pricing by location count, plus a one-time $${P.buildFee.toLocaleString('en-US')} build. Call the demo line on the page first.`}
                featured
                delay={240}
              />
              <div className="mlc-pop pt-1" style={{ transitionDelay: '320ms' }}>
                <Cta href="/switchboard" solid>Tour the Switchboard</Cta>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <Art
                src="/comic/switchboard.webp"
                alt="Mrs. Mustard as a glamorous mid-century telephone operator plugging glowing golden cords into a vintage switchboard."
                aspect="16/9"
                tilt={-0.4}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ p.16 HATCHERY + NIGHT SCHOOL ════════════════ */}
      <section id="hatchery" className="relative border-b-2 border-[#161616]">
        <div aria-hidden className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 16" title="Family Announcements" />
          <div className="grid gap-10 lg:grid-cols-2">
            <article className="space-y-4">
              <Art
                src="/comic/hatchery.webp"
                alt="The whole Mustard family gathered around a glowing golden egg cracking open in a nest of straw."
                aspect="1/1"
                tilt={-0.5}
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <h3 className="mlc-pop font-display text-3xl font-black italic">Something is hatching.</h3>
              <p className="mlc-pop font-body text-[14px] leading-relaxed text-[#3a3733]" style={{ transitionDelay: '100ms' }}>
                The Mustard Hatchery births a mascot for your business: a face, a voice, a story your customers
                remember. Meet the first glimpse free, then hatch the whole character.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <PriceTag name={P.hatch.name} price={`$${P.hatch.priceUsd}`} />
                <PriceTag name={P.heartbeat.name} price={`$${P.heartbeat.priceUsd}/mo`} delay={80} />
                <PriceTag name={P.spotlight.name} price={`$${P.spotlight.priceUsd}/mo`} delay={160} />
              </div>
              <div className="mlc-pop" style={{ transitionDelay: '260ms' }}>
                <Cta href="/hatchery">Peek in the Nest</Cta>
              </div>
            </article>

            <article className="space-y-4">
              <Art
                src="/comic/study.webp"
                alt="Mr. Mustard as an enthusiastic professor at a chalkboard of doodles while the seedling kids study and the puppies wear graduation caps."
                aspect="16/9"
                tilt={0.5}
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <h3 className="mlc-pop font-display text-3xl font-black italic">Night school, Mustard style.</h3>
              <p className="mlc-pop font-body text-[14px] leading-relaxed text-[#3a3733]" style={{ transitionDelay: '100ms' }}>
                Mustard Mode teaches you Claude and Claude Code with a live coach, four tracks, and 28 missions.
                The first session is free. The Store carries the studio&rsquo;s production-tested playbooks and
                courses, from {`$${P.storeFrom}`}.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <PriceTag name={P.player.name} price={`$${P.player.priceUsd}`} />
                <PriceTag name={P.builder.name} price={`$${P.builder.priceUsd}`} delay={80} />
                <PriceTag name={P.cabinet.name} price={`$${P.cabinet.priceUsd}/mo`} delay={160} />
              </div>
              <div className="mlc-pop flex flex-wrap gap-3" style={{ transitionDelay: '260ms' }}>
                <Cta href="/mustard-mode">Free First Session</Cta>
                <Cta href="/store" solid>Browse the Store</Cta>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ════════════════ p.18 THE CUSTOM SHOP ════════════════ */}
      <section id="builds" className="relative border-b-2 border-[#161616]">
        <div className="mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 18" title="The Custom Shop" />
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
            <div className="space-y-6">
              <Art
                src="/comic/builds.webp"
                alt="Mr. and Mrs. Mustard in hard hats studying a glowing holographic blueprint while a crane lowers a giant golden seed onto a tower."
                aspect="16/9"
                tilt={0.4}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Bubble who="Mr. Mustard" tail="none" delay={100}>
                  Some ideas need a hard hat.
                </Bubble>
                <Bubble who="Mrs. Mustard" tail="none" delay={220}>
                  And all of them need a good-looking front door.
                </Bubble>
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="font-display text-4xl font-black italic leading-[0.95]">Built to order.</h2>
              <p className="mlc-pop font-body text-[15px] leading-relaxed text-[#3a3733]">
                Custom websites, stores, apps, and whole business systems, shipped in weeks, not months. A Seed
                Site goes live in about a week. A Full-Service Business Build runs the whole operation. Every
                engagement gets a fixed quote after a free 30-minute call, and every setup fee in this magazine
                credits toward any build over $2,500.
              </p>
              <PriceTag name="Every Custom Build" price="Fixed quote" note="Priced after a free discovery call. Fixed scope, fixed timeline, no hourly meter, you own the code." featured delay={140} />
              <div className="mlc-pop flex flex-wrap gap-3 pt-1" style={{ transitionDelay: '240ms' }}>
                <Cta href="/book" solid>Book the Free Call</Cta>
                <Cta href="/services">See the Packages</Cta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ p.20 CLASSIFIEDS + SUBSCRIBE ════════════════ */}
      <section id="classifieds" className="relative border-b-2 border-[#161616]">
        <div aria-hidden className="absolute inset-0 halftone-bg opacity-30 pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-16 md:py-24">
          <PageRule page="p. 20" title="The Mustard Classifieds" />
          <h2 className="font-display text-4xl md:text-5xl font-black italic leading-[0.95] mb-2">
            Everything below is free.
          </h2>
          <p className="font-serif italic text-lg text-[#5c554a] mb-10">We checked. Twice.</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'The Bottleneck Breaker', note: 'A 2-minute AI audit that names the one thing slowing your business down.', href: '/audit' },
              { label: 'The Website Audit', note: 'Your AI-findability grade. Learn what ChatGPT says about you.', href: '/website-audit' },
              { label: 'The New Business Checklist', note: 'Every step from idea to open, in order, none skipped.', href: '/launch-checklist' },
              { label: 'The Prompt Playbook', note: 'The prompts the studio actually uses, ready to steal.', href: '/prompt-playbook' },
              { label: 'Idea to Spec', note: 'Turn the napkin sketch into a build brief a developer can price.', href: '/idea-to-spec' },
              { label: 'The Terminal', note: 'Watch the studio work. Live, unfiltered, oddly soothing.', href: '/the-terminal' },
              { label: 'The Mustard Seed World', note: 'Fly a seaplane over Flathead Lake. Chase twelve seeds. Plant yours.', href: '/world' },
              { label: 'Free Playbooks', note: 'The library of plays, open to readers of this fine publication.', href: '/playbooks' },
            ].map((c, i) => (
              <Link
                key={c.label}
                href={c.href}
                className="mlc-pop group rounded-xl border-2 border-[#161616] bg-white p-4 shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-1 hover:shadow-[5px_5px_0_0_#F5B700]"
                style={{ transitionDelay: `${(i % 4) * 70}ms` }}
              >
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-[#E0301E] mb-1.5">Free · No Card</p>
                <p className="font-display text-lg font-extrabold leading-tight group-hover:text-[#1E50C8] transition-colors">{c.label}</p>
                <p className="font-body text-[12px] leading-snug text-[#5c554a] mt-1.5">{c.note}</p>
              </Link>
            ))}
          </div>

          {/* The tipped-in subscription card */}
          <div className="mlc-pop mx-auto mt-16 max-w-xl" style={{ transitionDelay: '150ms' }}>
            <SubscribeCard />
          </div>
        </div>
      </section>

      {/* ════════════════ p.22 BACK COVER ════════════════ */}
      <section id="partners" className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/comic/horizon.webp"
            alt="The Mustard family together at the yacht's bow, gazing at a golden sunset horizon."
            fill
            quality={70}
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#161616]/80 via-[#161616]/25 to-transparent" />
        </div>
        <div className="relative z-[2] mx-auto flex min-h-[92svh] max-w-5xl flex-col items-center justify-end px-5 md:px-8 pb-16 pt-40 text-center">
          <p className="mlc-pop font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-[#F5B700]">
            p. 22 · A Word From Our Sponsor (Us)
          </p>
          <h2 className="mlc-pop mt-4 font-display text-5xl md:text-7xl font-black italic leading-[0.92] text-white" style={{ transitionDelay: '100ms', textShadow: '3px 3px 0 rgba(22,22,22,0.8)' }}>
            Find your horizon.
          </h2>
          <p className="mlc-pop mt-5 max-w-2xl font-body text-[15px] md:text-base leading-relaxed text-white/90" style={{ transitionDelay: '200ms' }}>
            The family secret is a staff that never sleeps. Get yours at the Demo Station, or join the partner
            program, sell the staff to businesses you know, and keep up to half on every product plus recurring
            income every month. The water is lovely.
          </p>
          <div className="mlc-pop mt-8 flex flex-wrap items-center justify-center gap-4" style={{ transitionDelay: '300ms' }}>
            <Cta href="/demos">See Free Demos</Cta>
            <Cta href="/partners" solid>Become a Partner</Cta>
            <Cta href="/book">Book a Free Call</Cta>
          </div>
          <p className="mlc-pop mt-10 font-mono text-[9px] uppercase tracking-[0.3em] text-white/60 leading-relaxed" style={{ transitionDelay: '380ms' }}>
            Mustard Life is published whenever the Mustards feel like it.
            <br className="hidden sm:block" />
            Modern Mustard Seed · Kalispell, Montana · Started from a seed, Matthew 13:31-32
          </p>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The tipped-in subscribe card (posts to the site newsletter).        */
/* ------------------------------------------------------------------ */
function SubscribeCard() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === 'sending') return;
    setStatus('sending');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="relative rotate-[-1.2deg] rounded-2xl border-2 border-[#161616] bg-[#F5B700] p-7 shadow-[8px_8px_0_0_#161616]">
      <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-[2deg] rounded-[3px] border border-[#161616]/25 bg-[#FBF6EA]/85" />
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-[#161616]/70">Subscription Card · Do Not Lose This</p>
      <h3 className="mt-2 font-display text-3xl font-black italic leading-tight text-[#161616]">
        Subscribe to Mustard Life.
      </h3>
      <p className="mt-2 font-body text-[13px] leading-relaxed text-[#161616]/80">
        One short email a week: real plays from the studio, new issues first, zero fluff. Cancel anytime,
        though the Mustards will wonder what they did wrong.
      </p>
      {status === 'success' ? (
        <p className="mt-5 rounded-xl border-2 border-[#161616] bg-white px-5 py-4 font-display text-lg font-bold text-[#161616]">
          Welcome to the family. Your first issue is on its way.
        </p>
      ) : (
        <form onSubmit={subscribe} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="mlc-email" className="sr-only">Email address</label>
          <input
            id="mlc-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@yourbusiness.com"
            className="w-full flex-1 rounded-full border-2 border-[#161616] bg-white px-5 py-3 font-body text-sm text-[#161616] placeholder:text-[#161616]/40 focus:outline-none focus:ring-2 focus:ring-[#161616]"
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="rounded-full border-2 border-[#161616] bg-[#161616] px-7 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#F5B700] transition-all hover:-translate-y-0.5 disabled:opacity-60"
          >
            {status === 'sending' ? 'Delivering...' : 'Deliver It'}
          </button>
        </form>
      )}
      {status === 'error' && (
        <p className="mt-3 font-mono text-[11px] font-bold text-[#E0301E]">
          The mailroom hiccuped. Try once more?
        </p>
      )}
    </div>
  );
}
