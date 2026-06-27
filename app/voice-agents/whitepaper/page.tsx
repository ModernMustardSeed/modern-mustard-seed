import Link from 'next/link';
import VoiceTalkButton from '@/components/VoiceTalkButton';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { WHITEPAPER as WP } from '@/data/voice-agent-whitepaper';

export const metadata = buildMetadata({
  title: 'AI Voice Agents Whitepaper: Answer Every Call, in Any Language',
  description:
    'A field guide to AI voice agents that answer every call 24/7 in a natural human voice, remember every caller with persistent memory, speak 100+ languages, run inbound and outbound sales, book appointments, take orders, and upsell. By Modern Mustard Seed.',
  path: '/voice-agents/whitepaper',
});

const PDF = '/downloads/ai-voice-agents-whitepaper.pdf';

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Always-On Voice Agent: AI That Answers Every Call, Remembers Every Caller, and Sells 24/7',
  description: WP.subtitle,
  author: { '@type': 'Person', name: 'Sarah Scarano', url: 'https://modernmustardseed.com/about' },
  publisher: { '@id': 'https://modernmustardseed.com/#organization' },
  datePublished: WP.dateISO,
  dateModified: WP.dateISO,
  inLanguage: 'en-US',
  about: 'AI voice agents for small business',
  keywords:
    'AI voice agent, AI receptionist, multilingual voice agent, AI SDR, speed to lead, AI phone answering, voice AI for restaurants, persistent memory voice assistant',
  speakable: { '@type': 'SpeakableSpecification', cssSelector: ['h1', 'h2'] },
  mainEntityOfPage: 'https://modernmustardseed.com/voice-agents/whitepaper',
};

export default function WhitepaperPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'AI Voice Agents', url: '/voice-agents' },
            { name: 'Whitepaper', url: '/voice-agents/whitepaper' },
          ]),
          articleJsonLd,
        ]}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
        <article className="relative max-w-3xl mx-auto px-6 md:px-8">
          {/* Header */}
          <header className="mb-12">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
              Whitepaper
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight leading-[1.05] mb-5">
              {WP.title}
            </h1>
            <p className="text-[#3a3733] text-lg md:text-xl font-body leading-relaxed mb-6">{WP.subtitle}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-[0.18em] text-[#161616]/55 mb-7">
              <span>{WP.author}</span>
              <span aria-hidden="true">·</span>
              <span>{WP.dateLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{WP.readingMinutes} min read</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={PDF}
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Download the PDF
              </a>
              <Link
                href="/book"
                className="px-7 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Book a Call
              </Link>
            </div>
          </header>

          {/* Intro */}
          <p className="font-serif text-xl md:text-2xl italic text-[#161616] leading-relaxed mb-12 pb-12 border-b-2 border-[#161616]/10">
            {WP.intro}
          </p>

          {/* Sections */}
          {WP.sections.map((s, i) => (
            <section key={s.heading} className="mb-12">
              <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight mb-4 leading-snug">
                <span className="text-[#F5B700] font-mono text-base mr-2" style={{ WebkitTextStroke: '0.5px #161616' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.heading}
              </h2>
              {s.body.map((p, j) => (
                <p key={j} className="text-[#3a3733] text-base md:text-lg font-body leading-8 mb-4">
                  {p}
                </p>
              ))}
              {'bullets' in s && s.bullets && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                  {s.bullets.map((b) => (
                    <div key={b.title} className="pop-card p-5">
                      <h3 className="font-display text-lg font-black tracking-tight mb-1.5 leading-snug">{b.title}</h3>
                      <p className="text-[#3a3733] text-sm font-body leading-6">{b.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop the live demo right after "Meet the agent" */}
              {i === 1 && (
                <div className="mt-8">
                  <p className="text-center text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-4">
                    Proof, not a pitch. Pick a language and say hi.
                  </p>
                  <VoiceTalkButton />
                </div>
              )}
            </section>
          ))}

          {/* CTA */}
          <div className="text-center pop-card-yellow p-10 mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight mb-3">{WP.cta.heading}</h2>
            <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-lg mx-auto">{WP.cta.body}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/voice-agents"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Try the Live Demo
              </Link>
              <Link
                href="/book"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Book a Discovery Call
              </Link>
            </div>
          </div>

          <NewsletterSignup
            headline="More plays like this. Weekly."
            subhead="How small businesses stop the leak with AI, automation, and faster follow-up. Free to read. Free to copy."
          />
        </article>
      </div>
    </>
  );
}
