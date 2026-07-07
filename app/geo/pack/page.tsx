import { buildMetadata } from '@/lib/seo';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';
import { getGeoPack, saveGeoPack, type GeoPack } from '@/lib/geo-store';
import { generateArtifacts } from '@/lib/geo-fix-pack';
import PackViewer from '@/components/geo/PackViewer';
import Link from 'next/link';

export const metadata = buildMetadata({
  title: 'Your GEO Fix Pack',
  description: 'Your AI-findability signals, generated for your site and ready to install.',
  path: '/geo/pack',
  noindex: true,
});

export default async function GeoPackPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const sessionId = (session_id || '').trim();

  const fail = (title: string, body: string) => (
    <div className="bg-[#FBF6EA] text-[#161616] min-h-screen flex items-center justify-center px-5">
      <div className="max-w-md text-center rounded-2xl border-2 border-[#161616] bg-white p-8 shadow-[6px_6px_0_0_#161616]">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-bold mb-3">[ GEO DESK ]</p>
        <h1 className="font-display text-2xl font-black">{title}</h1>
        <p className="font-body text-sm text-[#161616]/70 mt-3 leading-relaxed">{body}</p>
        <Link href="/website-audit" className="inline-block mt-5 font-sans font-extrabold text-xs uppercase tracking-[0.18em] text-[#1E50C8] underline underline-offset-4">
          Back to the audit →
        </Link>
      </div>
    </div>
  );

  if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(sessionId)) {
    return fail('That link is missing its ticket.', 'Open your pack from the checkout success page or the link in your receipt email.');
  }

  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe || !supabase) return fail('The desk is dark for a moment.', 'Try again in a minute; your purchase is safe and this page regenerates on every visit.');

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return fail('That ticket did not scan.', 'Use the exact link from your receipt email, or reply to it and Sarah will sort you out.');
  }
  if (session.payment_status !== 'paid' || session.metadata?.kind !== 'geo') {
    return fail('This ticket has no pack on it.', 'Packs come with THE FIX PACK and THE FULL DESK. If you believe this is wrong, reply to your receipt.');
  }
  const slug = session.metadata?.slug || '';
  if (!['geo-fixpack', 'geo-fulldesk', 'geo-installed'].includes(slug)) {
    return fail('This plan is watch-only.', 'THE WATCH delivers by email every month. Your first re-grade is on its way.');
  }

  const url = session.metadata?.url || '';
  let pack: GeoPack | null = await getGeoPack(supabase, sessionId);

  if (!pack && url) {
    // Lazy generation: the webhook usually got here first, but the pack page
    // can always rebuild from the paid session (resilient by design).
    const generated = await generateArtifacts(url);
    if (generated) {
      pack = {
        url,
        email: session.customer_details?.email || '',
        business: generated.business,
        artifacts: generated.artifacts,
        generatedAt: new Date().toISOString(),
        rerunsUsed: 0,
        lastScore: generated.score,
        lastGrade: generated.grade,
      };
      await saveGeoPack(supabase, sessionId, pack);
    }
  }

  if (!pack) {
    return fail('Your pack is still on the press.', 'Give it one minute and refresh. If it keeps happening, reply to your receipt and Sarah will hand-deliver it.');
  }

  return (
    <div className="bg-[#FBF6EA] text-[#161616] min-h-screen">
      <PackViewer sessionId={sessionId} pack={pack} />
    </div>
  );
}
