import { getSupabase } from '@/lib/supabase';
import { buildMetadata } from '@/lib/seo';
import { formatUsd } from '@/lib/demo-order';
import DemoOrderIntake from '@/components/demo/DemoOrderIntake';

export const metadata = buildMetadata({ title: 'Order confirmed', noindex: true });
export const dynamic = 'force-dynamic';

/**
 * Stripe success page for a demo order: confirmation + the two-minute intake
 * that lets us customize and release within 7 days. Keyed by hubId + the
 * Stripe session id (both unguessable), no login.
 */
export default async function DemoOrderThanksPage({
  params,
  searchParams,
}: {
  params: Promise<{ hubId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { hubId } = await params;
  const { session_id: sessionId } = await searchParams;
  const sb = getSupabase();

  const fallback = (
    <div className="min-h-screen bg-[#FBF6EA] flex items-center justify-center px-6">
      <div className="max-w-md text-center bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8">
        <h1 className="font-display text-3xl font-bold text-[#161616]">We could not find that order</h1>
        <p className="font-body text-[#161616]/70 mt-3">
          If you just paid, your receipt is in your email and Sarah already got the order. Call (406) 312-1223 and we
          will sort anything out on the spot.
        </p>
      </div>
    </div>
  );

  if (!sb || !sessionId || !/^[0-9a-f-]{36}$/i.test(hubId)) return fallback;

  const { data: order } = await sb
    .from('demo_orders')
    .select('id, business_name, products, setup_cents, monthly_cents, status')
    .eq('hub_demo_id', hubId)
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
  if (!order) return fallback;

  const products = Array.isArray(order.products) ? (order.products as string[]) : [];
  const business = order.business_name || 'your business';
  const already = order.status === 'intake_done' || order.status === 'delivered';

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="halftone-bg border-b-2 border-[#161616]">
        <div className="max-w-2xl mx-auto px-6 pt-10 pb-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mascot.png" alt="Mr. Mustard" width={90} height={90} className="mx-auto" />
          <span className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.3em] font-bold bg-[#E0301E] text-[#FBF6EA] border-2 border-[#161616] px-3 py-1.5">
            Order confirmed
          </span>
          <h1 className="font-display text-4xl font-bold mt-4 leading-tight">It&apos;s yours. Welcome aboard.</h1>
          <p className="font-body text-[#161616]/70 mt-3 max-w-lg mx-auto">
            {business} is in production ({formatUsd(order.monthly_cents)}/mo + {formatUsd(order.setup_cents)} setup,
            month to month, cancel anytime). We customize everything by hand and release it within 7 days.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold">One last thing: two minutes of details</h2>
          <p className="font-body text-[#161616]/70 mt-1.5">
            This is what makes it feel like {business} and not a template.
          </p>
        </div>
        {already ? (
          <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[6px_6px_0_0_#161616] p-8 text-center">
            <h3 className="font-display text-xl font-bold">Your details are already in</h3>
            <p className="font-body text-[#161616]/70 mt-2">
              Sarah has everything. Watch your inbox; go-live is inside 7 days.
            </p>
          </div>
        ) : (
          <DemoOrderIntake hubId={hubId} sessionId={sessionId} products={products} business={business} />
        )}
        <p className="font-mono text-[11px] text-[#161616]/40 text-center pb-6">
          Modern Mustard Seed · Kalispell, MT · (406) 312-1223 · sarah@modernmustardseed.com
        </p>
      </main>
    </div>
  );
}
