import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  Compass,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  COURSE_WEEKS,
  INCLUDED_ASSETS,
  SEED_FAQ,
  SEED_TO_SYSTEM,
} from '@/data/seed-to-system';
import { buildMetadata } from '@/lib/seo';
import EnrollButton from '@/components/seed-to-system/EnrollButton';

export const metadata = buildMetadata({
  title: 'SEED TO SYSTEM. The Six-Week One-Person Business Lab',
  description:
    'Turn one useful idea into a clear offer, working sales engine, and real customer conversations in six weeks with Sarah Scarano.',
  path: '/seed-to-system',
});

export default function SeedToSystemPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SEED_FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <main className="overflow-hidden bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="relative min-h-[90svh] border-b-2 border-[#161616]">
        <Image
          src="/home/studio-bench.jpg"
          alt="A working studio bench where one useful idea becomes a real business system"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,22,22,.94)_0%,rgba(22,22,22,.8)_52%,rgba(22,22,22,.28)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[90svh] max-w-7xl flex-col justify-end px-6 pb-12 pt-32 md:px-10 md:pb-16 lg:px-16">
          <div className="max-w-4xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.36em] text-[#F5B700]">
              Founding cohort · {SEED_TO_SYSTEM.seats} working seats
            </p>
            <h1 className="mt-5 font-display text-6xl font-black leading-[0.9] text-white md:text-8xl lg:text-9xl">
              SEED TO
              <span className="block text-[#F5B700]">SYSTEM</span>
            </h1>
            <p className="mt-6 max-w-2xl font-display text-2xl font-bold leading-tight text-white md:text-3xl">
              {SEED_TO_SYSTEM.descriptor}
            </p>
            <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-white/80 md:text-lg">
              {SEED_TO_SYSTEM.promise}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/one-person-business#register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[#161616] bg-[#F5B700] px-7 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#161616] shadow-[5px_5px_0_0_#FFFFFF] transition-transform hover:-translate-y-0.5"
              >
                Join the founding list
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#curriculum"
                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-white bg-[#161616]/65 px-7 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#161616]"
              >
                See the six weeks
              </a>
            </div>
          </div>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-3 border-t border-white/25 pt-5 text-white/75 md:grid-cols-4">
            <span className="inline-flex items-center gap-2 font-body text-xs md:text-sm">
              <Clock3 className="h-4 w-4 shrink-0 text-[#F5B700]" aria-hidden="true" />
              Six live weeks
            </span>
            <span className="inline-flex items-center gap-2 font-body text-xs md:text-sm">
              <Users className="h-4 w-4 shrink-0 text-[#F5B700]" aria-hidden="true" />
              {SEED_TO_SYSTEM.seats} seats
            </span>
            <span className="inline-flex items-center gap-2 font-body text-xs md:text-sm">
              <CircleDollarSign className="h-4 w-4 shrink-0 text-[#F5B700]" aria-hidden="true" />
              ${SEED_TO_SYSTEM.foundingPrice}
            </span>
            <span className="inline-flex items-center gap-2 font-body text-xs md:text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#F5B700]" aria-hidden="true" />
              Build It guarantee
            </span>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
                Not another content library
              </p>
              <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
                The business leaves the notes app.
              </h2>
            </div>
            <div>
              <p className="font-display text-2xl font-bold leading-snug md:text-3xl">
                You do not need more ideas. You need one honest offer, one working path to a buyer, and enough
                courage to let the market answer.
              </p>
              <p className="mt-5 font-body text-base leading-relaxed text-[#5C554A] md:text-lg">
                Your existing experience is the seed. We choose the right problem, package the result, make the
                smallest honest proof, wire the path to purchase, and put it in front of real people.
              </p>
            </div>
          </div>
          <div className="mt-14 grid gap-8 border-y-2 border-[#161616] py-9 md:grid-cols-3">
            <div>
              <Compass className="h-6 w-6 text-[#B62618]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-black">One finish line</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-[#5C554A]">
                A launchable offer and business engine, not a pile of unfinished modules.
              </p>
            </div>
            <div>
              <Sparkles className="h-6 w-6 text-[#1E50C8]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-black">AI in its proper place</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-[#5C554A]">
                The machine carries the repeatable middle. Your judgment, taste, and relationships stay human.
              </p>
            </div>
            <div>
              <Users className="h-6 w-6 text-[#167D56]" aria-hidden="true" />
              <h3 className="mt-4 font-display text-xl font-black">The market is in the room</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-[#5C554A]">
                Every week includes real conversations, demonstrations, invitations, or offers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="curriculum" className="scroll-mt-24 border-b-2 border-[#161616] bg-[#F5B700] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#161616]">
            Seven rooms. Six core missions.
          </p>
          <h2 className="mt-4 max-w-4xl font-display text-4xl font-black leading-tight md:text-6xl">
            From useful idea to open doors.
          </h2>
          <div className="mt-12 divide-y-2 divide-[#161616] border-y-2 border-[#161616]">
            {COURSE_WEEKS.map((week) => (
              <div
                key={week.code}
                className="grid gap-3 py-7 md:grid-cols-[80px_240px_1fr] md:items-start md:gap-8"
              >
                <span className="font-mono text-sm font-bold text-[#161616]">{week.code}</span>
                <div>
                  <h3 className="font-display text-2xl font-black">{week.title}</h3>
                  <p className="mt-2 font-body text-sm font-bold leading-relaxed text-[#161616]">{week.result}</p>
                </div>
                <p className="font-body leading-relaxed text-[#3A3733]">{week.details}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#163B68] py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-10 lg:px-16">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#F5B700]">
              The programs become tools
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
              Everything included points at the same finish line.
            </h2>
            <p className="mt-5 font-body text-lg leading-relaxed text-white/75">
              No filler bonuses. These are the Modern Mustard Seed programs and working assets used at the moment
              they shorten the path.
            </p>
          </div>
          <div className="mt-12 grid gap-x-12 gap-y-0 border-y border-white/30 md:grid-cols-2">
            {INCLUDED_ASSETS.map((asset) => (
              <div key={asset.title} className="flex gap-3 border-b border-white/20 py-6">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B700]" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-xl font-black">{asset.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-white/70">{asset.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 font-body text-sm text-white/60">
            The included digital programs currently sell for $1,055 before live coaching and reviews.
          </p>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:px-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-16">
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-[#161616]">
            <Image
              src="/work-shots/modern-mustard-seed.jpg"
              alt="Real Modern Mustard Seed products and systems shipped by Sarah"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
              Built from receipts
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
              Sarah teaches what she ships.
            </h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-[#5C554A]">
              Modern Mustard Seed has built stores, AI products, voice agents, command centers, lead engines, and
              client systems across dozens of industries. Cross + Covenant went from a sketch to a live storefront
              with a tiny human team.
            </p>
            <p className="mt-5 font-display text-2xl font-bold leading-snug">
              This is not a theory about what one person might build. It is the operating method behind what Sarah
              already has.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-[#FBF6EA] py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
                Founding cohort
              </p>
              <h2 className="mt-4 font-display text-5xl font-black leading-tight md:text-7xl">
                ${SEED_TO_SYSTEM.foundingPrice}
              </h2>
              <p className="mt-2 font-display text-xl font-bold">or {SEED_TO_SYSTEM.paymentPlan}</p>
              <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-[#5C554A]">
                The public price becomes ${SEED_TO_SYSTEM.futurePrice.toLocaleString()} after the founding room.
                Founders receive the lower price because their work and feedback help sharpen the final lab.
              </p>
              <div className="mt-8 border-l-4 border-[#167D56] pl-5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#167D56]" aria-hidden="true" />
                  <h3 className="font-display text-xl font-black">Build It Or Keep Building</h3>
                </div>
                <p className="mt-2 font-body leading-relaxed text-[#3A3733]">{SEED_TO_SYSTEM.guarantee}</p>
              </div>
            </div>
            <div className="rounded-lg border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616]">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#B62618]">
                Take a founding seat
              </p>
              <h3 className="mt-3 font-display text-3xl font-black">Build the business while the room is small.</h3>
              <p className="mt-4 font-body text-sm leading-relaxed text-[#5C554A]">
                Secure pay-in-full enrollment through Stripe. Sarah will follow with the intake, live calendar, and first mission.
              </p>
              <EnrollButton />
              <a
                href="mailto:sarah@modernmustardseed.com?subject=SEED%20TO%20SYSTEM%203-pay%20plan"
                className="mt-4 block text-center font-body text-xs font-bold text-[#163B68] underline underline-offset-4"
              >
                Need the 3-pay plan? Ask Sarah.
              </a>
              <div className="my-6 border-t border-[#161616]/20" />
              <p className="font-body text-sm leading-relaxed text-[#5C554A]">
                Want to see the five-job engine first?
              </p>
              <Link
                href="/one-person-business#register"
                className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-[#161616] bg-white px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#161616] transition-colors hover:bg-[#FBF6EA]"
              >
                Save my free seat
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="mt-3 text-center font-body text-[11px] text-[#5C554A]">
                No card. No countdown. Bring the idea.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-[#161616] bg-white py-16 md:py-24">
        <div className="mx-auto max-w-5xl px-6 md:px-10">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.34em] text-[#B62618]">
            Straight answers
          </p>
          <h2 className="mt-4 font-display text-4xl font-black leading-tight md:text-6xl">
            Before you take a seat.
          </h2>
          <div className="mt-10 divide-y-2 divide-[#161616] border-y-2 border-[#161616]">
            {SEED_FAQ.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-5 font-display text-xl font-black">
                  {item.q}
                  <span className="font-mono text-2xl font-normal group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-4 max-w-3xl pr-8 font-body leading-relaxed text-[#5C554A]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
