import Link from 'next/link';
import { HUNDREDFOLD, money } from '@/lib/hundredfold';

/**
 * THE FLAGSHIP BAND on the homepage.
 *
 * Three doors, ordered by how much they cost the visitor rather than by how
 * much we want them: watch, talk, or just hand over a URL. Sarah, 2026-08-07:
 * "they can listen to the webinar from there or they can go straight to
 * interview, orrrrr they can simply put their website in."
 *
 * The interview is the middle door and the biggest one on purpose. It is the
 * highest-converting thing this business owns, and the one nobody else has.
 * The roadmap door is honest about being the lesser version, because pretending
 * otherwise would put people through the weaker path and cost them a worse plan.
 *
 * Ink slab against the cream journey above it, so the flagship reads as a
 * different kind of thing rather than one more sign on the road.
 */
export default function HundredfoldBand() {
  return (
    <section className="relative border-y-2 border-[#161616] bg-[#161616] overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-[0.07] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 md:px-8 py-20 md:py-28">
        <div className="text-center max-w-3xl mx-auto">
          <p className="font-mono font-bold text-[10px] tracking-[0.4em] uppercase text-[#F5B700]">
            The flagship // Free interview today
          </p>
          <h2 className="mt-6 font-display text-4xl md:text-6xl font-black tracking-tight leading-[0.98] text-[#FBF6EA]">
            HUNDRED
            <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #FBF6EA' }}>
              FOLD
            </span>
          </h2>
          <p className="mt-5 font-display italic font-bold text-xl md:text-2xl text-[#FBF6EA] leading-snug">
            A coach interviews you. Then we build the machine that runs the plan.
          </p>
          <p className="mt-4 text-[#FBF6EA]/75 font-body text-base md:text-lg leading-relaxed">
            Mr. Mustard asks you about thirty questions about your business, most people say nobody has
            ever made them say those numbers out loud, and everything after it gets built from your own
            answers. It costs nothing and you can do it right now.
          </p>
        </div>

        {/* Three doors */}
        <div className="mt-14 grid md:grid-cols-3 gap-4 md:gap-5 items-stretch">
          {/* 1. Watch */}
          <Link
            href="/hundredfold/webinar"
            className="group flex flex-col rounded-2xl border-2 border-[#FBF6EA]/25 bg-[#FBF6EA]/[0.04] p-7 hover:border-[#FBF6EA]/70 hover:bg-[#FBF6EA]/[0.08] transition-all"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#FBF6EA]/50">
              Ten minutes
            </span>
            <h3 className="mt-3 font-display text-2xl font-black text-[#FBF6EA] tracking-tight leading-tight">
              Watch how it works
            </h3>
            <p className="mt-3 text-[#FBF6EA]/70 font-body text-sm leading-relaxed flex-1">
              The whole thing, start to finish, on a real business. Starts the second you click. Nothing to
              schedule and nobody waiting on the other end.
            </p>
            <span className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] font-bold text-[#FBF6EA]/60 group-hover:text-[#F5B700] transition-colors">
              Play it now &rarr;
            </span>
          </Link>

          {/* 2. The interview. The big one. */}
          <Link
            href="/hundredfold#interview"
            className="group flex flex-col rounded-2xl border-2 border-[#F5B700] bg-[#F5B700] p-7 shadow-[6px_6px_0_0_#FBF6EA] hover:-translate-y-1 transition-all md:-mt-4 md:mb-4"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#161616]/60">
              Twenty minutes · Free
            </span>
            <h3 className="mt-3 font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight leading-tight">
              Get interviewed
            </h3>
            <p className="mt-3 text-[#161616]/80 font-body text-sm leading-relaxed flex-1">
              Talk to Mr. Mustard out loud, or type. He pushes when an answer is soft. You walk away with a
              plan built from your real numbers, whether or not you ever pay us a cent.
            </p>
            <span className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] font-bold text-[#161616] group-hover:tracking-[0.3em] transition-all">
              Start the interview &rarr;
            </span>
          </Link>

          {/* 3. Just the URL */}
          <Link
            href="/scaling-roadmap"
            className="group flex flex-col rounded-2xl border-2 border-[#FBF6EA]/25 bg-[#FBF6EA]/[0.04] p-7 hover:border-[#FBF6EA]/70 hover:bg-[#FBF6EA]/[0.08] transition-all"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#FBF6EA]/50">
              Ninety seconds
            </span>
            <h3 className="mt-3 font-display text-2xl font-black text-[#FBF6EA] tracking-tight leading-tight">
              Just hand us your website
            </h3>
            <p className="mt-3 text-[#FBF6EA]/70 font-body text-sm leading-relaxed flex-1">
              We read your site and write you a scaling roadmap. Free. Honestly the thinner version, because
              your homepage does not know your margin, but it is a real plan and it is yours.
            </p>
            <span className="mt-6 font-mono text-[10px] uppercase tracking-[0.25em] font-bold text-[#FBF6EA]/60 group-hover:text-[#F5B700] transition-colors">
              Build my roadmap &rarr;
            </span>
          </Link>
        </div>

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-[#FBF6EA]/40">
          The program is {money(HUNDREDFOLD.setupCents)} to start, then {money(HUNDREDFOLD.monthlyCents)} a
          month · Everything above is free
        </p>
      </div>
    </section>
  );
}
