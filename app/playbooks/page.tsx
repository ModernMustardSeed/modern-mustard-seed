import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { listContent } from '@/lib/content';
import PopPageHero from '@/components/pop/PopPageHero';

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
      <div className="relative min-h-screen bg-[#fbf5ea] text-[#0b3b44]">
        <PopPageHero
          eyebrow={<span>Playbooks</span>}
          title={<>Run These{' '}<em>Yourself</em></>}
          issue={{ no: 'No.6', lines: ['Playbooks', 'Free to read'] }}
          art={{
            src: '/art/riviera/store',
            alt: 'Painting: on a sunny Riviera boutique street, Mrs. Mustard in her big hat carries striped shopping bags from a shop with a Tiffany-blue awning while Mr. Mustard carries the rest and taps his phone, the kids window-shopping',
            caption: 'Free to read, free to use',
          }}
          sticker="Free!"
          mascot={{ bubble: 'Ship it today!' }}
        >
          <p>
            The exact playbooks we run on client engagements. Free to read. Free to use. Built so you can ship them today.
          </p>
        </PopPageHero>
      <div className="relative pt-16 md:pt-20 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          {/* Featured interactive tool */}
          <Link
            href="/prompt-playbook"
            className="group block pop-card-yellow p-8 md:p-10 mb-12 hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-white bg-[#0b3b44] rounded-full px-2.5 py-1">
                Interactive tool
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#0a7c78] font-mono font-bold">
                Never used agentic tools? Start here
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-black text-[#0b3b44] tracking-tight mb-3 leading-[1.05]">
              The Agentic Prompt Playbook
            </h2>
            <p className="text-[#0b3b44]/75 text-sm md:text-base font-body leading-7 max-w-2xl">
              Pick your niche and get a full set of ready-to-paste prompts for ChatGPT or Claude, rewritten for your exact business. Copy one,
              paste it into a free tool like Claude or ChatGPT, and watch it write for you. Email yourself the branded PDF
              to keep.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44]">
              Open the playbook
              <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>

          {/* Featured guide: Claude Code for people who have never built anything */}
          <Link
            href="/fieldguide"
            className="group block pop-card p-8 md:p-10 mb-12 hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-white bg-[#0b3b44] rounded-full px-2.5 py-1">
                Free guide
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#0a7c78] font-mono font-bold">
                Want to build software yourself?
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-black text-[#0b3b44] tracking-tight mb-3 leading-[1.05]">
              The Claude Code Field Guide
            </h2>
            <p className="text-[#0b3b44]/75 text-sm md:text-base font-body leading-7 max-w-2xl">
              Claude Code builds real software from plain English, and almost nobody is shown how to drive it. This is
              the install, the loop that works, seventeen prompts you can copy, and the twelve rules we learned the
              expensive way. Written for someone who has never written a line of code.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#0b3b44]">
              Read the field guide
              <span aria-hidden className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </span>
          </Link>

          {playbooks.length === 0 ? (
            <p className="text-center text-[#0b3b44]/40 font-body italic">
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
                      <span className="text-[8px] uppercase tracking-[0.18em] font-mono font-bold text-[#0b3b44] bg-[#f5b700] border-2 border-[#0b3b44] rounded-full px-2.5 py-1">
                        {pb.tag}
                      </span>
                    )}
                    <span className="text-[10px] text-[#0b3b44]/40 font-mono">{pb.readingTime}</span>
                    {pb.gated && (
                      <span className="text-[9px] uppercase tracking-[0.25em] text-[#0a7c78] font-mono font-bold">
                        Email gated
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl md:text-2xl font-black text-[#0b3b44] tracking-tight mb-3 leading-snug">
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
      </div>
    </>
  );
}
