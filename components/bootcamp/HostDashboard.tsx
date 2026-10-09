import Link from 'next/link';
import { HOSTS, OPERATOR, bootcampTiers, usd } from '@/data/bootcamp';
import CopyButton from './CopyButton';
import { Kicker } from './ui';

/**
 * A host's private page. Everything on it is already normalised by the page
 * (numbers default to zero, lists to empty) so this only lays it out.
 */

export type HostView = {
  name: string;
  brand: string | null;
  slug: string;
  status: string;
  founding: boolean;
  ticketPct: number;
  programPct: number;
  approvedAt: string | null;
};

export type HostStatsView = {
  clicks: number;
  masterclass: number;
  tickets: number;
  ticketsByTier: Partial<Record<'ga' | 'vip' | 'platinum', number>> | null;
  ticketRevenueCents: number;
  operatorSeats: number;
  earningsCents: number;
};

export type HostEventView = { at: string; label: string; cents?: number };

export type SwipeView = { id: string; title: string; channel: string; body: string; note?: string };

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
}

function Stat({ n, label, gold = false }: { n: string; label: string; gold?: boolean }) {
  return (
    <div className={`rounded-[4px] border-2 border-[#141210] p-5 ${gold ? 'bg-[#f5b700]' : 'bg-white'}`}>
      <p className="font-display text-3xl sm:text-4xl font-black tracking-tight leading-none text-[#141210]">{n}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#141210]/70 mt-2.5 font-bold">{label}</p>
    </div>
  );
}

