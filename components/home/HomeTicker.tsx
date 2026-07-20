/** Diagonal mono marquee ticker between homepage beats (MUSTARD MODE language). */
export default function HomeTicker({ reverse = false }: { reverse?: boolean }) {
  const line = 'SITES // VOICE AGENTS // COMMAND CENTERS // CUSTOM APPS // LIVE IN AS LITTLE AS A WEEK // YOU OWN THE CODE // ';
  return (
    <div className="relative overflow-hidden border-y-2 border-[#161616] bg-[#F5B700] py-2.5 select-none" aria-hidden>
      <style>{`
        @keyframes mm-home-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .mm-home-marquee:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .mm-home-marquee { animation: none !important; } }
      `}</style>
      <div
        className="mm-home-marquee whitespace-nowrap font-mono font-bold text-[13px] tracking-[0.12em] text-[#161616]"
        style={{ animation: `mm-home-marquee 30s linear infinite${reverse ? ' reverse' : ''}`, width: 'max-content' }}
      >
        {line.repeat(6)}
      </div>
    </div>
  );
}
