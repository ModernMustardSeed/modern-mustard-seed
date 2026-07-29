import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata } from '@/lib/seo';
import { SIDEKICK } from '@/data/sidekick';

export const metadata = buildMetadata({
  title: 'Your Sidekick got the job',
  description: 'Order confirmed. Here is exactly what happens before he goes live on your phones.',
  path: '/sidekick/welcome',
  noindex: true,
});

export default function SidekickWelcomePage() {
  const steps = [
    {
      n: '1',
      title: 'Sarah emails you within one business day',
      body: 'She confirms everything your Sidekick learned in the forge and how you want the line handled: a new local number to publish, or quiet forwarding from your existing one.',
    },
    {
      n: '2',
      title: 'Hand-tuning and drills',
      body: 'Your call flows, your booking setup, your edge cases. He gets rehearsed on real scenarios before he ever picks up for a customer.',
    },
    {
      n: '3',
      title: 'Live within 7 days',
      body: 'He starts answering around the clock. Every call is summarized to your inbox, urgent ones flagged, and your minutes are hard-capped so there is never a surprise bill.',
    },
  ];

  return (
    <div className="bg-[#FBF6EA] text-[#161616] min-h-screen">
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-2xl mx-auto px-5 py-16 md:py-24 text-center">
          <Image
            src="/brand/mascot.png"
            alt="Mr. Mustard"
            width={84}
            height={84}
            className="mx-auto rounded-full border-2 border-[#161616] bg-[#F5B700] shadow-[4px_4px_0_0_#161616]"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mt-6 mb-3">[ SIDEKICK: HIRED ]</p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">
            He got the job.
          </h1>
          <p className="font-body text-[#161616]/70 mt-4 max-w-md mx-auto leading-relaxed">
            Order confirmed, receipt on its way from Stripe, and a welcome note from Sarah is landing in your inbox. Here is what happens next.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-5 py-14">
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] flex gap-5">
              <span className="font-display italic text-3xl font-black text-[#8f6600] leading-none" aria-hidden="true">{s.n}</span>
              <div>
                <h2 className="font-display text-lg font-black leading-tight">{s.title}</h2>
                <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-1.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-6 mt-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mb-2">Meanwhile</p>
          <p className="font-body text-sm leading-relaxed">
            Questions before Sarah&apos;s email arrives? Reply to the welcome note, or call Mr. Mustard at{' '}
            <a href="tel:+14063121223" className="font-bold text-[#F5B700]">{SIDEKICK.phoneLine}</a>. He knows the drill. He wrote it.
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
