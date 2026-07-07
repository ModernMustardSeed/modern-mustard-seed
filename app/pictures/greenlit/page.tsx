import Link from 'next/link';
import Image from 'next/image';
import { buildMetadata } from '@/lib/seo';
import { PICTURES } from '@/data/pictures';

export const metadata = buildMetadata({
  title: 'Greenlit. Your commercial is in production',
  description: 'Order confirmed. Here is exactly what happens before opening night.',
  path: '/pictures/greenlit',
  noindex: true,
});

export default function GreenlitPage() {
  const steps = [
    {
      n: '1',
      title: 'The studio starts shooting',
      body: 'Mr. Mustard films from your approved treatment. Bought without a Screen Test? Sarah emails you a short intake first so the film is unmistakably yours.',
    },
    {
      n: '2',
      title: 'Hand review, every frame',
      body: 'Sarah personally reviews the cut before it ships. Nothing leaves the studio she would not run for her own business.',
    },
    {
      n: '3',
      title: 'Opening night, in your inbox',
      body: 'THE SPOT arrives within 2 business days, THE PREMIERE within 3: every cut, the poster frame, full commercial rights, yours forever.',
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
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[1.02]">
            Lights. Camera. Yours.
          </h1>
          <p className="font-body text-[#161616]/70 mt-4 max-w-md mx-auto leading-relaxed">
            Order confirmed, receipt on its way from Stripe, and a note from Sarah is landing in your inbox. Here is what happens next.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-5 py-14">
        <div className="space-y-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-white p-6 shadow-[5px_5px_0_0_#161616] flex gap-5">
              <span className="font-display italic text-3xl font-black text-[#F5B700] leading-none" aria-hidden="true">{s.n}</span>
              <div>
                <h2 className="font-display text-lg font-black leading-tight">{s.title}</h2>
                <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-1.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border-2 border-[#161616] bg-[#161616] text-[#FBF6EA] p-6 mt-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F5B700] font-bold mb-2">A must-have detail?</p>
          <p className="font-body text-sm leading-relaxed">
            A phone number that has to appear, a color that IS the brand, the dog who greets every customer: reply to Sarah&apos;s email and it goes in the film.
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
