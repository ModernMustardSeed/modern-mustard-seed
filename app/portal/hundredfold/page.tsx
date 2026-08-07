import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import HundredfoldCommandCenter from '@/components/hundredfold/CommandCenter';
import { getClientSession } from '@/lib/client-auth';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({ title: 'Your Hundredfold', noindex: true });
export const dynamic = 'force-dynamic';

export default async function PortalHundredfoldPage() {
  const session = await getClientSession();
  if (!session) redirect('/portal/login');

  return (
    <main className="min-h-screen bg-[#FBF6EA] text-[#161616] pt-10 pb-24">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <Link
          href="/portal"
          className="text-[10px] uppercase tracking-[0.25em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
        >
          ← Your portal
        </Link>
        <h1 className="mt-4 mb-7 font-display text-3xl md:text-4xl font-black tracking-tight">
          Your Command Center
        </h1>
        <HundredfoldCommandCenter />
      </div>
    </main>
  );
}
