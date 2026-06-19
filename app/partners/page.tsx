import PartnersApply from '@/components/partners/PartnersApply';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Partner Program. Earn 50% on every build you send',
  description:
    'Become a Modern Mustard Seed partner. Earn 50% on every build we ship (websites, AI assistants, voice agents, custom software) and 50% on every product sale. Get the full Outreach Playbook and your own booking link. Apply today.',
  path: '/partners',
});

const PERKS = [
  { big: '50%', label: 'of every build you send', detail: 'Websites, AI assistants, voice agents, and custom software. Send a client who books a build and earn half the project. This is where the real money is.' },
  { big: '50%', label: 'on every product sale', detail: 'Every playbook and program pays you half, too. The Terminal and Idea to Spec at $497 pay you $248.50 each. Same rate for everyone.' },
  { big: 'Playbook', label: 'and your own booking link', detail: 'On approval you get the full Outreach Playbook, free access to every product, and a personal link that books calls straight onto Sarah\'s calendar.' },
];

export default function PartnersPage() {
  return (
    <div className="bg-[#FBF6EA] text-[#161616]">
      <section className="relative px-6 pt-36 pb-16 text-center overflow-hidden halftone-bg">
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-6">The Partner Program</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.04] text-[#161616]">
            Open doors. Earn 50% of every build we ship
          </h1>
          <p className="mt-6 text-[#3A3733] text-lg font-body font-light max-w-2xl mx-auto leading-relaxed">
            Point small businesses to websites, AI assistants, voice agents, and custom software, and earn 50% of every build, plus 50% on every product. You open the door and book the call. Sarah closes. We give you the playbook, the scripts, and your own booking link.
          </p>
          <a href="#apply" className="inline-block mt-9 px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-extrabold text-[#161616] bg-[#F5B700] border-2 border-[#161616] rounded-full shadow-[3px_3px_0_0_#161616] hover:shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all">
            Apply to partner
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-5">
          {PERKS.map((p) => (
            <div key={p.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] p-7 text-center">
              <div className="font-display text-5xl font-semibold text-[#161616] mb-2">{p.big}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#E0301E] font-mono font-bold mb-3">{p.label}</div>
              <p className="text-[#3A3733] font-body text-sm leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 md:p-10">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3 text-center">What you get on day one</span>
          <h2 className="font-display text-3xl font-semibold text-[#161616] mb-6 text-center">A whole field guide, not just a link</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {[
              { t: 'The Outreach Playbook', d: 'A step-by-step field guide: where to find buyers, what to say, and how to turn a comment into a booked call. Plus a downloadable PDF.' },
              { t: 'Done-for-you scripts', d: 'Helpful comments, DMs, promo posts, and a full phone script, all pre-filled with your link. Copy, reword, send.' },
              { t: 'A social strategy', d: 'How to show up across groups, Facebook, Instagram, and LinkedIn so warm people come to you, with a simple daily routine.' },
              { t: 'Your own booking link', d: 'A personal link that drops people straight onto Sarah\'s calendar and tracks every build back to you for your 50%.' },
            ].map((x) => (
              <div key={x.t} className="flex gap-3">
                <span className="text-[#F5B700] text-lg leading-none mt-0.5">●</span>
                <div>
                  <h3 className="font-sans font-bold text-[#161616] mb-1">{x.t}</h3>
                  <p className="text-[#3A3733] font-body text-sm leading-relaxed">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-6 text-center">
        <h2 className="font-display text-3xl font-semibold text-[#161616] mb-4">The real why</h2>
        <p className="text-[#3A3733] font-body leading-relaxed">
          This is not a hype machine. It is a way to put genuinely good builds in front of people who need them, and to be paid well for it. One structure for everyone, the same way our prices are fixed. Honest, generous, and easy to trust. You tell people the truth, including that you earn a commission, and everyone wins.
        </p>
      </section>

      <section id="apply" className="px-6 py-14">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold block mb-3">Apply</span>
          <h2 className="font-display text-3xl font-semibold text-[#161616]">Tell us a little about you</h2>
        </div>
        <PartnersApply />
      </section>
    </div>
  );
}
