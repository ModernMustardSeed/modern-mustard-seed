import { getSupabase } from '@/lib/supabase';
import { JsonLd } from '@/lib/jsonld';
import { SITE } from '@/lib/seo';

type Row = {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  quote: string;
  outcome: string | null;
  rating: number | null;
};

/**
 * Public testimonials. Read server-side (service role) from the testimonials
 * table; renders pop-art comic cards plus Review + AggregateRating JSON-LD.
 * Renders nothing until there is at least one published review (no fakes).
 */
export default async function Testimonials() {
  const supabase = getSupabase();
  if (!supabase) return null;

  let rows: Row[] = [];
  try {
    const { data } = await supabase
      .from('testimonials')
      .select('id, name, role, company, quote, outcome, rating')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('sort', { ascending: true })
      .limit(12);
    rows = (data as Row[]) || [];
  } catch {
    return null;
  }
  if (!rows.length) return null;

  const avg = rows.reduce((s, r) => s + (Number(r.rating) || 5), 0) / rows.length;
  const jsonLd = {
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
  };

  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-20 md:py-28">
      <JsonLd data={jsonLd} />
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-5 block">
          What clients say
        </span>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight">
          Real people,{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            real wins
          </span>
        </h2>
      </div>

      {rows.length > 3 ? (
        <>
          <div className="max-w-6xl mx-auto mb-3 flex items-center justify-end">
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold inline-flex items-center gap-2">
              Scroll
              <span aria-hidden="true" className="text-sm leading-none">&rarr;</span>
            </span>
          </div>
          <div className="mms-hscroll flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 max-w-6xl mx-auto items-stretch">
            {rows.map((r) => (
              <div key={r.id} className="snap-start shrink-0 w-[82vw] sm:w-[360px] flex">
                {testimonialCard(r)}
              </div>
            ))}
            <div aria-hidden="true" className="shrink-0 w-px" />
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {rows.map((r) => testimonialCard(r))}
        </div>
      )}
    </section>
  );
}

function testimonialCard(r: Row) {
  return (
    <figure key={r.id} className="pop-card p-7 flex flex-col w-full h-full">
      <div className="text-[#F5B700] text-sm mb-3" aria-hidden="true" style={{ WebkitTextStroke: '0.5px #161616' }}>
        {'★'.repeat(Math.max(1, Math.min(5, r.rating || 5)))}
      </div>
      <blockquote className="text-[#161616] font-body text-[15px] leading-relaxed flex-1">
        &ldquo;{r.quote}&rdquo;
      </blockquote>
      {r.outcome && (
        <p className="mt-4 inline-block self-start text-[11px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-3 py-1">
          {r.outcome}
        </p>
      )}
      <figcaption className="mt-4 pt-4 border-t-2 border-[#161616]/10">
        <span className="block font-display font-black text-[#161616]">{r.name}</span>
        {(r.role || r.company) && (
          <span className="block text-[12px] text-[#3a3733] font-body">
            {[r.role, r.company].filter(Boolean).join(', ')}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
