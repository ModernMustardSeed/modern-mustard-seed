import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { OFFICE_URL } from '@/data/studio-stats';
import { CLAUDE_SETUP, CLAUDE_PROOF, claudeTiers, claudeWhatWeSetUp, claudeFaq } from '@/data/claude-setup';
import PopPageHero, { pop } from '@/components/pop/PopPageHero';

export const metadata = buildMetadata({
  title: CLAUDE_SETUP.metaTitle,
  description: CLAUDE_SETUP.metaDescription,
  path: '/claude',
});

const ART_ALT =
  'Cut-paper diorama: Mr. Mustard works at a laptop on the deck of a yacht with a lemonade beside him while Mrs. Mustard reads on a lounger and the kids and puppy play, the Riviera coast behind them.';


export default function ClaudePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'Claude setup by Modern Mustard Seed',
        serviceType: 'Claude Code setup, custom Claude skills and Claude agents for business',
        description: CLAUDE_SETUP.metaDescription,
        provider: { '@type': 'Organization', name: SITE.name, url: SITE.url },
        areaServed: { '@type': 'Country', name: 'United States' },
        offers: claudeTiers.map((t) => ({
          '@type': 'Offer',
          name: t.name,
          description: t.pitch,
          url: `${SITE.url}/claude#packages`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: claudeFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <div id="top" className="bg-[#fbf5ea] text-[#0b3b44]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PopPageHero
        eyebrow={<span>Claude setup // For businesses nationwide</span>}
        title={<>Claude, set up to <em>run your business.</em></>}
        art={{ src: '/art/riviera/yacht', alt: ART_ALT, caption: 'The office, wherever you are' }}
        sticker="Made for you"
      >
        <p>{CLAUDE_SETUP.promise}</p>
        <div className={pop.actions}>
          <a href="#packages" className={pop.cta}>See the three packages</a>
          <Link href="/inquire?kind=claude" className={pop.ctaAlt}>Tell us what you need</Link>
        </div>
        <p className={pop.note}>Set up by Sarah Scarano. Based in Kalispell, MT, working with businesses in every state.</p>
      </PopPageHero>

      {/* ─── THE PROOF ─── */}
      <section className="bg-[#0b3b44]" aria-label="How Claude runs this studio">
        <div className="max-w-5xl mx-auto px-5 py-8 md:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-7">
            {CLAUDE_PROOF.map((p) => (
              <div key={p.label} className="text-center">
                <p className="font-display text-3xl md:text-4xl font-black text-[#f5b700] tracking-tight leading-none">{p.n}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fbf5ea]/70 mt-2 leading-snug">{p.label}</p>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#fbf5ea]/50 text-center mt-7">Counted from the setup that runs Modern Mustard Seed today.</p>
        </div>
      </section>

      {/* ─── WE RUN ON IT ─── */}
      <section className="py-16 md:py-24" aria-labelledby="ours-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[1.05fr_0.95fr] gap-10 md:gap-14 items-start">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ We run on it ourselves ]</p>
            <h2 id="ours-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
              Claude runs this studio. <em className="italic">Yours is next.</em>
            </h2>
            <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-5">
              Modern Mustard Seed is one person and a back office of Claude agents. Claude builds the websites, writes the follow-ups, keeps the books and drafts the work, following eighteen skills we wrote for how this studio operates, across sixty-four specialist agents. Ten safety hooks stop it from sending, spending or deleting anything without a yes.
            </p>
            <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4">
              Every package on this page is a smaller copy of that setup, shaped around your business instead of ours.
            </p>
            <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4">
              Meet the whole staff, with Mr. Mustard as chief of staff, at{' '}
              <a
                href={`${OFFICE_URL}/?utm_source=mms&utm_medium=referral&utm_campaign=claude-page`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#0a7c78] underline underline-offset-4 decoration-[#81d8d0] hover:decoration-[#0a7c78]"
              >
                office.modernmustardseed.com
              </a>
              .
            </p>
          </div>
          <div className="border-2 border-[#0b3b44] rounded-2xl bg-white p-6 shadow-[6px_6px_0_0_#f5b700]">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#0a7c78] font-bold">An example skill, in plain words</p>
            <p className="font-display text-xl font-black mt-3">Answering a new review</p>
            <ol className="mt-4 space-y-2 font-body text-[15px] text-[#0b3b44]/80 list-decimal pl-5">
              <li>Read the review and the job it came from.</li>
              <li>Thank them by name for the specific thing they praised.</li>
              <li>One sentence, our voice, no exclamation marks.</li>
              <li>If it is under four stars, draft it and wait for Sarah.</li>
            </ol>
            <p className="font-body text-sm text-[#0b3b44]/60 mt-4">Written once. Claude follows it every time.</p>
          </div>
        </div>
      </section>

      {/* ─── WHAT WE SET UP ─── */}
      <section className="py-16 md:py-20 bg-[#d8f3f0] border-y-2 border-[#0b3b44]" aria-labelledby="what-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ What we set up ]</p>
          <h2 id="what-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">Six pieces. One Claude that knows your business.</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {claudeWhatWeSetUp.map((w) => (
              <div key={w.title} className="bg-[#fbf5ea] border-2 border-[#0b3b44] rounded-2xl p-6">
                <h3 className="font-display text-xl font-black">{w.title}</h3>
                <p className="font-body text-[15px] text-[#0b3b44]/75 leading-relaxed mt-2">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE PACKAGES ─── */}
      <section id="packages" className="py-16 md:py-24 scroll-mt-24" aria-labelledby="packages-heading">
        <div className="max-w-6xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ Three ways to work together ]</p>
          <h2 id="packages-heading" className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">A person, a team, or a crew.</h2>
          <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-4 max-w-2xl">We quote your setup in the conversation, before we start. Changes to what we set up are included. Your Claude subscription is billed by Anthropic, in your name.</p>
          <div className="grid lg:grid-cols-3 gap-6 mt-10 items-stretch">
            {claudeTiers.map((t) => (
              <div key={t.slug} className={`flex flex-col rounded-2xl border-2 border-[#0b3b44] p-7 ${t.featured ? 'bg-[#0b3b44] text-[#fbf5ea] shadow-[8px_8px_0_0_#f5b700]' : 'bg-white shadow-[6px_6px_0_0_#0b3b44]'}`}>
                <p className={`font-mono text-[10px] uppercase tracking-[0.24em] font-bold ${t.featured ? 'text-[#81d8d0]' : 'text-[#0a7c78]'}`}>{t.chip}</p>
                <h3 className="font-display text-2xl font-black mt-3">{t.name}</h3>
                <p className={`font-display text-4xl font-black mt-3 ${t.featured ? 'text-[#f5b700]' : ''}`}>Request a quote</p>
                <p className={`font-body text-[15px] leading-relaxed mt-3 ${t.featured ? 'text-[#fbf5ea]/85' : 'text-[#0b3b44]/75'}`}>{t.pitch}</p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {t.includes.map((line) => (
                    <li key={line} className={`flex gap-2.5 font-body text-[14.5px] leading-snug ${t.featured ? 'text-[#fbf5ea]/90' : 'text-[#0b3b44]/85'}`}>
                      <span aria-hidden="true" className="text-[#f5b700] font-black">✓</span>{line}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/inquire?kind=claude&package=${t.slug}`}
                  className={`mt-7 inline-flex items-center justify-center rounded-full border-2 border-[#0b3b44] px-6 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] ${t.featured ? 'bg-[#f5b700] text-[#0b3b44]' : 'bg-[#0b3b44] text-[#fbf5ea]'}`}
                >
                  Request a quote
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUESTIONS ─── */}
      <section className="py-16 md:py-20 border-t-2 border-[#0b3b44]" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#0a7c78] font-bold mb-3">[ Straight answers ]</p>
          <h2 id="faq-heading" className="font-display text-3xl md:text-4xl font-black tracking-tight">Claude for business, answered.</h2>
          <div className="mt-8 divide-y-2 divide-[#0b3b44]/10 border-y-2 border-[#0b3b44]/10">
            {claudeFaq.map((f) => (
              <details key={f.q} className="py-5 group">
                <summary className="font-display text-lg font-bold cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="text-[#0a7c78] group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
                </summary>
                <p className="font-body text-[#0b3b44]/75 leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <Link href="/inquire?kind=claude" className="inline-flex items-center justify-center rounded-full bg-[#f5b700] border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#0b3b44]">Tell us what you need</Link>
            <Link href="/agentic-native" className="inline-flex items-center justify-center rounded-full bg-white border-2 border-[#0b3b44] px-7 py-3.5 font-sans font-extrabold text-xs uppercase tracking-[0.18em]">The whole company, agentic</Link>
          </div>
          <p className="font-body text-xs text-[#0b3b44]/55 mt-8">Claude is a product of Anthropic. Modern Mustard Seed is an independent studio and is not affiliated with or endorsed by Anthropic.</p>
        </div>
      </section>
    </div>
  );
}
