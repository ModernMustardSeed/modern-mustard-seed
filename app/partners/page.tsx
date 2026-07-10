import Image from 'next/image';
import PartnersApply from '@/components/partners/PartnersApply';
import PartnerEarningsCalculator from '@/components/partners/PartnerEarningsCalculator';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Partner Program. Earn 50% on products, recurring on every business you refer',
  description:
    'Become a Modern Mustard Seed partner. Earn 50% on every playbook and bundle, 25% every month on any business you put on an AI receptionist (for a year), and up to 20% on custom builds. Free access to everything, your own link, and a done-for-you playbook. Apply today.',
  path: '/partners',
});

const LADDER = [
  {
    rung: '01',
    rate: '50%',
    accent: '#1E50C8',
    label: 'On every product',
    detail: 'Share a playbook or bundle and earn half the second someone buys. A $67 guide pays you $33.50, the $197 Builder Bundle pays you about $98. Same rate for everyone, paid on every sale.',
    tag: 'The easy front door',
  },
  {
    rung: '02',
    rate: '25%',
    accent: '#F5B700',
    label: 'Recurring, every month',
    detail: 'Put a business on a 24/7 AI receptionist and earn a quarter of what they pay, every single month, for a full year. Refer ten and you have built yourself a monthly check that shows up whether you work or not.',
    tag: 'The part that compounds',
  },
  {
    rung: '03',
    rate: '10-20%',
    accent: '#E0301E',
    label: 'On custom builds',
    detail: 'Send a business that needs a real build (a site, an AI assistant, a voice agent, custom software) and earn 10% of the project. Once you are closing them regularly we move you to Producer rates, up to 20%.',
    tag: 'The biggest checks',
  },
];

const DAY_ONE = [
  { t: 'Free access to everything', d: 'Every playbook and program is yours, free, so you only ever recommend what you have actually used.' },
  { t: 'Your own tracked link', d: 'A personal link that follows your people for 60 days and ties every sale, sub, and build back to you.' },
  { t: 'The Outreach Playbook', d: 'A full field guide plus done-for-you scripts (comments, DMs, posts, a phone script) pre-filled with your link. Copy, reword, send.' },
  { t: 'Real earnings, real fast', d: 'Products pay the moment someone buys. The receptionist pays you monthly. Builds are the big ones. No cap on any of it.' },
];

export default function PartnersPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      {/* Hero */}
      <section className="relative px-6 pt-36 pb-16 overflow-hidden halftone-bg">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-6">The Partner Program</span>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.02] text-[#161616]">
            Recommend tools you<br className="hidden sm:block" /> believe in. Get paid for years.
          </h1>
          <p className="mt-7 text-[#3A3733] text-lg font-body font-light max-w-2xl mx-auto leading-relaxed">
            Share our AI playbooks and earn 50% on every sale. Send a business to a 24/7 AI receptionist and earn 25% of their bill every month, for a year. Point a bigger client to a build and earn up to 20%. You bring the trust. We do the work and pay you well.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#apply" className="inline-block px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[4px_4px_0_0_#161616] hover:shadow-[6px_6px_0_0_#161616] hover:-translate-y-0.5 transition-all">
              Apply to partner
            </a>
            <a href="#math" className="text-[12px] uppercase tracking-[0.18em] font-mono font-bold text-[#161616]/70 hover:text-[#161616] transition-colors underline underline-offset-4 decoration-[#F5B700] decoration-2">
              See what you could earn
            </a>
          </div>
        </div>

        {/* Framed brand film: the Sidekick "Graduate" spot (the AI receptionist
            partners earn recurring on). On-brand comic frame + hard shadow. */}
        <div className="relative z-10 max-w-4xl mx-auto mt-14">
          <div className="rounded-3xl overflow-hidden border-[3px] border-[#161616] bg-[#161616] shadow-[10px_10px_0_0_#161616]">
            <video
              className="w-full aspect-video object-cover block"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
              style={{ backgroundColor: '#161616' }}
            >
              <source src="/video/sidekick-16x9.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      {/* The ladder */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Three ways to earn, one honest program</span>
          <h2 className="font-display text-4xl font-semibold text-[#161616]">Start with products. Grow into recurring.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {LADDER.map((r) => (
            <div key={r.rung} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-xs font-bold text-[#161616]/40 tracking-[0.2em]">{r.rung}</span>
                <span className="text-[9px] uppercase tracking-[0.2em] font-mono font-bold px-2.5 py-1 rounded-full border-2 border-[#161616]" style={{ background: r.accent, color: r.accent === '#F5B700' ? '#161616' : '#FBF6EA' }}>{r.tag}</span>
              </div>
              <div className="font-display text-6xl font-bold text-[#161616] leading-none mb-1">{r.rate}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#161616]/60 font-mono font-bold mb-4">{r.label}</div>
              <p className="text-[#3A3733] font-body text-sm leading-relaxed">{r.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Signature moment: earnings calculator */}
      <section id="math" className="max-w-5xl mx-auto px-6 pb-16 scroll-mt-24">
        <PartnerEarningsCalculator />
      </section>

      {/* What you get day one */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white border-2 border-[#161616] rounded-3xl shadow-[6px_6px_0_0_#161616] p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="shrink-0 mx-auto md:mx-0">
              <Image src="/brand/mascot.png" alt="The Modern Mustard Seed mascot" width={885} height={1180} className="h-40 w-auto" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">What you get on day one</span>
              <h2 className="font-display text-3xl font-semibold text-[#161616] mb-6">A whole field guide, not just a link</h2>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                {DAY_ONE.map((x) => (
                  <div key={x.t} className="flex gap-3">
                    <span className="text-[#F5B700] text-lg leading-none mt-0.5">●</span>
                    <div>
                      <h3 className="font-sans font-bold text-[#161616] mb-1 text-[15px]">{x.t}</h3>
                      <p className="text-[#3A3733] font-body text-sm leading-relaxed">{x.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The real why */}
      <section className="max-w-3xl mx-auto px-6 pb-16 text-center">
        <h2 className="font-display text-3xl font-semibold text-[#161616] mb-4">The real why</h2>
        <p className="text-[#3A3733] font-body leading-relaxed text-lg">
          This is not a hype machine. It is a way to put genuinely good tools in front of people who need them, and to be paid well for it. One structure for everyone, the same way our prices are fixed. Honest, generous, and easy to trust. You tell people the truth, including that you earn a commission, and everyone wins.
        </p>
      </section>

      {/* Apply */}
      <section id="apply" className="px-6 py-16 scroll-mt-20 halftone-bg">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Apply</span>
          <h2 className="font-display text-4xl font-semibold text-[#161616]">Tell us a little about you</h2>
          <p className="text-[#3A3733] font-body mt-3 max-w-xl mx-auto">Sarah reviews every application personally. Approved partners get their link, free access, and the playbook the same day.</p>
        </div>
        <PartnersApply />
      </section>
    </div>
  );
}
