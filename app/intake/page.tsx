import ClientIntakeForm from '@/components/ClientIntakeForm';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Brand Intake',
  description: 'Tell us about your brand and products so we can build your store.',
  path: '/intake',
  noindex: true,
});

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? '';
}

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const brandName = first(sp.brand);
  const ownerName = first(sp.owner);
  const email = first(sp.email);
  const greetName = ownerName ? ownerName.split(/\s+/)[0] : '';

  return (
    <div className="relative min-h-screen bg-[#FBF6EA] text-[#161616] pt-32 md:pt-40 pb-28">
      <div aria-hidden="true" className="absolute inset-0 halftone-bg opacity-40 pointer-events-none" />
      <div className="relative max-w-3xl mx-auto px-6 md:px-8">
        <header className="text-center mb-12">
          <span className="text-[10px] uppercase tracking-[0.5em] text-[#E0301E] font-mono font-bold mb-6 block">
            {brandName ? brandName : 'Brand Intake'} · Modern Mustard Seed
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-black text-[#161616] tracking-tight mb-6 leading-[1.05]">
            {greetName ? (
              <>
                Let&rsquo;s build your store,{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  {greetName}
                </span>
              </>
            ) : (
              <>
                Let&rsquo;s build{' '}
                <span className="text-[#F5B700]" style={{ WebkitTextStroke: '2px #161616' }}>
                  your store
                </span>
              </>
            )}
          </h1>
          <p className="text-[#3a3733] text-lg font-body leading-relaxed max-w-xl mx-auto mb-3">
            This is the one form that tells me everything I need to design a beautiful, shoppable
            store and website for you. It takes about ten minutes, and you can skip anything you are
            not sure about.
          </p>
          <p className="text-[#161616]/55 text-sm font-body leading-relaxed max-w-xl mx-auto">
            There is no cost for this build. The more you share, especially photos, the more it will
            feel truly yours.
          </p>
        </header>

        <ClientIntakeForm brandName={brandName} ownerName={ownerName} email={email} />
      </div>
    </div>
  );
}
