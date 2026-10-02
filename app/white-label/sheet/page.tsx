import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { WL_LINES, WL_PROGRAM, WL_TERMS, wlClean, wlMargin, usd } from '@/data/white-label';
import { wlKeyValid } from '@/lib/white-label/key';
import PrintButton from '@/components/white-label/PrintButton';

export const metadata = buildMetadata({
  title: 'White Label Price Sheet',
  description: 'Wholesale pricing for agencies in the White Label Program.',
  path: '/white-label/sheet',
  noindex: true,
});

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

const money = (setup: number, monthly: number) =>
  [setup ? `${usd(setup)} setup` : '', monthly ? `${usd(monthly)}/mo` : ''].filter(Boolean).join(' + ');

/**
 * The agency's price sheet. Wholesale, suggested retail and margin, signed for
 * one agency by name. Prints to one Letter page for the meeting.
 */
export default async function WhiteLabelSheetPage({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const agency = wlClean(one(q.agency));
  const ok = agency && wlKeyValid(agency, one(q.k));

  if (!ok) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#fbf5ea] px-5 text-[#0b3b44]">
        <div className="max-w-md text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-[#0a7c78]">White Label Program</p>
          <h1 className="mt-3 font-display text-3xl font-black">This price sheet is issued per agency.</h1>
          <p className="mt-4 font-body text-[#0b3b44]/75">Open it from the link Sarah sent you. If you do not have one yet, start a conversation and it arrives after a twenty minute call.</p>
          <Link href="/inquire?kind=white-label" className="mt-6 inline-flex rounded-full border-2 border-[#0b3b44] bg-[#f5b700] px-6 py-3 font-sans text-xs font-extrabold uppercase tracking-[0.18em]">
            Ask for your sheet
          </Link>
        </div>
      </div>
    );
  }

  const issued = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Denver' });
  const monthly = WL_LINES.filter((l) => l.cadence === 'monthly');
  const projects = WL_LINES.filter((l) => l.cadence === 'project');

  const table = (title: string, rows: typeof WL_LINES) => (
    <div className="mt-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#0a7c78]">{title}</h2>
      <table className="mt-1.5 w-full table-fixed border-collapse text-[12px]">
        <colgroup>
          <col className="w-[43%]" />
          <col className="w-[19%]" />
          <col className="w-[19%]" />
          <col className="w-[19%]" />
        </colgroup>
        <thead>
          <tr className="border-b-2 border-[#0b3b44] text-left text-[10px] uppercase tracking-[0.14em] text-[#0b3b44]/60">
            <th className="py-1.5 pr-3 font-bold">Service</th>
            <th className="py-1.5 pr-3 font-bold">You pay</th>
            <th className="py-1.5 pr-3 font-bold">Suggested retail</th>
            <th className="py-1.5 font-bold">Your margin</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const m = wlMargin(l);
            return (
              <tr key={l.slug} className="border-b border-[#0b3b44]/15 align-top break-inside-avoid">
                <td className="py-1.5 pr-4">
                  <p className="font-bold">{l.name}</p>
                  <p className="mt-0.5 text-[10.5px] leading-snug text-[#0b3b44]/70">{l.pitch}</p>
                </td>
                <td className="py-1.5 pr-2 font-semibold tabular-nums">{money(l.wholesale.setup, l.wholesale.monthly)}</td>
                <td className="py-1.5 pr-2 tabular-nums">{money(l.retail.setup, l.retail.monthly)}</td>
                <td className="py-1.5 font-bold tabular-nums text-[#0a7c78]">{money(m.setup, m.monthly)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#e9e4d8] py-8 print:bg-white print:py-0">
      <style>{`@page { size: Letter; margin: 0.45in; } @media print { html, body { background: #fff !important; } .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[8.5in] justify-end px-4">
        <PrintButton />
      </div>
      <article className="mx-auto max-w-[8.5in] bg-[#fbf5ea] px-10 py-9 text-[#0b3b44] shadow-xl print:max-w-none print:bg-white print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-4 border-[#f5b700] pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0a7c78]">{WL_PROGRAM.name} · Price sheet</p>
            <h1 className="mt-1.5 font-display text-[28px] font-black leading-tight">Prepared for {agency}</h1>
            <p className="mt-1 text-[12.5px] text-[#0b3b44]/75">You set the price. You keep the client. We build and run it under your name.</p>
          </div>
          <div className="shrink-0 text-right text-[11px] leading-relaxed text-[#0b3b44]/70">
            <p className="font-bold text-[#0b3b44]">Modern Mustard Seed</p>
            <p>Sarah Scarano</p>
            <p>sarah@modernmustardseed.com</p>
            <p>Issued {issued}</p>
          </div>
        </header>

        {table("Monthly services, per client", monthly)}
        {table("Projects, per client, one time", projects)}

        <div className="mt-4 grid grid-cols-3 gap-x-5 gap-y-2">
          {WL_TERMS.map((t) => (
            <div key={t.title}>
              <p className="text-[12px] font-bold">{t.title}</p>
              <p className="text-[10.5px] leading-snug text-[#0b3b44]/75">{t.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border-2 border-[#0b3b44] bg-white px-4 py-2.5 text-[11px] leading-snug">
          <p>
            <strong>Founding agency rate.</strong> The first {WL_PROGRAM.foundingAgencies} agencies keep these wholesale prices for {WL_PROGRAM.foundingMonths} months from their first client. Every voice agent answers {WL_PROGRAM.answeredMinutes} minutes a month, then takes messages; nobody gets an overage bill. One invoice a month from us covers every client.
          </p>
        </div>

        <p className="mt-3 text-[10px] text-[#0b3b44]/55">Wholesale prices on this sheet are for {agency} only. Your clients see your name and your prices, never these.</p>
      </article>
    </div>
  );
}
