import StaticBackground from '@/components/StaticBackground';
import BuildQueueForm from '@/components/BuildQueueForm';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Join the Build Queue',
  description:
    'Idea to shipped product in 30 days. Four builds per quarter. Waitlist gated. Drop your idea and Sarah will review it personally.',
  path: '/build-queue',
});

export default function BuildQueuePage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: 'Build Queue', url: '/build-queue' },
        ])}
      />
      <StaticBackground />

      <div className="relative pt-36 md:pt-44 pb-28">
        <div className="max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.5em] text-mustard-500 font-mono font-bold mb-6 block">
              The Build Queue
            </span>
            <h1 className="font-sans text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6 leading-[1.05]">
              Four Builds <span className="text-gradient-mustard">a Quarter</span>
              <br />
              Pick Your Slot
            </h1>
            <p className="text-white/55 text-lg font-body font-light leading-relaxed max-w-xl mx-auto mb-3">
              Whether you need your first real website or a custom AI tool, drop the idea below. Sarah reads every entry and replies within 3 business days.
            </p>
            <p className="text-white/40 text-sm font-body font-light leading-relaxed max-w-xl mx-auto">
              You do not need to know what to call it. You do not need to know anything about AI. Tell us what you are trying to do and we will figure out the rest together.
            </p>
          </div>

          <BuildQueueForm />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="glass-card p-6">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-2">
                Timeline
              </span>
              <span className="font-sans text-lg font-bold text-white">30 days</span>
            </div>
            <div className="glass-card p-6">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-2">
                Builds per quarter
              </span>
              <span className="font-sans text-lg font-bold text-white">4 slots</span>
            </div>
            <div className="glass-card p-6">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-mustard-500/60 font-mono font-bold mb-2">
                Scope
              </span>
              <span className="font-sans text-lg font-bold text-white">Fixed up front</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
