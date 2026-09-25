import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { HUCK } from '@/data/hatchery';

export const metadata = buildMetadata({
  title: 'Your mascot is on its way | The Mustard Hatchery',
  description: 'Thank you. Your business is about to be born.',
  noindex: true,
});

/**
 * Stripe success destination for a claimed hatch. Deliberately calm and
 * ceremonial: the money is banked, the fulfillment email is already sent by the
 * webhook, and this page just tells the buyer what happens next.
 */
export default function ClaimedPage() {
  return (
    <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] flex items-center justify-center px-6 py-16 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 halftone-bg opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" aria-hidden="true" />
      <div className="relative max-w-xl text-center">
        <div className="text-5xl mb-4" aria-hidden="true">🥚</div>
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#B92417] font-bold">The Mustard Hatchery</p>
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.03]">
          Your egg is claimed.
        </h1>
        <p className="mt-5 text-lg font-body leading-relaxed text-[#3a3733]">
          Your business is about to be born. Check your inbox for a note from Sarah with exactly what happens next. Within one business day she reaches out to learn your shop, so your mascot grows out of your real story.
        </p>

        <div className="relative mt-8 text-left rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] shadow-[6px_6px_0_0_#F5B700] p-6 space-y-4">
          {[
            ['You approve the direction', 'Nothing is drawn until you love it.'],
            ['We hatch your mascot', 'Storybook, model sheet, hatching film, hand-numbered certificate, and a live phone line.'],
            ['Birth Day', 'The egg cracks in public and your mascot answers its own phone for everyone you invite.'],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F5B700] text-[#161616] border-2 border-[#FBF6EA] grid place-items-center font-mono font-bold text-sm">{i + 1}</span>
              <div>
                <p className="font-display text-lg font-bold">{t}</p>
                <p className="text-[#FBF6EA]/75 text-sm">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-7 text-[#3a3733]">
          Want to feel it now? Call Huck, our pilot mascot, at{' '}
          <a href={HUCK.phoneHref} className="font-bold text-[#B92417] underline underline-offset-4 hover:text-[#E0301E]">{HUCK.phone}</a>.
        </p>

        <p className="mt-6 text-xs text-[#161616]/60">
          Nothing is drawn until you approve the direction. You are in good hands.
        </p>

        <div className="mt-8">
          <Link href="/hatchery" className="inline-block px-6 py-3 rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all font-mono text-[11px] uppercase tracking-[0.3em] font-bold text-[#161616]">
            &larr; Back to the Hatchery
          </Link>
        </div>
      </div>
    </div>
  );
}
