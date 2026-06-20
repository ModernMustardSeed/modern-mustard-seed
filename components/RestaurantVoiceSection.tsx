import Link from 'next/link';

// Shared restaurant section: the six "what it does for a restaurant" cards plus
// the rush-hour missed-call revenue callout. Used on /voice-agents and on the
// dedicated /for/restaurants page so the copy stays in one place. Built in the
// locked MMS pop-art system. The math callout links to a #calculator anchor,
// so any page that renders this should also render the MissedCallCalculator
// inside an element with id="calculator".

const restaurantHandles = [
  {
    title: 'Takes the order, start to finish',
    body: 'Reads your menu, takes the takeout or delivery order, repeats it back, and fires it straight to your POS or kitchen (Toast, Square, Clover), with a pay link if you want payment up front.',
  },
  {
    title: 'Books and manages tables',
    body: 'Party size, time, the high chair, the window booth. Reservations land in your system without anyone leaving the floor.',
  },
  {
    title: 'Owns the dinner rush',
    body: 'Six to eight on a Friday, every line lit, every hand full. The agent answers all of them at once so no order rolls to voicemail.',
  },
  {
    title: 'Catches catering and big parties',
    body: 'The high-ticket calls get qualified, captured, and routed to you, instead of getting lost in the weeds of a busy shift.',
  },
  {
    title: 'Answers what everyone asks',
    body: 'Hours, the menu, gluten-free options, parking, "are you open on the Fourth." Answered instantly, in your words.',
  },
  {
    title: 'Upsells like a good server',
    body: 'Adds the drink, the dessert, the family meal deal, naturally, on every order. It pays for itself before the night is over.',
  },
];

export default function RestaurantVoiceSection() {
  return (
    <div className="mb-24">
      <div className="text-center mb-12">
        <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-5 block">
          For restaurants
        </span>
        <h2 className="font-display text-3xl md:text-5xl font-black text-[#161616] tracking-tight leading-[1.1]">
          Every call during the rush is an{' '}
          <span className="text-[#F5B700]" style={{ WebkitTextStroke: '1.5px #161616' }}>
            order
          </span>{' '}
          on the line
        </h2>
        <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-2xl mx-auto mt-5">
          The phone rings hardest at six o&apos;clock, the exact moment nobody can grab it. Those
          are takeout orders, tables for tonight, and catering jobs going to the place down the
          street that did pick up. Your agent answers every one, in your voice, while the kitchen
          keeps moving.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {restaurantHandles.map((h) => (
          <article key={h.title} className="pop-card p-7 md:p-8 hover:-translate-y-1 transition-transform duration-300">
            <h3 className="font-display text-xl font-black text-[#161616] tracking-tight mb-2 leading-snug">
              {h.title}
            </h3>
            <p className="text-[#3a3733] text-sm md:text-base font-body leading-7">{h.body}</p>
          </article>
        ))}
      </div>

      {/* Rush-hour missed-call math, restaurant-framed */}
      <div className="pop-card-yellow p-8 md:p-10 mt-8">
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-5 text-center">
          Do the rush-hour math
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-7">
          {[
            { figure: '15', label: 'missed calls a week' },
            { figure: '$32', label: 'average takeout ticket' },
            { figure: '$1,900+', label: 'walking out the door a month' },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <span className="font-display text-4xl md:text-5xl font-black text-[#161616] tracking-tight block mb-2">
                {m.figure}
              </span>
              <span className="text-[#161616]/70 text-sm font-body leading-snug block">{m.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[#161616]/75 text-base font-body font-medium text-center max-w-xl mx-auto mb-6">
          That is one slow week. Every unanswered call during the rush is an order, a table, or a
          catering job you already paid to ring the phone. The agent puts that revenue back on the
          line.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="#calculator"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_#161616] hover:-translate-y-0.5 transition-all"
          >
            Calculate Your Leak
          </a>
          <Link
            href="/book"
            className="px-8 py-3.5 text-[11px] uppercase tracking-[0.2em] font-sans font-extrabold text-white bg-[#161616] rounded-full border-2 border-[#161616] shadow-[4px_4px_0_0_rgba(22,22,22,0.3)] hover:-translate-y-0.5 transition-all"
          >
            Book a Call
          </Link>
        </div>
      </div>
    </div>
  );
}
