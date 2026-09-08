import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata } from '@/lib/seo';
import { LAUNCH_FILM } from '@/data/launch-film';

export const metadata = buildMetadata({
  title: 'Greenlit. Your launch film is in production',
  description: 'Order confirmed. Here is exactly what happens between now and the premiere.',
  path: '/launch-film/greenlit',
  noindex: true,
});

export default function LaunchFilmGreenlitPage() {
  const steps = [
    {
      n: '1',
      title: 'We run the product',
      body: 'Sarah emails you within one business day for access to the live product or a staging build. The capture rig runs it and keeps what it produces. Everything on screen in the film comes from that run.',
    },
    {
      n: '2',
      title: 'The treatment, then the cut',
      body: 'You get the shot list with the length and every cut point, on bar lines, before a frame is rendered. Approve it, or mark it up. Then the film is rendered frame by frame and scored from scratch.',
    },
    {
      n: '3',
      title: 'The premiere, in your inbox',
      body: `THE LAUNCH FILM is ${LAUNCH_FILM.delivery}, THE LAUNCH CAMPAIGN ${LAUNCH_FILM.campaignDelivery}: every cut, the poster frames, the rig, and the player installed on your site.`,
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
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mt-6 mb-3">[ GREENLIT ]</p>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">Your launch has a film now.</h1>
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
            Reply to Sarah&apos;s email with the product link and a login if it needs one. The film starts the moment the product runs.
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
