import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'You Are Going On Air · MUSTARD BROADCAST',
  description: 'Your Broadcast order landed. Here is exactly what happens next.',
  path: '/ads/live',
  noindex: true,
});

export default function AdsLivePage() {
  return (
    <div className="bg-[#f1ede4] text-[#0d0d0d] min-h-[70vh]">
      <section className="halftone-bg border-b-2 border-[#0d0d0d]">
        <div className="max-w-2xl mx-auto px-5 py-20 md:py-28 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#d0241b] font-bold mb-4">[ MUSTARD BROADCAST ]</p>
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.02]">
            You are going
            <br /> on the air.
          </h1>
          <p className="font-body text-[#0d0d0d]/70 mt-5 max-w-lg mx-auto">
            Order received, production started. Here is exactly how your first week goes.
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="max-w-2xl mx-auto px-5 space-y-4">
          {[
            {
              n: '1',
              title: 'Check your inbox (right now)',
              body: 'A welcome note from Sarah is on its way. Reply with your business details: what you do, your town, and what a great customer looks like. Ten minutes of your time, then you are done working.',
            },
            {
              n: '2',
              title: 'Approve your commercial (within 2 business days)',
              body: 'Your 30-second spot lands in your inbox: widescreen, vertical, and square cuts. You approve every frame, or tell us what to change, before anything runs.',
            },
            {
              n: '3',
              title: 'Go live (within 7 days)',
              body: 'We build the campaign inside your own ad account, on your card, never marked up. Then the weekly management and monthly plain-English reports begin. Your job from here: answer the phone.',
            },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-white border-2 border-[#0d0d0d] shadow-[5px_5px_0_0_#0d0d0d] p-6 flex gap-5">
              <p className="font-display text-4xl font-black text-[#ffd400] leading-none" aria-hidden="true">{s.n}</p>
              <div>
                <h2 className="font-sans font-extrabold text-lg">{s.title}</h2>
                <p className="font-body text-sm text-[#0d0d0d]/75 mt-1.5 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}

          <div className="text-center pt-6">
            <Link
              href="/ads#network"
              className="inline-block rounded-full bg-[#ffd400] border-2 border-[#0d0d0d] px-8 py-3.5 font-sans font-extrabold text-[#0d0d0d] text-sm uppercase tracking-[0.16em] shadow-[4px_4px_0_0_#0d0d0d] transition-all hover:-translate-y-0.5"
            >
              Watch The Network While You Wait
            </Link>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#0d0d0d]/50 mt-4">
              Questions any time: sarah@modernmustardseed.com
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
