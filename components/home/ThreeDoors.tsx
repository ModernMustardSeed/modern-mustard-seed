import Link from 'next/link';

/**
 * ThreeDoors. Beat 05: the three ways to engage the studio, plus the free
 * Website Audit strip as the no-risk first step. Absorbs the old
 * FlagshipPrograms and AiProofPromo sections and gives MUSTARD MODE its
 * homepage billing.
 */

const DOORS = [
  {
    chip: '[ DOOR 01 ]',
    name: 'Build With Us',
    pitch:
      'Idea to shipped product. We design, build, brand, and launch it end to end. Fixed scope, fixed quote, live in 2 to 4 weeks. You own everything on launch day.',
    points: ['Apps, sites, voice agents, AI tools', 'Sarah answers you personally, and fast', 'Plus Mr. Mustard, on call 24/7'],
    cta: 'Join the Build Queue',
    href: '/build-queue',
    featured: true,
  },
  {
    chip: '[ DOOR 02 ]',
    name: 'MUSTARD MODE',
    pitch:
      'Learn to run Claude like the studio does. A personal AI coach, four tracks, 28 missions, and the exact prompts. Your first coaching session is free, right on the page.',
    points: ['Mr. Mustard, your live AI coach', 'Code, Design, Cowork, Ideate', 'From $197 once, lifetime access'],
    cta: 'Play your free credit',
    href: '/mustard-mode',
    featured: false,
  },
  {
    chip: '[ DOOR 03 ]',
    name: 'AI-Proof Your Business',
    pitch:
      'For owners with revenue to protect. We audit your operation against the AI shift, harden what is exposed, and re-equip your team for the new stack.',
    points: ['Moat audit + hardening plan', 'AI on the front lines and back office', 'Quoted per business, free discovery call'],
    cta: 'Defend the moat',
    href: '/ai-proof',
    featured: false,
  },
];

const AUDIT_DIMENSIONS = ['Brand', 'Trust', 'SEO', 'GEO', 'AI Features', 'Conversion', 'Design'];

export default function ThreeDoors() {
  return (
    <section className="relative bg-[#FBF6EA] py-20 md:py-28 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">
          Three doors // One studio
        </p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02] max-w-3xl">
          We build it. You learn it.<br />Or we defend it.
        </h2>

        <div className="grid md:grid-cols-3 gap-6 mt-12 items-stretch">
          {DOORS.map((d) => (
            <div
              key={d.name}
              className={`flex flex-col border-2 border-[#161616] p-7 ${
                d.featured
                  ? 'bg-[#F5B700] shadow-[8px_8px_0_0_#161616]'
                  : 'bg-white shadow-[6px_6px_0_0_#161616]'
              }`}
            >
              <span
                className={`font-mono font-bold text-[11px] tracking-[0.14em] ${
                  d.featured ? 'text-[#161616]' : 'text-[#E0301E]'
                }`}
              >
                {d.chip}
              </span>
              <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#161616] mt-4">
                {d.name}
              </h3>
              <p className="font-sans text-sm text-[#161616]/80 mt-3 leading-relaxed">{d.pitch}</p>
              <ul className="mt-5 space-y-2 flex-1">
                {d.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 font-sans text-[13px] font-medium text-[#161616]">
                    <span className="text-[#E0301E] font-black mt-px" aria-hidden="true">✦</span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={d.href}
                className={`mt-7 text-center font-sans font-bold text-sm border-2 border-[#161616] px-5 py-3.5 transition-all hover:translate-y-[2px] ${
                  d.featured
                    ? 'bg-[#161616] text-[#FBF6EA] shadow-[4px_4px_0_0_#FBF6EA] hover:shadow-[2px_2px_0_0_#FBF6EA]'
                    : 'bg-[#F5B700] text-[#161616] shadow-[4px_4px_0_0_#161616] hover:shadow-[2px_2px_0_0_#161616]'
                }`}
              >
                {d.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Free audit strip: the no-risk first step */}
        <div className="mt-10 border-2 border-[#161616] bg-white shadow-[6px_6px_0_0_#161616] p-7 md:p-8 md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.35em] text-[#E0301E] block">
              Not sure which door? Start here. Free. 60 seconds.
            </span>
            <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#161616] mt-2">
              The free Website Audit
            </h3>
            <p className="font-sans text-sm text-[#161616]/75 mt-2 leading-relaxed max-w-xl">
              Drop your URL, get a letter grade and a prioritized to-do list you can act on today.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {AUDIT_DIMENSIONS.map((dim) => (
                <span
                  key={dim}
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#161616] border border-[#161616] px-2 py-1 bg-[#FBF6EA]"
                >
                  {dim}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col gap-3 shrink-0">
            <Link
              href="/website-audit"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
            >
              Audit my website
            </Link>
            <Link
              href="/book"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Book a free call
            </Link>
          </div>
        </div>

        <p className="text-center text-[#161616]/70 font-body text-sm mt-8">
          Rather build it yourself, self-paced? The flagship programs{' '}
          <span className="font-bold text-[#161616]">Idea to Spec</span> and{' '}
          <span className="font-bold text-[#161616]">The Terminal</span> ($497 each) live in the{' '}
          <Link href="/store" className="text-[#E0301E] font-bold underline underline-offset-4 hover:text-[#161616]">
            store
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
