import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { HUCK, FOUNDING } from '@/data/hatchery';

export const metadata = buildMetadata({
  title: 'Your Founding Egg is claimed — The Mustard Hatchery',
  description: 'Thank you. Your business is about to be born.',
  noindex: true,
});

/**
 * Stripe success destination for a claimed Founding Egg. Deliberately calm and
 * ceremonial: the money is banked, the fulfillment email is already sent by the
 * webhook, and this page just tells the founder what happens next.
 */
export default function ClaimedPage() {
  return (
    <div className="min-h-screen bg-[#0d0a05] text-[#FBF6EA] flex items-center justify-center px-6 py-16" style={{ backgroundImage: 'radial-gradient(rgba(245,183,0,.10) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
      <div className="max-w-xl text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🥚</div>
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#F5B700] font-bold">The Mustard Hatchery</p>
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-bold leading-[1.03]">
          Your egg is claimed.
        </h1>
        <p className="mt-5 text-lg text-[#FBF6EA]/85" style={{ fontFamily: 'var(--font-serif, Cormorant Garamond, serif)' }}>
          Your business is about to be born. Check your inbox for a note from Sarah with exactly what happens next. Within one business day she reaches out to learn your shop, so your mascot grows out of your real story.
        </p>

        <div className="mt-8 text-left rounded-2xl border-2 border-[#F5B700]/40 bg-[#FBF6EA]/5 p-6 space-y-4">
          {[
            ['You approve the direction', 'Nothing is drawn until you love it.'],
            ['We hatch your mascot', 'Bible, model sheet, hatching film, hand-numbered certificate, and a live phone line.'],
            ['Birth Day', 'The egg cracks in public and your mascot answers its own phone for everyone you invite.'],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F5B700] text-[#161616] border-2 border-[#FBF6EA]/20 grid place-items-center font-mono font-bold text-sm">{i + 1}</span>
              <div>
                <p className="font-display text-lg font-bold">{t}</p>
                <p className="text-[#FBF6EA]/65 text-sm">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-7 text-[#FBF6EA]/75">
          Want to feel it now? Call Huck, our pilot mascot, at{' '}
          <a href={HUCK.phoneHref} className="font-bold text-[#F5B700] underline underline-offset-4">{HUCK.phone}</a>.
        </p>

        <p className="mt-6 text-xs text-[#FBF6EA]/50">
          Ignite-or-refund still stands: if fewer than {FOUNDING.igniteFloor} founding eggs are claimed by {FOUNDING.closesLabel}, your payment is refunded in full, automatically.
        </p>

        <div className="mt-8">
          <Link href="/hatchery" className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F5B700]/80 hover:text-[#F5B700]">
            &larr; Back to the Hatchery
          </Link>
        </div>
      </div>
    </div>
  );
}
