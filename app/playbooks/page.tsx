import Link from 'next/link';
import StaticBackground from '@/components/StaticBackground';
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
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              Playbooks
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6">
              Run These <span className="text-gradient-mustard">Yourself</span>
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed max-w-2xl mx-auto">
              The exact playbooks we run on client engagements. Free to read. Free to use. Built so you can ship them today.
            </p>
          </div>

          {playbooks.length === 0 ? (
            <p className="text-center text-white/40 font-body italic">
              First playbooks shipping this month. Subscribe to get notified.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
              {playbooks.map((pb) => (
                <Link
                  key={pb.slug}
                  href={`/playbooks/${pb.slug}`}
                  className="group glass-card p-8 hover:border-mustard-500/20 transition-all duration-500"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {pb.tag && (
                      <span className="skill-pill text-mustard-400/70 border-mustard-500/20 text-[8px]">
                        {pb.tag}
                      </span>
                    )}
                    <span className="text-[10px] text-white/25 font-mono">{pb.readingTime}</span>
                    {pb.gated && (
                      <span className="text-[9px] uppercase tracking-[0.25em] text-mustard-400/70 font-mono">
                        Email gated
                      </span>
                    )}
                  </div>
                  <h2 className="font-sans text-xl md:text-2xl font-bold text-white/90 group-hover:text-white tracking-wide mb-3 leading-snug transition-colors">
                    {pb.title}
                  </h2>
                  <p className="text-white/45 text-sm md:text-base font-body font-light leading-7">
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
