import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { listContent } from '@/lib/content';

export const metadata = buildMetadata({
  title: 'Playbooks',
  description:
    'Battle-tested playbooks for building, shipping, and running a real business. Free to read, copy, and run yourself. New playbooks added monthly.',
  path: '/playbooks',
});

export default function PlaybooksPage() {
  const playbooks = listContent('playbooks');

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Playbooks', url: '/playbooks' },
        ])}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              Playbooks
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6">
              Run These{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Yourself
              </span>
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto">
              The exact playbooks we run on client engagements. Free to read. Free to use. Built so you can ship them today.
            </p>
          </div>

          {playbooks.length === 0 ? (
            <p className="text-center text-[#161616]/40 font-body italic">
              First playbooks shipping this month. Subscribe to get notified.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
              {playbooks.map((pb) => (
                <Link
                  key={pb.slug}
                  href={`/playbooks/${pb.slug}`}
                  className="group pop-card p-8 hover:-translate-y-1 transition-transform duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {pb.tag && (
                      <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full px-2.5 py-1">
                        {pb.tag}
                      </span>
                    )}
                    <span className="text-[10px] text-[#161616]/40 font-mono">{pb.readingTime}</span>
                    {pb.gated && (
                      <span className="text-[9px] uppercase tracking-[0.25em] text-[#E0301E] font-mono font-bold">
                        Email gated
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-3 leading-snug">
                    {pb.title}
                  </h2>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">
                    {pb.description}
                  </p>
                </Link>
              ))}
            </div>
          )}

          <NewsletterSignup
            headline="Get every new playbook the day it ships."
            subhead="One email per drop. Subscribers get the PDF version of each playbook free."
          />
        </div>
      </div>
    </>
  );
}
