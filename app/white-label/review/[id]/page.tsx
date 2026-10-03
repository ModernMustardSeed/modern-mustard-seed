import type { Metadata } from 'next';
import { getAgency, getClient } from '@/lib/white-label/store';
import { accessKeyValid } from '@/lib/white-label/key';
import { deliveries, emptyDelivery } from '@/lib/white-label/delivery';
import ReviewFeedback from '@/components/white-label/ReviewFeedback';
import { wlSans } from '@/components/white-label/font';
import { wlInk, wlColor } from '@/data/white-label';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { absolute: 'Your Delivery Review' }, description: 'Review your delivery and request changes with your agency.', robots: { index: false, follow: false }, referrer: 'no-referrer', icons: { icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="14" fill="%23161616"/%3E%3Cpath d="M17 33l10 10 20-23" fill="none" stroke="white" stroke-width="6"/%3E%3C/svg%3E' }, openGraph: { title: 'Your Delivery Review', description: 'Your preview, feedback and next steps.', siteName: 'Delivery Review', images: [] }, twitter: { card: 'summary', title: 'Your Delivery Review', description: 'Your preview, feedback and next steps.', images: [], site: undefined, creator: undefined } };

export default async function ClientReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ k?: string }> }) {
  const { id } = await params;
  const { k } = await searchParams;
  const client = accessKeyValid('review', id, k) ? await getClient(id) : null;
  const agency = client ? await getAgency(client.agency_id) : null;
  if (!client || !agency || !['approved', 'active'].includes(agency.status) || !['review', 'building', 'live'].includes(client.status)) return <main className={`${wlSans.className} grid min-h-screen place-items-center bg-[#f6f5f2] px-5`}><div className="max-w-md"><h1 className="text-3xl font-black">This review is not available.</h1><p className="mt-4 text-neutral-600">Ask your agency for the current review link. They will send it when the work is ready.</p></div></main>;
  const delivery = (await deliveries([id]))[id] ?? emptyDelivery;
  const color = wlColor(agency.color || '');
  return <div className={`${wlSans.className} min-h-screen bg-[#f6f5f2] text-neutral-900`}>
    <header style={{ background: color, color: wlInk(color) }} className="px-5 py-10"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest">From {agency.name}</p><h1 className="mt-4 text-4xl font-black tracking-tight">Your work, ready to review.</h1><p className="mt-3 text-lg">{client.business}</p></div></header>
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      <section className="rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">What to test</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-neutral-600">{delivery.summary || 'Your agency is preparing the next review.'}</p><div className="mt-5 flex flex-wrap gap-3">{delivery.url && <a href={delivery.url} target="_blank" rel="noopener noreferrer" className="min-h-11 rounded-full bg-neutral-900 px-5 py-3 text-sm font-bold text-white">Open preview</a>}{client.test_number && <a href={`tel:${client.test_number.replace(/[^+0-9]/g, '')}`} className="min-h-11 rounded-full border border-neutral-300 px-5 py-3 text-sm font-bold">Call {client.test_number}</a>}</div></section>
      <section className="rounded-2xl border border-black/10 bg-white p-6"><h2 className="text-xl font-black">Make it right for your business.</h2><p className="mt-2 text-sm leading-relaxed text-neutral-600">Test the main customer journey, the details of your business, and the handoff to your team. Your agency handles final approval and launch.</p>{delivery.feedback && <p className="mt-4 whitespace-pre-line rounded-xl bg-neutral-100 p-4 text-sm"><strong>Latest request:</strong> {delivery.feedback}</p>}<ReviewFeedback id={id} reviewKey={k!} /></section>
      <p className="text-center text-sm text-neutral-500">Prepared by {agency.name}. Changes to this delivery are included.</p>
    </main>
  </div>;
}
