import Link from 'next/link';
import { buildMetadata, SITE } from '@/lib/seo';
import { LAUNCH_FILM, EXAMPLE_FILM, launchFilmTiers, launchFilmMethod, launchFilmFaq, launchFilmUsd } from '@/data/launch-film';
import LaunchFilmPlayer from '@/components/launch-film/LaunchFilmPlayer';
import LaunchFilmTiers from '@/components/launch-film/LaunchFilmTiers';
import TreatmentForm from '@/components/launch-film/TreatmentForm';

export const metadata = buildMetadata({
  title: LAUNCH_FILM.metaTitle,
  description: LAUNCH_FILM.metaDescription,
  path: '/launch-film',
  // Route-level card. buildMetadata sets openGraph.images, which overrides
  // the file-based opengraph-image convention, so it must be named here.
  image: '/launch-film/opengraph-image',
});

const runtime = `${Math.floor(EXAMPLE_FILM.seconds / 60)}:${String(EXAMPLE_FILM.seconds % 60).padStart(2, '0')}`;

export default function LaunchFilmPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: 'The Launch Film by Modern Mustard Seed',
        serviceType: 'Product launch video production',
        description: LAUNCH_FILM.metaDescription,
        provider: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
        areaServed: 'US',
        offers: launchFilmTiers.map((t) => ({
          '@type': 'Offer',
          name: `${LAUNCH_FILM.name} ${t.name}`,
          price: t.priceCents / 100,
          priceCurrency: 'USD',
          url: `${SITE.url}/launch-film#book`,
          availability: 'https://schema.org/InStock',
        })),
      },
      {
        '@type': 'VideoObject',
        name: `${EXAMPLE_FILM.title}: the launch film`,
        description: 'The seventy-six second launch film for IRL, built from the running app, rendered frame by frame, scored from scratch.',
        thumbnailUrl: `${SITE.url}${EXAMPLE_FILM.wide.poster}`,
        contentUrl: `${SITE.url}${EXAMPLE_FILM.wide.mp4}`,
        uploadDate: '2026-09-04',
        duration: `PT${EXAMPLE_FILM.seconds}S`,
        publisher: { '@type': 'Organization', name: 'Modern Mustard Seed', url: SITE.url },
      },
      {
        '@type': 'HowTo',
        name: 'How a launch film is made here',
        step: launchFilmMethod.map((s) => ({ '@type': 'HowToStep', name: s.title, text: s.body })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: launchFilmFaq.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  const proof = [
    { n: `${EXAMPLE_FILM.seconds}`, label: 'seconds' },
    { n: EXAMPLE_FILM.frames.toLocaleString('en-US'), label: 'frames, each one rendered' },
    { n: `${EXAMPLE_FILM.cuts}`, label: 'formats from one film' },
    { n: `${EXAMPLE_FILM.stockClips}`, label: 'stock clips' },
    { n: `${EXAMPLE_FILM.licensedTracks}`, label: 'licensed tracks' },
    { n: '2', label: 'days, app to premiere' },
  ];

  return (
    <div id="top" className="bg-[#FBF6EA] text-[#161616]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── THE PREMIERE ─── */}
      <section className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-5xl mx-auto px-5 pt-16 md:pt-24 pb-14 md:pb-20">
          <div className="text-center mb-10 md:mb-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-4">{LAUNCH_FILM.wordmark}</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black text-[#161616] tracking-tight leading-[0.98]">
              The film your launch <em className="italic">deserves</em>.
            </h1>
            <p className="font-body text-base md:text-lg text-[#161616]/70 max-w-2xl mx-auto mt-5 leading-relaxed">{LAUNCH_FILM.promise}</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <LaunchFilmPlayer
              cuts={{ webm: EXAMPLE_FILM.wide.webm, mp4: EXAMPLE_FILM.wide.mp4 }}
              poster={EXAMPLE_FILM.wide.poster}
              runtime={runtime}
              film="irl-wide"
              title={`the ${EXAMPLE_FILM.title} launch film`}
            />
            <p className="font-body text-sm text-[#161616]/60 text-center mt-5">
              The launch film for{' '}
              <a href={EXAMPLE_FILM.url} target="_blank" rel="noopener" className="font-bold text-[#161616] underline underline-offset-4">
                {EXAMPLE_FILM.client}
              </a>
              . Every place, address and forecast in it came out of the app, not a script.
            </p>
          </div>

          <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#book"
              className="rounded-full bg-[#161616] border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#FBF6EA] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#F5B700] transition-all hover:-translate-y-0.5"
            >
              See the three films
            </a>
            <a
              href="#treatment"
              className="rounded-full bg-white border-2 border-[#161616] px-8 py-3.5 font-sans font-extrabold text-[#161616] text-xs uppercase tracking-[0.18em] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5"
            >
              Get the free treatment
            </a>
          </div>
        </div>
      </section>

      {/* ─── THE PROOF STRIP ─── */}
      <section className="bg-[#161616] border-b-2 border-[#161616]" aria-label="What the example film measures">
        <div className="max-w-5xl mx-auto px-5 py-8 md:py-10 grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-7">
          {proof.map((p) => (
            <div key={p.label} className="text-center">
              <p className="font-display text-3xl md:text-4xl font-black text-[#F5B700] tracking-tight leading-none">{p.n}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/70 mt-2 leading-snug">{p.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── NOTHING IS INVENTED ─── */}
      <section className="py-16 md:py-24" aria-labelledby="real-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-14 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3">[ Nothing on screen is invented ]</p>
            <h2 id="real-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              Real screens. Real data. <em className="italic">Your</em> product.
            </h2>
            <p className="font-body text-[#161616]/75 leading-relaxed mt-5">
              A launch film made of mockups sells a product that does not exist yet. This one is built the other way round. We run the product, keep what it makes, and cut the film from that. When the film says an address, the app found that address. When it shows the weather, the app checked.
            </p>
            <ul className="mt-6 space-y-2.5">
              {EXAMPLE_FILM.realThings.map((line) => (
                <li key={line} className="flex gap-3 font-body text-sm text-[#161616]">
                  <span aria-hidden="true" className="mt-[5px] h-3 w-3 flex-shrink-0 rounded-sm border-2 border-[#161616] bg-[#F5B700]" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 mt-6">Four things the IRL film says, all pulled out of the running app</p>
          </div>
          <div className="max-w-[300px] mx-auto w-full">
            <LaunchFilmPlayer
              cuts={{ mp4: EXAMPLE_FILM.tall.mp4 }}
              poster={EXAMPLE_FILM.tall.poster}
              runtime={runtime}
              film="irl-tall"
              aspect="tall"
              title={`the ${EXAMPLE_FILM.title} launch film, vertical cut`}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/50 text-center mt-4">The same film, re-set for a phone</p>
          </div>
        </div>
      </section>

      {/* ─── THE METHOD ─── */}
      <section className="py-16 md:py-24 bg-white border-y-2 border-[#161616]" aria-labelledby="method-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ The method ]</p>
          <h2 id="method-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            Six steps. The same six, every film.
          </h2>
          <p className="font-body text-[#161616]/70 text-center max-w-2xl mx-auto mt-4">
            A launch film here is engineered, not improvised. Every one is built on the same rig, which is why the second film costs the same as the first and ships just as fast.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {launchFilmMethod.map((s) => (
              <div key={s.n} className="rounded-2xl border-2 border-[#161616] bg-[#FBF6EA] p-7 shadow-[6px_6px_0_0_#161616]">
                <p className="font-display italic text-4xl font-black text-[#F5B700]" aria-hidden="true">
                  {s.n}
                </p>
                <h3 className="font-display text-xl font-black text-[#161616] mt-3">{s.title}</h3>
                <p className="font-body text-sm text-[#161616]/70 leading-relaxed mt-2.5">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THE THREE FILMS ─── */}
      <section id="book" className="py-16 md:py-24 scroll-mt-20" aria-labelledby="book-heading">
        <div className="max-w-5xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ Set prices ]</p>
          <h2 id="book-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            Three ways to book it.
          </h2>
          <p className="font-body text-[#161616]/70 text-center max-w-2xl mx-auto mt-4">
            The price is the price. Changes to the film we built are included, and everything we make is yours: the files, the rights, and the rig that renders them.
          </p>
          <div className="mt-12">
            <LaunchFilmTiers />
          </div>
          <p className="font-body text-sm text-[#161616]/60 text-center mt-8 max-w-2xl mx-auto">
            A film for a product we are already building lives inside{' '}
            <Link href="/the-system" className="font-bold text-[#161616] underline underline-offset-4">
              Idea to Product
            </Link>
            . Ask for it at the Launch tier and it is scoped in.
          </p>
        </div>
      </section>

      {/* ─── THE FREE TREATMENT ─── */}
      <section id="treatment" className="py-16 md:py-24 bg-[#F5B700] border-y-2 border-[#161616] scroll-mt-20" aria-labelledby="treatment-heading">
        <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#161616]/70 font-bold mb-3">[ Free, first ]</p>
            <h2 id="treatment-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.05]">
              Send the product. Get the treatment.
            </h2>
            <p className="font-body text-[#161616]/80 leading-relaxed mt-5">
              We run your product and write the treatment: the shot list, the length, the cut points, and which of the three films fits. It comes back within two business days, it costs nothing, and it is yours whether or not you book.
            </p>
            <p className="font-body text-[#161616]/80 leading-relaxed mt-4">
              Most founders have never seen their product cut to a beat. That is usually the moment they decide.
            </p>
          </div>
          <TreatmentForm />
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-16 md:py-24" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#E0301E] font-bold mb-3 text-center">[ Questions ]</p>
          <h2 id="faq-heading" className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight text-center leading-[1.05]">
            Before you book.
          </h2>
          <div className="mt-10 space-y-3">
            {launchFilmFaq.map((f) => (
              <details key={f.q} className="group rounded-2xl border-2 border-[#161616] bg-white shadow-[4px_4px_0_0_#161616] open:shadow-[6px_6px_0_0_#F5B700]">
                <summary className="cursor-pointer list-none px-6 py-4 font-display text-lg font-black text-[#161616] flex items-center justify-between gap-4">
                  <span>{f.q}</span>
                  <span aria-hidden="true" className="font-mono text-xl leading-none text-[#F5B700] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="px-6 pb-5 font-body text-sm text-[#161616]/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-16 md:py-24 bg-[#161616] border-t-2 border-[#161616]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="font-display text-3xl md:text-5xl font-black text-[#FBF6EA] tracking-tight leading-[1.05]">
            You built the product.
            <br className="hidden md:block" /> Give it a premiere.
          </h2>
          <p className="font-body text-[#FBF6EA]/70 mt-4 max-w-xl mx-auto">
            From {launchFilmUsd(launchFilmTiers[0].priceCents)}, {LAUNCH_FILM.delivery}. Or send the product first and read the treatment before you decide.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#book"
              className="inline-block rounded-full bg-[#F5B700] border-2 border-[#F5B700] px-10 py-4 font-sans font-extrabold text-[#161616] text-sm uppercase tracking-[0.18em] shadow-[5px_5px_0_0_#FBF6EA] transition-all hover:-translate-y-0.5"
            >
              Book the film
            </a>
            <Link
              href="/book"
              className="inline-block rounded-full bg-transparent border-2 border-[#FBF6EA] px-10 py-4 font-sans font-extrabold text-[#FBF6EA] text-sm uppercase tracking-[0.18em] transition-all hover:-translate-y-0.5"
            >
              Talk to Sarah first
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
