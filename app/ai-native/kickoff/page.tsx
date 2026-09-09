import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata } from '@/lib/seo';
import { AI_NATIVE } from '@/data/ai-native';

export const metadata = buildMetadata({
  title: 'Booked. The map starts now',
  description: 'Order confirmed. Here is exactly what happens between now and your team running it.',
  path: '/ai-native/kickoff',
  noindex: true,
});

export default function AiNativeKickoffPage() {
  const steps = [
    {
      n: '1',
      title: 'The kickoff, within one business day',
      body: 'Sarah emails you today or tomorrow to set the kickoff: sixty minutes with you and whoever runs the day to day. Bring nothing. We come with the questions.',
    },
    {
      n: '2',
      title: 'The map, in two weeks',
      body: `Every workflow written down, scored and ranked, with the first five named and the tools priced. THE AI MAP is ${AI_NATIVE.mapDelivery}. You read it before anything is built or bought.`,
    },
    {
      n: '3',
      title: 'The build and the sessions',
      body: `On AI NATIVE the first five go live across eight weeks, with six working sessions on your team's real work, ${AI_NATIVE.buildDelivery}. On the last day every admin seat is in your name. THE TENDING keeps a coach in the room month to month.`,
    },
  ];

  return (
    <div className="bg-[#FBF6EA] text-[#161616] min-h-screen">
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-2xl mx-auto px-5 pt-28 pb-16 md:py-24 text-center">
          <Image
            src="/brand/mascot.png"
            alt="Mr. Mustard"
            width={84}
            height={84}
            className="mx-auto rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[4px_4px_0_0_#161616]"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mt-6 mb-3">[ BOOKED ]</p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">Your company is going native.</h1>
          <p className="font-body text-[#161616]/70 mt-4 max-w-md mx-auto leading-relaxed">
            Order confirmed, the Stripe receipt is on its way, and a note from Sarah lands in your inbox today. Here is what happens next.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-5 py-14">
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] flex gap-5">
              <span className="font-display italic text-3xl font-black text-[#F5B700] leading-none" aria-hidden="true">
                {s.n}
              </span>
              <div>
                <h2 className="font-display text-lg font-black leading-tight">{s.title}</h2>
                <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-1.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-6 mt-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mb-2">The one thing that speeds it up</p>
          <p className="font-body text-sm leading-relaxed">
            Reply to Sarah&apos;s email with two kickoff times that work and the name of the person who runs your day to day. The map starts the moment the kickoff is on the calendar.
          </p>
        </div>

        <p className="text-center mt-10">
          <Link href="/" className="font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
            Back to Modern Mustard Seed →
          </Link>
        </p>
      </section>
    </div>
  );
}
