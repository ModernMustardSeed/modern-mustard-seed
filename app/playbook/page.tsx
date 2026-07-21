import Image from 'next/image';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'What You Get',
  description:
    'A founder-led studio that turns your idea into real, shipped software. See exactly what working with Modern Mustard Seed looks like, from the free audit to launch and beyond.',
  path: '/playbook',
});

const PDF = '/downloads/modern-mustard-seed-playbook.pdf';

export default function PlaybookPage() {
  return (
    <main className="relative isolate overflow-hidden bg-[#FBF6EA] min-h-screen border-b-4 border-[#161616] pt-32 md:pt-40 pb-24 px-6">
      {/* Halftone dot field */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,183,0,0.30) 1.5px, transparent 1.6px)',
          backgroundSize: '18px 18px',
        }}
      />
      {/* Sunburst glow */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-16 -translate-x-1/2 w-[700px] h-[700px] max-w-[130vw] z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(245,183,0,0.38) 0%, rgba(245,183,0,0.14) 38%, transparent 64%)',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <div className="mx-auto w-[230px] sm:w-[300px] mb-8">
          <Image
            src="/brand/logo-lockup.png"
            alt="Modern Mustard Seed"
            width={1000}
            height={1093}
            priority
            className="w-full h-auto drop-shadow-[6px_6px_0_rgba(22,22,22,0.14)]"
          />
        </div>

        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-4">
          The Playbook
        </span>

        <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.04] text-[#161616]">
          What you{' '}
          <span
            className="inline-block text-[#F5B700] align-baseline"
            style={{ WebkitTextStroke: '2px #161616' }}
          >
            get
          </span>
        </h1>

        <p className="mt-6 text-base md:text-xl font-body text-[#3a3733] max-w-2xl mx-auto leading-relaxed">
          A founder-led studio that turns your idea into real, shipped software. This is exactly
          what working together looks like, from the first free audit to launch and beyond. No
          jargon, no surprises.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3.5 justify-center">
          <a
            href={PDF}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Read the Playbook (PDF)
          </a>
          <Link
            href="/audit"
            className="px-8 py-4 text-[12px] uppercase tracking-[0.18em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Get a Free Audit
          </Link>
        </div>

        <div className="mt-14 max-w-2xl mx-auto">
          <div className="rounded-2xl border-2 border-[#161616] bg-white px-7 py-6 shadow-[5px_5px_0_0_#161616] text-left">
            <span className="text-[9px] uppercase tracking-[0.35em] text-[#E0301E] font-mono font-bold block mb-4">
              Inside
            </span>
            <ul className="space-y-2.5 font-body text-[#161616]">
              {[
                'How we work together: audit, proposal, sign, build, launch',
                'Your private client portal and what lives in it',
                'Transparent three-bucket pricing, no hidden costs',
                'What we build and what happens after launch',
                'Refer and earn as a partner',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#F5B700] border border-[#161616] flex-shrink-0" />
                  <span className="text-sm md:text-base">{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
