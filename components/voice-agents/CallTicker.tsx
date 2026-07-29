/**
 * A sample night on the line, scrolling edge to edge.
 *
 * Illustrative, not a call log: these are the shapes of calls a voice agent
 * handles between closing time and the next morning, and the band says so out
 * loud. No invented business names, no fabricated proof.
 */

const NIGHT = [
  { time: '5:41p', line: 'Quote request, twelve minutes after you locked up', tag: 'Booked' },
  { time: '6:58p', line: 'Party of six, two allergies, a high chair', tag: 'Reserved' },
  { time: '7:22p', line: '"Are you open tomorrow?"', tag: 'Answered' },
  { time: '8:04p', line: 'Takeout order, repeated back, sent to the kitchen', tag: 'Fired' },
  { time: '9:36p', line: 'Price shopper comparing three companies', tag: 'Qualified' },
  { time: '11:10p', line: 'Spanish-speaking caller, handled in Spanish', tag: 'Answered' },
  { time: '1:47a', line: 'Water heater burst. Flagged urgent, your phone rings', tag: 'Escalated' },
  { time: '4:15a', line: 'Early bird booking the first slot of the day', tag: 'Booked' },
  { time: '6:02a', line: 'Callback number captured, summary in your inbox', tag: 'Logged' },
];

const TAG_COLOR: Record<string, string> = {
  Booked: '#1E50C8',
  Reserved: '#1E50C8',
  Fired: '#1E50C8',
  Escalated: '#E0301E',
  Answered: '#8f6600',
  Qualified: '#8f6600',
  Logged: '#8f6600',
};

function Row({ item }: { item: (typeof NIGHT)[number] }) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap border-r-2 border-[#161616]/12 px-6 py-4">
      <span className="font-mono text-[11px] font-bold tabular-nums text-[#161616]/70">{item.time}</span>
      <span className="font-body text-sm md:text-[15px] text-[#161616]">{item.line}</span>
      <span
        className="rounded-full border-2 border-[#161616] bg-white px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em]"
        style={{ color: TAG_COLOR[item.tag] ?? '#161616' }}
      >
        {item.tag}
      </span>
    </div>
  );
}

export default function CallTicker() {
  return (
    <div className="relative overflow-hidden border-y-2 border-[#161616] bg-[#F5B700]">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex" aria-hidden={copy === 1 ? 'true' : undefined}>
            {NIGHT.map((item) => (
              <Row key={`${copy}-${item.time}`} item={item} />
            ))}
          </div>
        ))}
      </div>
      {/* Edge fades so the loop never shows a seam */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#F5B700] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#F5B700] to-transparent"
      />
    </div>
  );
}
