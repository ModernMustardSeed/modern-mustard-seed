import Link from 'next/link';

/**
 * ThreeDoors. Beat 05: the ways to engage the studio, plus the free Website
 * Audit strip as the no-risk first step. Down to two doors (Sarah, 2026-07-19:
 * the AI-Proof "defend" door came off the homepage; /future-proof still exists via
 * the footer). Gives MUSTARD MODE its homepage billing.
 */

const DOORS = [
  {
    chip: '[ DOOR 01 ]',
    name: 'Build With Us',
    pitch:
      'Idea to shipped product. We design, build, brand, and launch it end to end. Websites, voice agents, and command centers go live in about a week. Fixed scope, fixed quote, and you own everything on launch day.',
    points: ['Websites, voice agents, command centers', 'Sarah answers you personally, and fast', 'Plus Mr. Mustard, on call 24/7'],
    cta: 'Book a Free Call',
    href: '/book',
    featured: true,
  },
  {
    chip: '[ DOOR 02 ]',
    name: 'MUSTARD MODE',
    pitch:
      'Learn to run Claude like the studio does. A personal agentic coach, four tracks, 28 missions, and the exact prompts. Your first coaching session is free, right on the page.',
    points: ['Mr. Mustard, your live agentic coach', 'Code, Design, Cowork, Ideate', 'From $197 once, lifetime access'],
    cta: 'Try a free coaching session',
    href: '/mustard-mode',
    featured: false,
  },
];

const AUDIT_DIMENSIONS = ['Brand', 'Trust', 'SEO', 'GEO', 'Agentic Features', 'Conversion', 'Design'];

export default function ThreeDoors() {
  return (
    <section className="relative bg-[#f1ede4] py-20 md:py-28 overflow-hidden">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#C4160B] uppercase">
          Two doors // One studio
        </p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#0d0d0d] mt-3 leading-[1.02] max-w-3xl">
          We build it.<br />Or you learn it.
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mt-12 items-stretch">
          {DOORS.map((d) => (
            <div
              key={d.name}
              className={`flex flex-col border-2 border-[#0d0d0d] p-7 ${
                d.featured
                  ? 'bg-[#ffd400] shadow-[8px_8px_0_0_#0d0d0d]'
                  : 'bg-white shadow-[6px_6px_0_0_#0d0d0d]'
              }`}
            >
              <span
                className={`font-mono font-bold text-[11px] tracking-[0.14em] ${
                  d.featured ? 'text-[#0d0d0d]' : 'text-[#C4160B]'
                }`}
              >
                {d.chip}
              </span>
              <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#0d0d0d] mt-4">
                {d.name}
              </h3>
              <p className="font-sans text-sm text-[#0d0d0d]/80 mt-3 leading-relaxed">{d.pitch}</p>
              <ul className="mt-5 space-y-2 flex-1">
                {d.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 font-sans text-[13px] font-medium text-[#0d0d0d]">
                    <span className="text-[#C4160B] font-black mt-px" aria-hidden="true">✦</span>
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={d.href}
                className={`mt-7 text-center font-sans font-bold text-sm border-2 border-[#0d0d0d] px-5 py-3.5 transition-all hover:translate-y-[2px] ${
                  d.featured
                    ? 'bg-[#0d0d0d] text-[#f1ede4] shadow-[4px_4px_0_0_#f1ede4] hover:shadow-[2px_2px_0_0_#f1ede4]'
                    : 'bg-[#ffd400] text-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:shadow-[2px_2px_0_0_#0d0d0d]'
                }`}
              >
                {d.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Free audit strip: the no-risk first step */}
        <div className="mt-10 border-2 border-[#0d0d0d] bg-white shadow-[6px_6px_0_0_#0d0d0d] p-7 md:p-8 md:flex md:items-center md:justify-between gap-8">
          <div className="md:flex-1">
            <span className="font-mono font-bold text-[10px] uppercase tracking-[0.35em] text-[#C4160B] block">
              Not sure which door? Start here. Free. 60 seconds.
            </span>
            <h3 className="font-display italic font-extrabold text-2xl md:text-3xl text-[#0d0d0d] mt-2">
              The free Website Audit
            </h3>
            <p className="font-sans text-sm text-[#0d0d0d]/75 mt-2 leading-relaxed max-w-xl">
              Drop your URL, get a letter grade and a prioritized to-do list you can act on today.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {AUDIT_DIMENSIONS.map((dim) => (
                <span
                  key={dim}
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-[#0d0d0d] border border-[#0d0d0d] px-2 py-1 bg-[#f1ede4]"
                >
                  {dim}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 md:mt-0 flex flex-col gap-3 shrink-0">
            <Link
              href="/website-audit"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#0d0d0d] rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_rgba(13,13,13,0.35)] hover:-translate-y-0.5 transition-all"
            >
              Audit my website
            </Link>
            <Link
              href="/book"
              className="text-center px-8 py-4 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0d0d0d] bg-white rounded-full border-2 border-[#0d0d0d] shadow-[4px_4px_0_0_#0d0d0d] hover:-translate-y-0.5 transition-all"
            >
              Book a Free Call
            </Link>
          </div>
        </div>

        <p className="text-center text-[#0d0d0d]/70 font-body text-sm mt-8">
          Rather build it yourself, self-paced? The flagship programs{' '}
          <span className="font-bold text-[#0d0d0d]">Idea to Spec</span> and{' '}
          <span className="font-bold text-[#0d0d0d]">The Terminal</span> ($497 each) live in the{' '}
          <Link href="/store" className="text-[#C4160B] font-bold underline underline-offset-4 hover:text-[#0d0d0d]">
            store
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
