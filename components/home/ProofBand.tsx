import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { JsonLd } from '@/lib/jsonld';
import { SITE } from '@/lib/seo';

/**
 * ProofBand. Beat 03: one dark midnight band that carries all the proof.
 * Merges the old ResultsMarquee (real case-study metrics) and Testimonials
 * (published Supabase reviews + AggregateRating JSON-LD) into a single
 * cinematic section. No fakes: testimonials render only when published
 * rows exist; the metrics are from the shipped case studies.
 */

const RESULTS = [
  { metric: '$30K commission', outcome: '$99 monthly tool', client: 'DEED AI' },
  { metric: '2 hours', outcome: '90 seconds per deal', client: 'PTG AI Deal Analyzer' },
  { metric: 'Sketch', outcome: 'Live storefront in 60 days', client: 'Cross + Covenant' },
  { metric: 'Empty room photo', outcome: 'Staged in 60 seconds', client: 'Luxe Design' },
  { metric: '3 hours of small jobs', outcome: '30 minutes of review', client: 'Wild Daisy' },
  { metric: '30% missed calls', outcome: '24/7 coverage', client: 'VoiceStaff' },
  { metric: 'Idea', outcome: 'Live product in weeks', client: 'Olive Shoot' },
  { metric: 'One creative director', outcome: 'Six concepts an afternoon', client: 'CXC Studio' },
];

type Row = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  outcome: string | null;
  rating: number | null;
};

async function getTestimonials(): Promise<Row[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from('testimonials')
      .select('id, name, role, company, quote, outcome, rating')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('sort', { ascending: true })
      .limit(3);
    return (data as Row[]) || [];
  } catch {
    return [];
  }
}

export default async function ProofBand() {
  const rows = await getTestimonials();

  const avg = rows.length
    ? rows.reduce((s, r) => s + (Number(r.rating) || 5), 0) / rows.length
    : 0;
  const jsonLd = rows.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${SITE.url}/#organization`,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avg.toFixed(1),
          reviewCount: rows.length,
          bestRating: 5,
        },
        review: rows.map((r) => ({
          '@type': 'Review',
          reviewRating: { '@type': 'Rating', ratingValue: r.rating || 5, bestRating: 5 },
          author: { '@type': 'Person', name: r.name },
          reviewBody: r.quote,
        })),
      }
    : null;

  const marqueeItems = [...RESULTS, ...RESULTS];

  return (
    <section className="relative bg-[#080C16] py-20 md:py-28 border-b-2 border-[#161616] overflow-hidden">
      {jsonLd && <JsonLd data={jsonLd} />}
      {/* Dim halftone texture */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(245,183,0,0.10) 1.4px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">
          Proof // Not theory
        </p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-white mt-3 leading-[1.02] max-w-3xl">
          Real products. Real receipts.
        </h2>
        <p className="font-sans text-white/70 max-w-2xl mt-5">
          40+ products shipped across AI, e-commerce, real estate, hospitality, and SaaS. Every
          metric below comes from a real build with a case study behind it.
        </p>
      </div>

      {/* Results marquee */}
      <div className="relative mt-12">
        <style>{`
          @keyframes mm-proof-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .mm-proof-track { display: flex; width: max-content; gap: 56px; animation: mm-proof-marquee 50s linear infinite; }
          .mm-proof-track:hover { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) { .mm-proof-track { animation: none; } }
        `}</style>
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, #080C16, transparent)' }}
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, #080C16, transparent)' }}
        />
        <div className="mm-proof-track">
          {marqueeItems.map((r, i) => (
            <div key={`${r.client}-${i}`} className="flex items-center gap-4 whitespace-nowrap flex-shrink-0">
              <span className="font-sans text-base md:text-lg font-bold text-white/55">{r.metric}</span>
              <span className="text-[#F5B700] text-xl font-black" aria-hidden="true">→</span>
              <span className="font-sans text-base md:text-lg font-extrabold text-white">{r.outcome}</span>
              <span className="font-mono font-bold text-[10px] uppercase tracking-[0.3em] text-[#FFDD55]/70 ml-2">
                {r.client}
              </span>
              <span className="text-white/20 text-xl mx-2" aria-hidden="true">·</span>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials (render only when real published reviews exist) */}
      {rows.length > 0 && (
        <div className="relative max-w-6xl mx-auto px-6 mt-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rows.map((r) => (
              <figure key={r.id} className="border-2 border-white/15 bg-[#0F1422] p-6 flex flex-col">
                <div className="text-[#F5B700] text-sm mb-3" aria-hidden="true">
                  {'★'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}
                </div>
                <blockquote className="text-white/85 font-body text-[15px] leading-relaxed flex-1">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                {r.outcome && (
                  <p className="mt-4 inline-block self-start text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-[#F5B700] border border-[#161616] px-3 py-1">
                    {r.outcome}
                  </p>
                )}
                <figcaption className="mt-4 pt-4 border-t border-white/10">
                  <span className="block font-display font-black text-white">{r.name}</span>
                  {(r.role || r.company) && (
                    <span className="block text-[12px] text-white/50 font-body">
                      {[r.role, r.company].filter(Boolean).join(', ')}
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-6xl mx-auto px-6 mt-12">
        <Link
          href="/work"
          className="inline-flex items-center gap-3 font-mono font-bold text-[11px] uppercase tracking-[0.2em] text-[#FFDD55] hover:text-white transition-colors"
        >
          See all the work →
        </Link>
      </div>
    </section>
  );
}
