'use client';

/**
 * THE DOOR TO THE COMMAND CENTER, standing in the portal.
 *
 * The portal is where a client watches what we are building for them. The
 * Command Center is where they run the business we built. Two products, two
 * doors, two sign-ins: this card is the one place they meet, so an owner
 * never has to remember an address.
 */
export default function CommandCenterDoor({ business, preview }: { business?: string | null; preview?: boolean }) {
  const rooms = [
    ['Leads', 'Who reached out, who is still waiting on a call.'],
    ['Inbox', 'Mail read twice an hour, sorted, replies drafted.'],
    ['Conversations', 'What people asked your website, in their words.'],
    ['Reviews', 'The ask that goes out the day a job closes.'],
    ['Marketing', 'What goes out this week, in your own words.'],
    ['Operator', 'Ask anything. It drafts, asks, marks and makes.'],
  ];

  return (
    <section className="rounded-2xl border-2 border-[#161616] bg-[#0F1218] text-white overflow-hidden shadow-[6px_6px_0_0_#161616]">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        <div className="p-6 sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">Your Command Center</p>
          <h2 className="mt-2 font-display text-[26px] sm:text-[30px] leading-tight">{business ? `${business}, on one board.` : 'The whole business, on one board.'}</h2>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-white/70">
            Everything that has to keep running whether or not anyone is watching it. It opens with its own sign-in, a code to your email, so it stays yours even when this portal is quiet.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="/cc"
              className="inline-flex items-center gap-2 rounded-lg bg-[#F5B700] px-5 py-3 text-[14px] font-extrabold text-[#161616] hover:brightness-95"
            >
              Open the Command Center
              <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden><path d="M4 10h11M11.5 6.5 15 10l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">{preview ? 'Your look pass opens it too' : 'Separate sign-in'}</span>
          </div>
        </div>
        <ul className="border-t-2 lg:border-t-0 lg:border-l-2 border-[#161616] bg-white/[0.03] p-6 sm:p-8 space-y-3">
          {rooms.map(([name, blurb]) => (
            <li key={name} className="flex gap-3 text-[13.5px] leading-relaxed text-white/70">
              <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-[#F5B700]" />
              <span>
                <span className="font-semibold text-white">{name}. </span>
                {blurb}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
