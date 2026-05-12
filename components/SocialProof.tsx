import { stats } from '@/data/projects';

export default function SocialProof() {
  return (
    <section className="w-full px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-20">
      <div className="glass-card p-6 md:p-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center opacity-0 animate-fade-in-up">
              <span className="block font-sans text-2xl md:text-3xl font-semibold text-gradient-mustard tracking-tight mb-1">
                {stat.value}
              </span>
              <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-white/40 font-mono font-bold">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
