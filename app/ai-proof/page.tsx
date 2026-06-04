import Link from 'next/link';
import NewsletterSignup from '@/components/NewsletterSignup';
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';
import { bookingUrl } from '@/data/socials';

export const metadata = buildMetadata({
  title: 'AI-Proof Your Business',
  description:
    'Audit, harden, and re-equip an existing business so the next decade is one you own. Defensive AI work for owners with revenue to protect.',
  path: '/ai-proof',
});

const phases = [
  {
    eyebrow: 'Phase 1',
    title: 'Audit the moat',
    body:
      'We map every workflow in your business against the AI shift. We name the parts AI will eat first, the parts that compound when you own the AI layer, and the parts a competitor could automate around you. You leave with a written report and a prioritized risk list.',
  },
  {
    eyebrow: 'Phase 2',
    title: 'Harden the operation',
    body:
      'We deploy AI where it defends margin and protects customer relationships. Voice agents on the front line. Automation in the back office. Internal copilots for your team. The premise is simple: own your AI stack before a competitor uses theirs to take you out.',
  },
  {
    eyebrow: 'Phase 3',
    title: 'Re-equip the team',
    body:
      'AI literacy is not a workshop. It is a working system your team uses daily. We train, document, and instrument the tools so your operators can run them long after we leave. The defensive work compounds because the team compounds.',
  },
];

const faq = [
  {
    q: 'How is this different from the Idea to Product offer?',
    a: 'Idea to Product builds something new. AI-Proof defends something existing. If you already have customers, revenue, and a working operation, this is the right path. If you have an idea and no product yet, the Idea to Product offer is the right one.',
  },
  {
    q: 'What businesses is this for?',
    a: 'Service businesses, professional firms, brick-and-mortar operators, regional brands, anyone with real revenue and real customers who can see the AI wave coming. Most clients are doing $500K to $10M in annual revenue when they engage.',
  },
  {
    q: 'How long does it take?',
    a: 'Phase 1 is two weeks. Phase 2 is six to twelve weeks. Phase 3 is ongoing. Most engagements run a full quarter and continue as a monthly retainer if the work compounds.',
  },
  {
    q: 'What does it cost?',
    a: 'Quoted per business after a free discovery call. We will know within one conversation whether this is a fit and what the right scope is.',
  },
];

export default function AiProofPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', url: '/' },
            { name: 'AI-Proof Your Business', url: '/ai-proof' },
          ]),
          faqJsonLd(faq),
        ]}
      />
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 md:px-8">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              AI-Proof Your Business
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6 leading-[1.05]">
              Defend the{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                Moat
              </span>
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto">
              For owners who already built something real. We audit your operation against the AI shift, harden the surfaces AI will hit first, and re-equip your team to run the new stack. Your business stays yours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {phases.map((p) => (
              <article key={p.title} className="pop-card p-8 md:p-10 hover:-translate-y-1 transition-transform duration-300">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-3">
                  {p.eyebrow}
                </span>
                <h2 className="font-display text-xl md:text-2xl font-black text-[#161616] tracking-tight mb-4 leading-snug">
                  {p.title}
                </h2>
                <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{p.body}</p>
              </article>
            ))}
          </div>

          <div className="pop-card-yellow p-10 mb-20">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#161616] font-mono font-bold block mb-3 text-center">
              The premise
            </span>
            <p className="text-[#161616] text-lg md:text-xl font-display font-bold leading-relaxed text-center max-w-3xl mx-auto italic">
              &ldquo;If AI is going to reshape your industry, you have two choices. Build the AI-native version of your business before someone else does. Or stand still while a competitor does it to you.&rdquo;
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-20">
            <div className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-black text-[#161616] tracking-tight mb-3">
                Common{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
                  Questions
                </span>
              </h2>
            </div>
            <div className="space-y-4">
              {faq.map((item) => (
                <details key={item.q} className="pop-card p-6 group cursor-pointer">
                  <summary className="flex justify-between items-start gap-4 list-none">
                    <h3 className="font-display text-lg font-black text-[#161616] tracking-tight">
                      {item.q}
                    </h3>
                    <span className="text-[#E0301E] text-2xl flex-shrink-0 transition-transform group-open:rotate-45 font-black">
                      +
                    </span>
                  </summary>
                  <p className="text-[#3a3733] text-sm md:text-base font-body leading-7 mt-4">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>

          <div className="text-center pop-card-yellow p-10 mb-16">
            <h3 className="font-display text-2xl md:text-3xl font-black text-[#161616] tracking-tight mb-4">
              Ready to defend the moat?
            </h3>
            <p className="text-[#161616]/75 text-base font-body font-medium mb-6 max-w-lg mx-auto">
              Book a 30-minute discovery call. One conversation, one scoped quote, no decks.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
              >
                Book a Discovery Call
              </a>
              <Link
                href="/audit"
                className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
              >
                Run the Free Audit First
              </Link>
            </div>
          </div>

          <NewsletterSignup
            headline="AI-proofing playbooks. Weekly."
            subhead="Real plays for defending an existing business through the AI shift. Free to read. Free to copy."
          />
        </div>
      </div>
    </>
  );
}
