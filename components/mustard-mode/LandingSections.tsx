import Image from 'next/image';
import { tracks } from '@/data/mustard-mode/curriculum';

/** Diagonal mono marquee ticker between sections. */
export function Ticker({ reverse = false }: { reverse?: boolean }) {
  const line = 'SHIP MORE // DESIGN MORE // IDEATE MORE // COWORK WITH AI // ';
  return (
    <div className="relative overflow-hidden border-y-2 border-[#161616] bg-[#F5B700] py-2.5 select-none" aria-hidden>
      <style>{`
        @keyframes mm-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) { .mm-marquee { animation: none !important; } }
      `}</style>
      <div
        className="mm-marquee whitespace-nowrap font-mono font-bold text-[13px] tracking-[0.12em] text-[#161616]"
        style={{ animation: `mm-marquee 28s linear infinite${reverse ? ' reverse' : ''}`, width: 'max-content' }}
      >
        {line.repeat(8)}
      </div>
    </div>
  );
}

/** How it works: the method in three beats. */
export function MethodSection() {
  const beats = [
    { n: '01', title: 'Mr. Mustard trains you', body: 'A live AI coach who knows your track, your mission, and the thing you said you want to build. He gives you the next rep, checks your work, and keeps score.' },
    { n: '02', title: 'Claude does the reps', body: 'Every mission is built on your own Claude subscription. You learn by shipping real artifacts (apps, pages, specs, systems), never by watching videos.' },
    { n: '03', title: 'You keep the multiplier', body: 'XP and streaks are the game. The prize is the skill: after four tracks you run Claude like the studio does, on everything, forever.' },
  ];
  return (
    <section className="bg-[#FBF6EA] py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">The method // How it plays</p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 max-w-3xl leading-[1.02]">
          A coach, a game, and a machine that builds.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {beats.map((b) => (
            <div key={b.n} className="pop-card p-7 rounded-none">
              <span className="font-mono font-bold text-2xl text-[#F5B700]" style={{ textShadow: '1.5px 1.5px 0 #161616' }}>{b.n}</span>
              <h3 className="font-display font-extrabold text-xl text-[#161616] mt-3">{b.title}</h3>
              <p className="font-sans text-sm text-[#161616]/75 mt-2 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The four track cabinet cards. Desktop: snap rail bleeding right. Mobile: stack. */
export function TrackRail() {
  return (
    <section className="bg-[#FBF6EA] pb-20 md:pb-28 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#E0301E] uppercase">Four tracks // 28 missions // 4 boss fights</p>
        <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-[#161616] mt-3 leading-[1.02]">Pick your cabinet.</h2>
      </div>
      <div className="mt-10 md:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
        <div className="flex flex-col md:flex-row gap-6 px-6 md:px-0 md:overflow-x-auto md:snap-x md:snap-mandatory md:pb-6 md:pr-12 mm-rail">
          <style>{`
            .mm-rail::-webkit-scrollbar { height: 8px; }
            .mm-rail::-webkit-scrollbar-track { background: #16161622; }
            .mm-rail::-webkit-scrollbar-thumb { background: #F5B700; border: 1px solid #161616; }
          `}</style>
          {tracks.map((t, i) => (
            <div
              key={t.slug}
              className="md:snap-start md:shrink-0 md:w-[380px] bg-white border-2 border-[#161616] shadow-[6px_6px_0_0_#161616] p-7 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[11px] tracking-[0.14em]" style={{ color: t.color === '#F5B700' ? '#8A6A00' : t.color }}>
                  [ TRACK 0{i + 1}/04 ]
                </span>
                <span className="font-mono font-bold text-[10px] text-[#161616]/50">{t.missions.length} MISSIONS</span>
              </div>
              <h3 className="font-display italic font-extrabold text-3xl text-[#161616] mt-4">{t.name}</h3>
              <p className="font-sans text-sm text-[#161616]/75 mt-2 leading-relaxed flex-1">{t.tagline}</p>
              <div className="mt-6 border-t-2 border-dashed border-[#161616]/20 pt-4">
                <p className="font-mono font-bold text-[10px] tracking-wider text-[#E0301E] uppercase">Boss mission</p>
                <p className="font-sans text-sm font-medium text-[#161616] mt-1">{t.bossMission}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {t.missions.slice(0, 3).map((m) => (
                  <span key={m.id} className="font-mono text-[10px] font-bold text-[#161616] border border-[#161616] px-2 py-1 bg-[#FBF6EA]">
                    {m.title}
                  </span>
                ))}
                <span className="font-mono text-[10px] font-bold px-2 py-1 text-[#161616]/50">+{t.missions.length - 3} more</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Honest proof: the method is the studio's own operating system. */
export function ProofSection() {
  const stats = [
    { n: '30+', label: 'products and client systems shipped by this studio with Claude, most by one person' },
    { n: '4', label: 'live AI voice agents answering real phone numbers, built the same way you will learn' },
    { n: '1', label: 'method. The one Modern Mustard Seed runs every single day. Now with a coach.' },
  ];
  return (
    <section className="bg-[#080C16] py-20 md:py-28 border-y-2 border-[#161616]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <p className="font-mono font-bold text-[11px] tracking-[0.18em] text-[#FFDD55] uppercase">Proof // Not theory</p>
            <h2 className="font-display italic font-extrabold text-4xl md:text-6xl text-white mt-3 leading-[1.02] max-w-2xl">
              This is the studio&apos;s own operating system.
            </h2>
          </div>
          <div className="relative w-28 h-28 md:w-36 md:h-36 shrink-0 rotate-[-4deg]">
            <Image src="/brand/mascot.png" alt="Mr. Mustard, your coach" fill sizes="144px" className="object-contain drop-shadow-[4px_4px_0_rgba(245,183,0,0.9)]" />
          </div>
        </div>
        <p className="font-sans text-white/70 max-w-2xl mt-6">
          Nothing in MUSTARD MODE is a course-creator theory. Every mission, prompt, and blueprint is the
          working method behind the storefronts, voice agents, client builds, and tools Modern Mustard
          Seed ships solo, daily, with Claude. You are not buying information. You are installing an
          operating system that is already running a real studio.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {stats.map((s) => (
            <div key={s.label} className="border-2 border-white/15 bg-[#0F1422] p-6">
              <span className="font-mono font-bold text-5xl text-[#F5B700]">{s.n}</span>
              <p className="font-sans text-sm text-white/65 mt-3 leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
