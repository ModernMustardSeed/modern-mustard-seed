import Image from 'next/image';
import Link from 'next/link';
import {
  celebrateFaq,
  celebrateGiftFloorCents,
  celebrateTiers,
  celebrateUsd,
} from '@/data/celebrate';

/** Deterministic confetti sprinkle so server and client render identically. */
export function confettiPieces(count: number, seed: number) {
  const colors = ['#F5B700', '#FFDD55', '#E0301E', '#1E50C8', '#FFFFFF'];
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    left: `${(rnd() * 100).toFixed(2)}%`,
    top: `${(rnd() * 100).toFixed(2)}%`,
    width: 5 + Math.round(rnd() * 7),
    height: 4 + Math.round(rnd() * 5),
    rotate: Math.round(rnd() * 360),
    color: colors[Math.floor(rnd() * colors.length) % colors.length],
    opacity: 0.5 + rnd() * 0.5,
    key: i,
  }));
}

export function ConfettiField({ count = 26, seed = 7 }: { count?: number; seed?: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      {confettiPieces(count, seed).map((p) => (
        <span
          key={p.key}
          className="absolute rounded-[2px]"
          style={{
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            background: p.color,
            opacity: p.opacity,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

const GOODS = [
  { src: '/images/celebrate/cake.png', alt: 'Funfetti layer cake with one slice pulled, shot on mustard yellow', caption: 'The cake, baked that morning', rotate: '-rotate-2' },
  { src: '/images/celebrate/peonies.png', alt: 'Coral and white peonies wrapped in kraft paper on cobalt blue', caption: 'Stems cut the same day', rotate: 'rotate-1' },
  { src: '/images/celebrate/card.png', alt: 'Handwritten card with fountain pen, ribbon, and wax seal on pop red', caption: 'Real ink, never printed script', rotate: '-rotate-1' },
  { src: '/images/celebrate/board.png', alt: 'Charcuterie board with cheeses, figs, and edible flowers on mint', caption: 'Built by hand, not a warehouse', rotate: 'rotate-2' },
];

export function GoodsGallery() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-14 md:py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold text-center">
        [ What Actually Shows Up ]
      </p>
      <h2 className="font-display text-3xl md:text-5xl font-black text-center tracking-tight mt-3">
        Fresh joy cannot be warehoused.
      </h2>
      <p className="font-body text-base text-[#161616]/70 max-w-2xl mx-auto text-center mt-4">
        National gifting platforms ship a box of swag from a shelf. Celebrate dispatches the things people
        actually want on their day, made by local shops the same morning they arrive.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-7 mt-10">
        {GOODS.map((g) => (
          <figure key={g.src} className={`${g.rotate}`}>
            <div className="relative aspect-[4/5] border-2 border-[#161616] rounded-xl overflow-hidden shadow-[5px_5px_0_0_#F5B700]">
              <Image src={g.src} alt={g.alt} fill sizes="(max-width: 1024px) 45vw, 280px" className="object-cover" />
            </div>
            <figcaption className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#161616]/70 mt-2.5 text-center">
              {g.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Load your people once',
    body: 'Names and dates, typed in or imported from a spreadsheet. Birthdays, work anniversaries, client milestones, the holidays you care about. Five minutes, one time.',
  },
  {
    n: '02',
    title: 'Set a budget per person',
    body: 'Most teams pick $35 to $75. The budget is a hard cap: every send stays inside it, and when a cap is reached we pause and ask instead of billing you more.',
  },
  {
    n: '03',
    title: 'The parade runs itself',
    body: 'On every date that matters, a real cake, bouquet, board, or handwritten card goes out from a local shop. You get the delivery photo. They get the feeling that someone remembered.',
  },
];

export function HowItWorks() {
  return (
    <section className="border-y-2 border-[#161616] bg-white">
      <div className="max-w-6xl mx-auto px-5 py-14 md:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold text-center">
          [ How It Works ]
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-center tracking-tight mt-3">
          Set it once. Loved all year.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-[#FBF6EA] border-2 border-[#161616] rounded-2xl p-6 shadow-[4px_4px_0_0_#161616]">
              <span className="font-mono font-bold text-sm text-[#8f6600]">{s.n}</span>
              <h3 className="font-display font-black text-xl mt-2">{s.title}</h3>
              <p className="font-body text-sm text-[#161616]/70 mt-2 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocalMakers() {
  return (
    <section className="max-w-6xl mx-auto px-5 py-14 md:py-20">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div className="relative aspect-[4/5] max-w-md border-2 border-[#161616] rounded-xl overflow-hidden shadow-[6px_6px_0_0_#161616] rotate-[-1deg]">
          <Image
            src="/images/celebrate/baker.png"
            alt="A baker's flour-dusted hands tying twine around a white cake box"
            fill
            sizes="(max-width: 768px) 90vw, 440px"
            className="object-cover"
          />
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold">
            [ The Founding Route ]
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-black tracking-tight mt-3">
            Made down the street, not shipped from a shelf.
          </h2>
          <p className="font-body text-base text-[#161616]/70 mt-4 leading-relaxed">
            Celebrate opens in the Flathead Valley first: Kalispell, Whitefish, Columbia Falls, and Bigfork
            bakeries, florists, and makers, dispatched by us, delivered fresh. Every gift also puts money in a
            local shop&apos;s register, which is the kind of gifting worth automating.
          </p>
          <p className="font-body text-base text-[#161616]/70 mt-3 leading-relaxed">
            Own a bakery, flower shop, or board studio on the route?{' '}
            <Link href="/contact" className="font-bold text-[#1E50C8] underline underline-offset-4">
              Join as a founding maker
            </Link>{' '}
            and we bring you steady weekday orders with zero marketing spend.
          </p>
        </div>
      </div>
    </section>
  );
}

export function PricingStubs() {
  return (
    <section id="pricing" className="border-y-2 border-[#161616] bg-[#FFDD55]">
      <div className="max-w-6xl mx-auto px-5 py-14 md:py-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#161616] font-bold text-center">
          [ Admit Your Whole Team ]
        </p>
        <h2 className="font-display text-3xl md:text-5xl font-black text-center tracking-tight mt-3">
          Pricing rides a ticket stub.
        </h2>
        <p className="font-body text-base text-[#161616]/80 max-w-2xl mx-auto text-center mt-4">
          One flat monthly for the autopilot, plus gifts at local-shop prices (from ${celebrateUsd(celebrateGiftFloorCents)}),
          inside a budget you cap. No setup fee during the founding route. No free trials, no surprise bills, ever.
        </p>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mt-10">
          {celebrateTiers.map((t, i) => (
            <div
              key={t.slug}
              className={`bg-white border-2 border-[#161616] rounded-2xl p-6 shadow-[5px_5px_0_0_#161616] ${i % 2 ? 'rotate-1' : '-rotate-1'}`}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#1E50C8] font-bold">{t.chip}</p>
              <div className="flex items-baseline justify-between mt-2">
                <h3 className="font-display font-black text-2xl">{t.name}</h3>
                <p className="font-display font-black text-3xl text-[#C4160B]">
                  ${celebrateUsd(t.monthlyCents)}
                  <span className="font-body font-bold text-sm text-[#161616]/70">/mo</span>
                </p>
              </div>
              <p className="font-body text-sm text-[#161616]/70 mt-2">{t.pitch}</p>
              <ul className="mt-4 space-y-2">
                {t.includes.map((line) => (
                  <li key={line} className="font-body text-sm flex gap-2">
                    <span className="text-[#8f6600] font-bold" aria-hidden>+</span>
                    {line}
                  </li>
                ))}
              </ul>
              <a
                href="#parade"
                className="inline-block mt-5 bg-[#F5B700] text-[#161616] font-bold rounded-full px-6 py-3 border-2 border-[#161616] shadow-[3px_3px_0_0_#161616] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#161616] transition"
              >
                Join the waitlist
              </a>
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#161616]/70 text-center mt-8">
          Families: the family plan follows the founding route. Build your parade above and you are first in line.
        </p>
      </div>
    </section>
  );
}

export function CelebrateFaqSection() {
  return (
    <section className="max-w-3xl mx-auto px-5 py-14 md:py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#C4160B] font-bold text-center">
        [ Fair Questions ]
      </p>
      <h2 className="font-display text-3xl md:text-4xl font-black text-center tracking-tight mt-3 mb-8">
        Everything an office manager asks.
      </h2>
      <div className="space-y-4">
        {celebrateFaq.map((f) => (
          <details key={f.q} className="group bg-white border-2 border-[#161616] rounded-xl shadow-[3px_3px_0_0_#161616]">
            <summary className="cursor-pointer list-none p-4 md:p-5 font-display font-black text-base md:text-lg flex justify-between items-center gap-4">
              {f.q}
              <span className="font-mono text-[#8f6600] group-open:rotate-45 transition-transform" aria-hidden>+</span>
            </summary>
            <p className="font-body text-sm text-[#161616]/70 leading-relaxed px-4 md:px-5 pb-5 -mt-1">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="relative border-t-2 border-[#161616] bg-[#F5B700] halftone-bg overflow-hidden">
      <ConfettiField count={22} seed={19} />
      <div className="relative max-w-4xl mx-auto px-5 py-16 md:py-24 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-black tracking-tight">
          Someone you love has a birthday coming.
        </h2>
        <p className="font-body text-base text-[#161616]/80 max-w-xl mx-auto mt-4">
          Put the whole year on the route in five minutes. If you run a team, book a pilot and we will run your
          next 60 days of celebrations for you, delivery photos included.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <a
            href="#parade"
            className="bg-[#161616] text-[#FFDD55] font-bold rounded-full px-8 py-4 border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(0,0,0,0.25)] hover:translate-y-[1px] transition"
          >
            Roll your year&apos;s parade
          </a>
          <Link
            href="/book"
            className="bg-white text-[#161616] font-bold rounded-full px-8 py-4 border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:translate-y-[1px] hover:shadow-[3px_3px_0_0_#161616] transition"
          >
            Book a corporate pilot
          </Link>
        </div>
      </div>
    </section>
  );
}
