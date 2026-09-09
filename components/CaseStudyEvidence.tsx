import Image from 'next/image';
import type { CaseEvidence } from '@/lib/content';

/** Render only supplied evidence. Missing outcomes never become invented results. */
export default function CaseStudyEvidence({ evidence }: { evidence?: CaseEvidence }) {
  if (!evidence) return null;
  return <section aria-label="Build evidence" className="mt-10 mb-12 space-y-6">
    <h2 className="font-display text-3xl font-bold">The build record</h2>
    <dl className="grid sm:grid-cols-2 gap-5">
      {[
        ['Relationship', evidence.relationship], ['Location', evidence.location],
        ['Challenge', evidence.challenge], ['Delivered functionality', evidence.delivered],
      ].filter(([, value]) => value).map(([label, value]) => <div key={label} className="pop-card p-5"><dt className="font-bold">{label}</dt><dd className="mt-2 leading-relaxed">{value}</dd></div>)}
    </dl>
    {evidence.results?.filter((result) => result.source && result.period).map((result) => <div key={result.claim} className="pop-card-cream p-6"><h3 className="font-bold">{result.claim}</h3><p className="mt-2">Measurement period: {result.period}. Source: {result.source}.</p><p className="mt-2">Method: {result.method}</p></div>)}
    {evidence.screenshots?.map((shot) => <figure key={shot.src}><Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} sizes="(min-width: 1024px) 896px, 100vw" className="w-full h-auto rounded-xl border-2 border-[#161616]" /><figcaption className="mt-2 text-sm">{shot.caption}</figcaption></figure>)}
    {evidence.quote?.permission && <figure className="pop-card p-6"><blockquote className="font-display text-2xl">&ldquo;{evidence.quote.text}&rdquo;</blockquote><figcaption className="mt-3">{evidence.quote.attribution}</figcaption></figure>}
  </section>;
}
