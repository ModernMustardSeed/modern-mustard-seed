import RingMeNow from '@/components/RingMeNow';
import BookCallLink from '@/components/conversion/BookCallLink';

/**
 * THE CLOSER ON EVERY SEO PAGE. The pages built to rank (/ai-receptionist-cost,
 * /compare, /best, /voice-agents/[trade], /montana/[city]) bring in buyers who
 * are mid-decision. A generic "Book a Call" asked them to leave and schedule.
 * The ring box lets them hear the product on their own phone in ten seconds,
 * and the number they type is the lead.
 *
 * `source` names the page and the placement ("seo:/ai-receptionist-cost:after-answer").
 * It rides into leads.source through /api/ring-me, into Mr. Mustard's briefing,
 * and into the Vercel Analytics events, so every lead says which page made it.
 *
 * `variant="book"` is for the website and build pages, where a phone demo of a
 * voice agent would answer the wrong question: it shows a booking prompt worded
 * to the page instead.
 */
export default function HearItAnswers({
  source,
  heading,
  lede,
  variant = 'ring',
  bookLabel = 'Book a Discovery Call',
}: {
  source: string;
  heading: string;
  lede: string;
  variant?: 'ring' | 'book';
  bookLabel?: string;
}) {
  return (
    <section className="relative max-w-6xl mx-auto px-6 md:px-8 py-12" aria-label={heading}>
      <div className={`grid items-center gap-8 rounded-3xl bg-[#fdf3d6] px-5 py-8 md:p-10 ${variant === 'ring' ? 'md:grid-cols-[1fr_auto]' : 'border-[3px] border-[#0b3b44] shadow-[8px_8px_0_0_#0b3b44]'}`}>
        <div className="max-w-xl">
          <span className="mb-3 block font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-[#0a7c78]">
            {variant === 'ring' ? 'Hear it answer your calls' : 'Talk it through'}
          </span>
          <h2 className="font-display text-3xl font-black leading-[1.08] tracking-tight text-[#0b3b44] md:text-4xl">
            {heading}
          </h2>
          <p className="mt-3 font-body text-base leading-relaxed text-[#3a3733] md:text-lg">{lede}</p>
          {variant === 'book' && (
            <BookCallLink
              source={source}
              className="mt-6 inline-flex h-[52px] items-center rounded-xl border-2 border-[#0b3b44] bg-[#f5b700] px-6 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0b3b44] shadow-[4px_4px_0_0_#0b3b44] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b3b44]"
            >
              {bookLabel}
            </BookCallLink>
          )}
        </div>
        {variant === 'ring' && <RingMeNow source={source} className="md:w-[30rem]" />}
      </div>
    </section>
  );
}