export default function HostDashboard({
  host,
  stats,
  recent,
  links,
  swipe,
}: {
  host: HostView;
  stats: HostStatsView;
  recent: HostEventView[];
  links: { share: string; masterclass: string };
  swipe: SwipeView[];
}) {
  const live = host.status === 'approved' || host.status === 'live';
  const tiers = stats.ticketsByTier;
  const shareText = (body: string) => body.replace(/\{\{\s*link\s*\}\}/gi, links.share).replace(/\{\{\s*masterclass\s*\}\}/gi, links.masterclass);

  return (
    <div className="bg-[#fcfaf3] text-[#141210]">
      <section className="border-b-2 border-[#141210] bg-[#141210] text-[#fcfaf3]">
        <div className="max-w-5xl mx-auto px-5 pt-28 pb-12 md:pt-32 md:pb-16">
          <Kicker dark>Host dashboard · {host.founding ? 'Founding host' : HOSTS.name}</Kicker>
          <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-[1.05]">
            {host.brand || host.name}, <em>your room.</em>
          </h1>
          <p className="font-body text-[#fcfaf3]/80 leading-relaxed mt-4 max-w-2xl">
            You keep {host.ticketPct}% of every ticket sold through your link and {host.programPct}% of every Operator seat that follows. Paid within ten days after Day 3.
            {!live && ' Your link goes live the moment Sarah approves the application; until then the numbers below stay at zero.'}
          </p>
          <div className="mt-8 rounded-[4px] border-2 border-[#e8ecd0] bg-[#0f4c47] p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#e8ecd0] font-bold">Your share link</p>
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <code className="font-mono text-sm sm:text-base break-all text-[#fcfaf3] bg-[#141210] rounded-lg px-4 py-3 flex-1 border border-[#fcfaf3]/15">{links.share}</code>
              <CopyButton text={links.share} label="Copy link" />
            </div>
            <p className="font-body text-xs text-[#fcfaf3]/60 mt-3">
              It sets a 180-day cookie and lands on the offer page. For the free masterclass directly:{' '}
              <span className="font-mono break-all text-[#fcfaf3]/85">{links.masterclass}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-12 md:py-16" aria-labelledby="numbers-heading">
        <Kicker>The numbers</Kicker>
        <h2 id="numbers-heading" className="font-display text-2xl md:text-4xl font-black tracking-tight">What your link has done.</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <Stat n={stats.clicks.toLocaleString('en-US')} label="Clicks" />
          <Stat n={stats.masterclass.toLocaleString('en-US')} label="Masterclass seats" />
          <Stat n={stats.tickets.toLocaleString('en-US')} label="Tickets" />
          <Stat n={usd(stats.earningsCents)} label="Owed to you" gold />
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="rounded-[4px] border-2 border-[#141210] bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0f4c47] font-bold">Tickets by seat</p>
            <ul className="mt-3 divide-y divide-[#141210]/10">
              {bootcampTiers.map((t) => (
                <li key={t.slug} className="flex items-center justify-between py-2.5 font-body text-[15px]">
                  <span>{t.name} <span className="text-[#141210]/50">· {usd(t.priceCents)}</span></span>
                  <span className="font-display font-black">{tiers ? (tiers[t.slug] ?? 0) : stats.tickets > 0 ? '·' : 0}</span>
                </li>
              ))}
              <li className="flex items-center justify-between py-2.5 font-body text-[15px]">
                <span>{OPERATOR.name} <span className="text-[#141210]/50">· {usd(OPERATOR.priceCents)}</span></span>
                <span className="font-display font-black">{stats.operatorSeats}</span>
              </li>
            </ul>
            {!tiers && stats.tickets > 0 && <p className="font-body text-xs text-[#141210]/55 mt-2">The split by seat shows once the first payout runs.</p>}
            <p className="font-body text-sm mt-3 pt-3 border-t-2 border-[#141210]/10 flex justify-between">
              <span className="text-[#141210]/70">Ticket revenue through your link</span>
              <span className="font-display font-black">{usd(stats.ticketRevenueCents)}</span>
            </p>
          </div>
          <div className="rounded-[4px] border-2 border-[#141210] bg-white p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0f4c47] font-bold">Recent activity</p>
            {recent.length === 0 ? (
              <div className="mt-4 rounded-[4px] border-2 border-dashed border-[#141210]/25 p-5 text-center">
                <p className="font-display font-black text-lg">Nothing yet.</p>
                <p className="font-body text-sm text-[#141210]/65 mt-1.5">The first click through your link shows up here within a minute. Post the swipe copy below and come back.</p>
              </div>
            ) : (
              <ol className="mt-3 divide-y divide-[#141210]/10">
                {recent.slice(0, 12).map((e, i) => (
                  <li key={`${e.at}-${i}`} className="py-2.5 flex items-start justify-between gap-4 font-body text-[14.5px]">
                    <span>
                      {e.label}
                      {typeof e.cents === 'number' && e.cents > 0 && <span className="ml-2 font-display font-black text-[#0f4c47]">+{usd(e.cents)}</span>}
                    </span>
                    <time dateTime={e.at} className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#141210]/55 shrink-0 mt-1">{when(e.at)}</time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      <section className="border-t-2 border-[#141210] bg-[#e8ecd0]" aria-labelledby="swipe-heading">
        <div className="max-w-5xl mx-auto px-5 py-12 md:py-16">
          <Kicker>Swipe copy</Kicker>
          <h2 id="swipe-heading" className="font-display text-2xl md:text-4xl font-black tracking-tight">Ready to post. Your link is already in it.</h2>
          <p className="font-body text-[#141210]/75 leading-relaxed mt-3 max-w-2xl">Change anything you like. Your audience knows your voice; ours is only the starting point.</p>
          {swipe.length === 0 ? (
            <div className="mt-8 rounded-[4px] border-2 border-dashed border-[#141210]/30 bg-white/60 p-6">
              <p className="font-display font-black text-lg">The kit is on its way.</p>
              <p className="font-body text-sm text-[#141210]/65 mt-1.5">Your approval email carries the first set. Until then, the share link above is all you need.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-5 mt-8">
              {swipe.map((c) => {
                const body = shareText(c.body);
                return (
                  <article key={c.id} className="rounded-[4px] border-2 border-[#141210] bg-white p-5 sm:p-6 flex flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0f4c47] font-bold">{c.channel}</p>
                        <h3 className="font-display text-lg font-black mt-1">{c.title}</h3>
                      </div>
                      <CopyButton text={body} />
                    </div>
                    <pre className="mt-4 whitespace-pre-wrap font-body text-[14.5px] leading-relaxed text-[#141210]/85 flex-1">{body}</pre>
                    {c.note && <p className="font-body text-xs text-[#141210]/55 mt-3 border-t border-[#141210]/10 pt-3">{c.note}</p>}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-5 py-12 md:py-16">
        <div className="rounded-[4px] border-2 border-[#141210] bg-white p-6 sm:p-8 shadow-[6px_6px_0_0_#f5b700] grid md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#0f4c47] font-bold">The terms, in one place</p>
            <ul className="mt-3 space-y-1.5 font-body text-[15px] text-[#141210]/85">
              {HOSTS.terms.map((t) => <li key={t}>· {t}</li>)}
            </ul>
          </div>
          <div className="flex flex-col gap-3 md:min-w-[220px]">
            <Link href="/bootcamp" className="inline-flex items-center justify-center rounded-full border-2 border-[#141210] bg-[#141210] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#fcfaf3]">The offer page</Link>
            <a href="mailto:sarah@modernmustardseed.com" className="inline-flex items-center justify-center rounded-full border-2 border-[#141210] bg-white px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#141210]">Email Sarah</a>
          </div>
        </div>
      </section>
    </div>
  );
}
