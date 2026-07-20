import BuildQueueForm from '@/components/BuildQueueForm';
import { JsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Join the Build Queue',
  description:
    'Idea to shipped product in weeks, not months. Now booking new builds. Drop your idea and Sarah will review it personally.',
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
      <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-36 md:pt-44 pb-28">
        <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-50 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 md:px-8">
          <div className="text-center mb-12">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
              The Build Queue
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black text-[#161616] tracking-tight mb-6 leading-[1.05]">
              Now Booking{' '}
              <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                New Builds
              </span>
              <br />
              Drop Your Idea
            </h1>
            <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-xl mx-auto mb-3">
              Whether you need your first real website or a custom AI tool, drop the idea below. Sarah reads every entry and replies fast, usually the same day.
            </p>
            <p className="text-[#161616]/50 text-sm font-body leading-relaxed max-w-xl mx-auto">
              You do not need to know what to call it. You do not need to know anything about AI. Tell us what you are trying to do and we will figure out the rest together.
            </p>
          </div>

          <BuildQueueForm />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="pop-card p-6">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                Timeline
              </span>
              <span className="font-display text-lg font-black text-[#161616]">1 to 4 weeks</span>
            </div>
            <div className="pop-card p-6">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                Availability
              </span>
              <span className="font-display text-lg font-black text-[#161616]">Now booking</span>
            </div>
            <div className="pop-card p-6">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold mb-2">
                Scope
              </span>
              <span className="font-display text-lg font-black text-[#161616]">Fixed up front</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
