'use client';

/**
 * WHAT REAL PEOPLE SAID, ON A PLATFORM WE DO NOT CONTROL.
 *
 * Sarah 2026-08-08: *"add my google reviews to my landing page toward the
 * bottom."* Parked one chapter before the four doors on purpose: proof reads
 * hardest when it sits directly in front of the ask, and the doors are the ask.
 *
 * The whole persuasive weight here is that Google hosts it, not us. So the card
 * is styled as a lifted receipt off someone else's site (G mark, real stars,
 * real name, real month) and both buttons leave for Google. Never dress up a
 * testimonial we host to look like this.
 *
 * ⚠️ NO Review/AggregateRating JSON-LD. Explained at length in
 * data/google-reviews.ts. Self-serving review markup risks a sitewide manual
 * action; the rating lives on the profile where Google sources it itself.
 *
 * Count is spoken plainly. One detailed five-star review from a named customer
 * is credible; a vague "loved by clients everywhere" over the top of one review
 * is the thing that is not.
 */

import { track } from '@vercel/analytics';
import { Anton, Caveat } from 'next/font/google';
import { GOOGLE_PROFILE, GOOGLE_REVIEWS } from '@/data/google-reviews';

const anton = Anton({ weight: '400', subsets: ['latin'], display: 'swap' });
const caveat = Caveat({ weight: '600', subsets: ['latin'], display: 'swap' });

/** Google's own mark, so the source is legible at a glance. */
function GoogleMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.4z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.4v5.7C8 41.2 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.7 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.4A22 22 0 0 0 2 24c0 3.6.9 6.9 2.4 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8 6.8 4.4 14.1l7.3 5.7c1.7-5.2 6.6-9.1 12.3-9.1z" />
    </svg>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex items-center gap-0.5" role="img" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-5 w-5" fill={i < n ? '#F5B700' : '#161616'} aria-hidden="true">
          <path
            d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z"
            stroke="#161616"
            strokeWidth="1.4"
            strokeLinejoin="round"
            opacity={i < n ? 1 : 0.15}
          />
        </svg>
      ))}
    </span>
  );
}

export default function GoogleReviews() {
  if (!GOOGLE_REVIEWS.length) return null;
  const single = GOOGLE_REVIEWS.length === 1;

  return (
    <section
      id="tour-reviews"
      data-journey-chapter="The Word Around Town"
      data-mile="MI 94"
      className="relative border-y-2 border-[#161616] bg-[#F5F0E8] py-24 md:py-28"
    >
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 border-2 border-[#161616] bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8f6600] shadow-[3px_3px_0_0_#161616]">
            <GoogleMark className="h-3.5 w-3.5" />
            MI 94 · The Word Around Town
          </span>
          <h2
            className={`${anton.className} mt-5 uppercase leading-[0.95] text-[#161616]`}
            style={{ fontSize: 'clamp(38px,5.4vw,78px)' }}
          >
            Straight From
            <br />
            Google
          </h2>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className={`${anton.className} text-4xl leading-none text-[#161616]`}>{GOOGLE_PROFILE.rating}</span>
            <Stars n={5} />
            <span className="font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">
              {GOOGLE_PROFILE.count} {GOOGLE_PROFILE.count === 1 ? 'review' : 'reviews'} on Google
            </span>
          </div>
        </div>

        <div className={`mt-12 grid gap-6 ${single ? 'mx-auto max-w-2xl' : 'md:grid-cols-2'}`}>
          {GOOGLE_REVIEWS.map((r, i) => (
            <figure
              key={r.name + r.when}
              className={`relative flex flex-col border-2 border-[#161616] bg-white p-7 shadow-[6px_6px_0_0_#161616] ${
                i % 2 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]'
              }`}
            >
              <span className="absolute -top-3.5 right-6 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#161616] bg-white shadow-[2px_2px_0_0_#161616]">
                <GoogleMark className="h-3.5 w-3.5" />
              </span>
              <Stars n={r.stars} />
              <blockquote className="mt-4 flex-1 font-body text-[17px] leading-relaxed text-[#161616]/90 md:text-lg">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-5 flex items-baseline gap-3 border-t-2 border-dashed border-[#161616]/20 pt-4">
                <span className="font-display text-lg font-extrabold text-[#161616]">{r.name}</span>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#161616]/50">{r.when}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-11 flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={GOOGLE_PROFILE.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('google_reviews', { action: 'read' })}
              className="inline-flex items-center gap-2 border-2 border-[#161616] bg-white px-5 py-3 font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#161616]"
            >
              <GoogleMark className="h-4 w-4" />
              {single ? 'Read It On Google' : 'Read Them On Google'}
            </a>
            <a
              href={GOOGLE_PROFILE.writeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('google_reviews', { action: 'write' })}
              className="inline-flex items-center gap-2 border-2 border-[#161616] bg-[#F5B700] px-5 py-3 font-bold text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#161616]"
            >
              Worked With Us? Leave One
            </a>
          </div>
          {/* The soft sell for the section above it: this is the same review
              machine we install for clients, pointed at ourselves. */}
          <p className={`${caveat.className} text-center text-2xl text-[#161616]/75`}>
            the same review system we set up for you, running on us
          </p>
        </div>
      </div>
    </section>
  );
}
