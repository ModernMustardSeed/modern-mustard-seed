import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Your Switchboard is on — Modern Mustard Seed',
  description: 'One voice, every location.',
  noindex: true,
});

export default function SwitchboardLivePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 text-[#FBF6EA]" style={{ background: 'radial-gradient(120% 130% at 80% -10%, #14203a, #05070d 62%)' }}>
      <div className="max-w-xl text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[#F5B700] font-bold">The Switchboard</p>
        <h1 className="mt-4 font-display text-4xl md:text-6xl font-extrabold leading-[1.03]">Every door is covered.</h1>
        <p className="mt-5 text-lg text-[#FBF6EA]/85 font-body">
          One voice now answers for every location. Check your inbox for a note from Sarah. Within one business day she reaches out to map your brand voice and start the rollout.
        </p>
        <div className="mt-8 text-left rounded-2xl border-2 border-[#F5B700]/40 bg-[#FBF6EA]/5 p-6 space-y-4">
          {[
            ['We map your brand', 'Your voice, hours, and booking rules become one concierge template.'],
            ['We clone it to every location', 'The same concierge and master routing on every door, live in weeks.'],
            ['Your Command Board goes live', 'Watch the recovered revenue climb across all your locations, on one login.'],
          ].map(([t, d], i) => (
            <div key={t} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#F5B700] text-[#161616] grid place-items-center font-mono font-bold text-sm">{i + 1}</span>
              <div>
                <p className="font-display text-lg font-bold">{t}</p>
                <p className="text-[#FBF6EA]/65 text-sm">{d}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link href="/switchboard" className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F5B700]/80 hover:text-[#F5B700]">&larr; Back to the Switchboard</Link>
        </div>
      </div>
    </div>
  );
}
