import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata } from '@/lib/seo';
import { CHIEF } from '@/data/chief';

export const metadata = buildMetadata({
  title: 'Your Chief reports for duty',
  description: 'Order confirmed. Here is exactly what happens before your Chief goes live.',
  path: '/chief/welcome',
  noindex: true,
});

export default function ChiefWelcomePage() {
  const steps = [
    {
      n: '1',
      title: 'Sarah emails you within one business day',
      body: 'She books a short onboarding and learns how you like things run: your calendar, your people, your voice, and the things you want off your plate first.',
    },
    {
      n: '2',
      title: 'We train him on your world',
      body: 'Your business, your priorities, and how you like to be spoken to. We build your private Chief persona and switch on your morning briefing.',
    },
    {
      n: '3',
      title: 'Live within 7 days',
      body: 'He starts calling you awake, drafting your email, booking your day, and following up on your leads. Your minutes are hard-capped, so there is never a surprise bill.',
    },
  ];

  return (
    <div className="bg-[#f1ede4] text-[#0d0d0d] min-h-screen">
      <section className="halftone-bg border-b-2 border-[#0d0d0d]">
        <div className="max-w-2xl mx-auto px-5 py-16 md:py-24 text-center">
          <Image
            src="/brand/mascot.png"
            alt="Mr. Mustard"
            width={84}
            height={84}
            className="mx-auto rounded-full border-2 border-[#0d0d0d] bg-[#ffd400] shadow-[4px_4px_0_0_#0d0d0d]"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#d0241b] font-bold mt-6 mb-3">[ THE CHIEF: HIRED ]</p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">
            He reports for duty.
          </h1>
          <p className="font-body text-[#0d0d0d]/70 mt-4 max-w-md mx-auto leading-relaxed">
            Order confirmed, receipt on its way from Stripe, and a welcome note from Sarah with your command-center link is
            landing in your inbox. Here is what happens next.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-5 py-14">
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#0d0d0d] bg-white p-6 shadow-[5px_5px_0_0_#0d0d0d] flex gap-5">
              <span className="font-display italic text-3xl font-black text-[#8f6600] leading-none" aria-hidden="true">{s.n}</span>
              <div>
                <h2 className="font-display text-lg font-black leading-tight">{s.title}</h2>
                <p className="font-body text-sm text-[#0d0d0d]/70 leading-relaxed mt-1.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#0d0d0d] bg-[#0d0d0d] text-[#f1ede4] p-6 mt-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ffd400] font-bold mb-2">Meanwhile</p>
          <p className="font-body text-sm leading-relaxed">
            Want to hear him now? Call Mr. Mustard at{' '}
            <a href="tel:+14063121223" className="font-bold text-[#ffd400]">(406) 312-1223</a>. {CHIEF.phoneLineNote}
          </p>
        </div>

        <p className="text-center mt-10">
          <Link href="/" className="font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#c8201a] underline underline-offset-4">
            Back to Modern Mustard Seed →
          </Link>
        </p>
      </section>
    </div>
  );
}
