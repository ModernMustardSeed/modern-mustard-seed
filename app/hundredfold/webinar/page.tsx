import Link from 'next/link';
import type { Metadata } from 'next';
import { FILMS } from '@/lib/films';
import { buildMetadata } from '@/lib/seo';
import { HUNDREDFOLD, money } from '@/lib/hundredfold';

export const metadata: Metadata = buildMetadata({
  title: 'Watch: How To Scale A Business That Is Capped By You',
  description:
    'The whole HUNDREDFOLD method on one real business, start to finish. Starts the second you press play. No registration, no scheduled time, no sales call at the end.',
  path: '/hundredfold/webinar',
});

/**
 * THE ON-DEMAND WEBINAR.
 *
 * Sarah, 2026-08-07: "make it a webinar that they can do right then, not a
 * schedule, so it is a personal thing that makes them want to do the interview
 * and buy."
 *
 * So there is no registration wall and no countdown to Thursday at 2pm. The
 * whole point of a scheduled webinar is manufactured scarcity, and this funnel
 * already has something better: the interview, which is personal, immediate, and
 * the thing that actually sells. The film's only job is to get them into it.
 *
 * The CTA sits under the player rather than at the end, because a viewer who is
 * sold at minute four should not have to sit through minute nine to act.
 */

const CHAPTERS = [
  { t: 'The lie you have been told', d: 'Why "get more leads" is the most expensive bad advice in small business.' },
  { t: 'The one constraint', d: 'Six things cap a business. Only one is capping yours. How to tell which.' },
  { t: 'The interview, live', d: 'A real med spa owner gets asked the thirty questions. Watch her answers change the plan.' },
  { t: 'The plan writes itself', d: 'Her constraint, her rebuilt offer, her four gates, generated in front of you.' },
  { t: 'The part nobody does', d: 'Why plans sit in folders, and what has to exist for this one not to.' },
];

export default function HundredfoldWebinarPage() {
  // ⚠️ A declaration, not a filesystem probe. See lib/films.ts: `existsSync`
  // on public/ returns false on any render that happens at request time, which
  // is what silently blanked the hero film on /hundredfold.
  const { mp4, poster, shipped: hasFilm } = FILMS.webinar;

  return (
    <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-40 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] halftone-bg opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden="true" />
      <div className="relative max-w-5xl mx-auto px-6 md:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="font-mono font-bold text-[10px] tracking-[0.4em] uppercase text-[#B92417]">
            Starts when you press play // No registration
          </p>
          <h1 className="mt-6 font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.0]">
            How to scale a business that is{' '}
            <span className="italic text-[#B92417]">
              capped by you
            </span>
          </h1>
          <p className="mt-5 text-[#3a3733] font-body text-base md:text-lg leading-relaxed">
            The whole method on one real business, start to finish. Nothing to schedule, nobody waiting on
            the other end, and no sales call at the end of it.
          </p>
        </div>
      </div>

      {/* The screening room: an ink band holding the player and the ask */}
      <section className="relative mt-14 bg-[#161616] text-[#FBF6EA] border-y-2 border-[#161616] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 halftone-ink" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8 py-14 md:py-16">
          <div className="border-2 border-[#FBF6EA] rounded-2xl overflow-hidden shadow-[8px_8px_0_0_#F5B700] bg-black">
            {hasFilm ? (
              <video controls playsInline preload="metadata" poster={poster} className="w-full h-auto block">
                <source src={mp4} type="video/mp4" />
              </video>
            ) : (
              <div className="p-10 md:p-16 text-center bg-[#FBF6EA] text-[#161616]">
                <p className="font-display italic font-black text-2xl md:text-3xl text-[#161616] leading-snug max-w-2xl mx-auto">
                  The film is in the edit. The interview is not.
                </p>
                <p className="mt-4 text-[#3a3733] font-body text-base max-w-xl mx-auto leading-relaxed">
                  You can skip the watching entirely and just be interviewed. It takes twenty minutes, it costs
                  nothing, and you end up with the plan the film is about.
                </p>
              </div>
            )}
          </div>

          {/* The ask, under the player, not at the end */}
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/hundredfold#interview"
              className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA] hover:-translate-y-0.5 transition-all text-center"
            >
              Get interviewed, free
            </Link>
            <Link
              href="/hundredfold#join"
              className="px-8 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#FBF6EA] rounded-full border-2 border-[#FBF6EA] shadow-[4px_4px_0_0_#E0301E] hover:-translate-y-0.5 transition-all text-center"
            >
              Join HUNDREDFOLD
            </Link>
          </div>
          <p className="mt-5 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-[#FBF6EA]/70">
            {money(HUNDREDFOLD.setupCents)} to start, then {money(HUNDREDFOLD.monthlyCents)} a month · The
            interview is free either way
          </p>
        </div>
      </section>

      <div className="relative max-w-5xl mx-auto px-6 md:px-8 pt-16 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {CHAPTERS.map((c, i) => (
            <div key={c.t} className="pop-card p-5">
              <span className="font-display text-3xl font-black text-[#B92417] leading-none">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-3 font-display font-black text-base text-[#161616] tracking-tight leading-snug">{c.t}</h2>
              <p className="mt-2 text-[#3a3733] font-body text-xs leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
