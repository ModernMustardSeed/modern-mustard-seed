import PartnersApply from '@/components/partners/PartnersApply';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Partner Program. Earn 50% sharing tools you believe in',
  description:
    'Become a Modern Mustard Seed partner. Earn 50% on every product sale and 10% of build fees, with free access to everything so you can speak to it honestly. Apply today.',
  path: '/partners',
});

const PERKS = [
  { big: '50%', label: 'on every product sale', detail: 'The Terminal and Idea to Spec at $497 pay you $248.50 each. Every playbook pays half. Same rate for everyone.' },
  { big: '10%', label: 'of every build fee', detail: 'Send a client who buys a done-for-you build and earn 10% of the project, the long game that compounds.' },
  { big: 'Free', label: 'access to everything', detail: 'On approval you get every product, free, so you actually learn them and can speak to them honestly.' },
];

export default function PartnersPage() {
  return (
    <div className="bg-[#080c16] text-white">
      <section className="relative px-6 pt-36 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(ellipse at top, rgba(31,66,128,0.7) 0%, #080c16 60%)' }} aria-hidden />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold-light/85 font-mono font-bold block mb-6">The Partner Program</span>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-[1.04] text-cream-50">
            Get paid generously to share tools you believe in
          </h1>
          <p className="mt-6 text-cream-100/85 text-lg font-body font-light max-w-2xl mx-auto leading-relaxed">
            Help people learn to build, and earn 50% on every product and 10% of every build you send our way. Free access to all of it, because you should sell what you actually use.
          </p>
          <a href="#apply" className="inline-block mt-9 px-9 py-4 text-[11px] uppercase tracking-[0.22em] font-sans font-bold text-cream-50 bg-brass rounded-full campfire-glow hover:shadow-[0_0_40px_rgba(255,107,53,0.5)] transition-all">
            Apply to partner
          </a>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-5">
          {PERKS.map((p) => (
            <div key={p.label} className="glass-card p-7 text-center">
              <div className="font-display text-5xl font-semibold text-gradient-brass mb-2">{p.big}</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-gold-light/80 font-mono font-bold mb-3">{p.label}</div>
              <p className="text-white/55 font-body text-sm leading-relaxed">{p.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-10 text-center">
        <h2 className="font-display text-3xl font-semibold text-cream-50 mb-4">The real why</h2>
        <p className="text-white/65 font-body leading-relaxed">
          This is not a hype machine. It is a way to put genuinely good tools in front of people who need them, and to be paid well for it. One structure for everyone, the same way our prices are fixed. Honest, generous, and easy to trust. You tell your audience the truth, including that you earn a commission, and everyone wins.
        </p>
      </section>

      <section id="apply" className="px-6 py-14">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.4em] text-gold-light/80 font-mono font-bold block mb-3">Apply</span>
          <h2 className="font-display text-3xl font-semibold text-cream-50">Tell us a little about you</h2>
        </div>
        <PartnersApply />
      </section>
    </div>
  );
}
