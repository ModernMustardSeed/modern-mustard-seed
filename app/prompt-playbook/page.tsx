import Link from 'next/link';
import PromptPlaybookTool from '@/components/PromptPlaybookTool';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata, SITE } from '@/lib/seo';
import { CATEGORIES } from '@/data/prompt-playbook';

export const metadata = buildMetadata({
  title: 'The AI Prompt Playbook',
  description:
    'Ready-to-paste AI prompts for people who have never used Claude or ChatGPT. Pick your niche and get a full playbook customized to your business: emails, social posts, sales, and more. Free, with a branded PDF.',
  path: '/prompt-playbook',
});

const playbookFaq = [
  {
    q: 'What is the AI Prompt Playbook?',
    a: 'A free collection of ready-to-paste prompts for people who want to use AI tools like Claude or ChatGPT but have never actually done it. You pick your niche and every prompt is rewritten for your exact business, covering the emails you keep putting off, a week of social posts, proposals, summarizing long documents, and making decisions. Copy any prompt with one tap, or email yourself the whole thing as a branded PDF.',
  },
  {
    q: 'I have literally never used AI. Is this for me?',
    a: 'Yes, this is built exactly for you. AI tools are just a chat box: you open claude.ai or chatgpt.com (both have a free version, no credit card), paste one of these prompts, and press enter. The playbook includes a two-minute primer on how it works and the four parts of a good prompt, so you can start today with zero experience.',
  },
  {
    q: 'Is it free, and which AI do I need?',
    a: 'The playbook is completely free, including the PDF. The prompts work in any major AI chat tool. Claude (claude.ai) and ChatGPT (chatgpt.com) both have a free tier that needs no credit card. Paste a prompt into either one and it works.',
  },
  {
    q: 'Is it customized to my industry?',
    a: 'Yes. Pick your niche (solopreneur, trades and home services, retail and ecommerce, health and wellness, real estate and sales, coaches and consultants, creators and marketers, or ministry and nonprofit) and every prompt adjusts to sound like it was written for your specific business. There is also a general path for any other kind of work.',
  },
  {
    q: 'Can Modern Mustard Seed build AI into my business for me?',
    a: 'Yes. Prompts are the starting point. We build the AI voice and chat agents, the automations, and the systems that answer, book, and follow up for you around the clock, usually shipped in weeks, not months. Most people use the playbook to get comfortable with AI, then have us wire the real thing into their business.',
  },
];

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to start using AI with ready-made prompts',
  description:
    'How a complete beginner can start using AI tools like Claude or ChatGPT with customized, ready-to-paste prompts.',
  totalTime: 'PT10M',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Pick your niche', text: 'Choose the option that matches your business so every prompt is tailored to you.' },
    { '@type': 'HowToStep', position: 2, name: 'Open a free AI tool', text: 'Open claude.ai or chatgpt.com. Both have a free version with no credit card required.' },
    { '@type': 'HowToStep', position: 3, name: 'Copy and paste a prompt', text: 'Tap Copy on any prompt, paste it into the chat box, fill in the bracketed blanks, and press enter.' },
    { '@type': 'HowToStep', position: 4, name: 'Refine the answer', text: 'If it is not quite right, tell it to make it shorter, more casual, or try again.' },
  ],
};

export default function PromptPlaybookPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'Playbooks', url: '/playbooks' },
            { name: 'The AI Prompt Playbook', url: '/prompt-playbook' },
          ]),
          faqJsonLd(playbookFaq),
          howToJsonLd,
        ]}
      />

      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-24">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative">
          {/* Hero */}
          <div className="max-w-3xl mx-auto px-6 md:px-8 text-center mb-14">
            <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-6 block">
              Free tool · Never used AI? Start here
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight leading-[1.08] mb-6">
              The AI{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Prompt Playbook
              </span>
            </h1>
            <p className="text-[#3a3733] text-base md:text-lg font-body leading-relaxed max-w-2xl mx-auto mb-4">
              Want to use AI but never have? Pick your niche and get a full set of ready-to-paste prompts, rewritten for
              your exact business. Copy one, paste it into a free AI tool, and watch it write the email, the posts, or the
              proposal for you. No experience needed.
            </p>
            <p className="text-[#161616]/50 text-sm font-body italic mb-7">
              Pick your niche, copy the prompts you like, and email yourself the branded PDF to keep.
            </p>
            <CategoryPills />
            <a
              href="#get-it"
              className="inline-block px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-[#F5B700] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
            >
              Get the free PDF →
            </a>
          </div>

          {/* The tool */}
          <PromptPlaybookTool />

          {/* CTA to us */}
          <div className="max-w-4xl mx-auto px-6 md:px-8 mt-20">
            <div className="pop-card-yellow p-10 text-center">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#161616] font-mono font-bold mb-4 block">
                Ready for AI that works while you sleep?
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
                Prompts are step one. We build the whole engine.
              </h2>
              <p className="text-[#161616]/75 text-base font-body font-medium mb-7 max-w-xl mx-auto">
                Once you see what a good prompt can do, imagine an AI agent that answers your phone, books your
                appointments, and follows up with every lead, around the clock. That is what we build, and it ships in
                weeks, not months.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/voice-agents"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
                >
                  Meet Mr. Mustard, our AI agent
                </Link>
                <Link
                  href="/work-with-us"
                  className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.35)] hover:-translate-y-0.5 transition-all"
                >
                  See how we work
                </Link>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-8 mt-20">
            <NewsletterSignup
              headline="Get the AI plays we use in real client builds."
              subhead="One short email a week. The same systems on this playbook, broken down so you can run them yourself."
            />
          </div>
        </div>
      </div>
    </>
  );
}

/** Small pills that preview what the playbook covers. Static, above the fold. */
function CategoryPills() {
  return (
    <div className="flex flex-wrap justify-center gap-2 mb-8">
      {CATEGORIES.filter((c) => c.id !== 'start').map((c) => (
        <span
          key={c.id}
          className="text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616]/70 bg-white border-2 border-[#161616]/20 rounded-full px-3 py-1.5"
        >
          {c.title}
        </span>
      ))}
    </div>
  );
}
