import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import type { MailerDeskData } from '@/lib/mailer/desk';
import { prettyPhone } from '@/lib/mailer/preview';

/**
 * The Mailer desk.
 *
 * Server rendered on purpose: every number here is a count and a count does not
 * need a spinner. The whole page is one read.
 *
 * The Follow Up list is the point. Everything above it is context for it.
 */

const money = (cents: number): string => `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (n: number, d: number): string => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : '—');

function ago(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white border-2 border-[#161616] p-5" style={{ boxShadow: '4px 4px 0 0 #161616' }}>
      <div className="text-[10px] uppercase tracking-[0.24em] font-mono font-bold text-[#161616]/50 mb-2">{label}</div>
      <div className="font-display text-3xl font-black text-[#161616] leading-none">{value}</div>
      {sub ? <div className="text-[12px] text-[#161616]/55 mt-1.5 leading-snug">{sub}</div> : null}
    </div>
  );
}

export default function MailerDesk({ data }: { data: MailerDeskData }) {
  const { stats, warm } = data;

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="mailer" title="The Mailer" />

      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="text-[10px] uppercase tracking-[0.4em] text-[#E0301E] font-mono font-bold mb-3">The Mailer</div>
        <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight leading-none mb-3">
          The channel that cannot bounce.
        </h1>
        <p className="text-[#3a3733] max-w-3xl leading-relaxed mb-8">
          A postcard showing a business their own finished website, with a seven character code on the back. The
          card does not close anybody. It buys a hand raise, and a hand raise is the consent the calling machine
          has never had enough of.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <Stat label="Mailable" value={stats.mailable.toLocaleString()} sub={`${stats.unverified.toLocaleString()} addresses still unverified`} />
          <Stat label="Cards sent" value={stats.sent.toLocaleString()} sub={stats.failed ? `${stats.failed} failed at the printer` : 'no failures'} />
          <Stat label="Opened" value={stats.viewed.toLocaleString()} sub={`${pct(stats.viewed, stats.sent)} of cards sent`} />
          <Stat label="Claimed" value={stats.claimed.toLocaleString()} sub={`${pct(stats.claimed, stats.viewed)} of the people who opened`} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Stat label="Postage spent" value={money(stats.spentCents)} sub={stats.sent ? `${money(Math.round(stats.spentCents / stats.sent))} a card` : 'nothing mailed yet'} />
          <Stat
            label="Booked from it"
            value={money(stats.claimed * 49700)}
            sub={`plus ${money(stats.claimed * 49700)} a month recurring`}
          />
          <Stat
            label="Cost per hand raise"
            value={stats.viewed ? money(Math.round(stats.spentCents / stats.viewed)) : '—'}
            sub="what one consented conversation costs"
          />
          <Stat
            label="Cost per client"
            value={stats.claimed ? money(Math.round(stats.spentCents / stats.claimed)) : '—'}
            sub={stats.claimed ? 'against $994 first payment' : 'no claims yet'}
          />
        </div>

        {/* ------------------------------------------------------------------ */}
        <div className="flex items-baseline gap-4 mb-4">
          <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight">Follow Up</h2>
          <span className="text-[13px] text-[#161616]/55">
            {warm.length === 0 ? 'nobody waiting' : `${warm.length} opened their card and have not bought`}
          </span>
        </div>

        {warm.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#161616]/30 p-8 text-center text-[#161616]/55 mb-12">
            Nobody has opened a card yet. Run a drop, then this list fills itself.
          </div>
        ) : (
          <div className="bg-white border-2 border-[#161616] overflow-hidden mb-12" style={{ boxShadow: '5px 5px 0 0 #F5B700' }}>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#161616] text-white text-[10px] uppercase tracking-[0.2em] font-mono">
                  <th className="px-4 py-3 font-bold">Business</th>
                  <th className="px-4 py-3 font-bold">Where</th>
                  <th className="px-4 py-3 font-bold">Call</th>
                  <th className="px-4 py-3 font-bold">Opened</th>
                  <th className="px-4 py-3 font-bold text-right">Looks</th>
                  <th className="px-4 py-3 font-bold text-right">Their page</th>
                </tr>
              </thead>
              <tbody>
                {warm.map((lead, i) => (
                  <tr key={lead.id} className={i % 2 ? 'bg-[#FBF6EA]' : 'bg-white'}>
                    <td className="px-4 py-3 font-bold align-top">{lead.business_name}</td>
                    <td className="px-4 py-3 text-[#161616]/70 align-top whitespace-nowrap">
                      {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 align-top whitespace-nowrap">
                      {lead.phone ? (
                        <a className="underline font-semibold" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>
                          {prettyPhone(lead.phone)}
                        </a>
                      ) : (
                        <span className="text-[#161616]/40">no number</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#161616]/70 align-top whitespace-nowrap">{ago(lead.mail_first_view_at)}</td>
                    <td className="px-4 py-3 text-right align-top tabular-nums font-semibold">{lead.mail_view_count ?? 1}</td>
                    <td className="px-4 py-3 text-right align-top">
                      {lead.mail_code ? (
                        <Link
                          href={`/y/${lead.mail_code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-[#F5B700] border-2 border-[#161616] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em]"
                        >
                          {lead.mail_code}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight mb-4">Drops</h2>
        {stats.byCampaign.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#161616]/30 p-8 text-center text-[#161616]/55">
            No drops yet. The runner is{' '}
            <code className="bg-[#161616] text-[#F5B700] px-2 py-0.5 text-[12px]">
              npx tsx scripts/mailer/run-campaign.mts --campaign &lt;name&gt; --limit 25
            </code>
          </div>
        ) : (
          <div className="bg-white border-2 border-[#161616] overflow-hidden" style={{ boxShadow: '5px 5px 0 0 #161616' }}>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#161616] text-white text-[10px] uppercase tracking-[0.2em] font-mono">
                  <th className="px-4 py-3 font-bold">Drop</th>
                  <th className="px-4 py-3 font-bold text-right">Sent</th>
                  <th className="px-4 py-3 font-bold text-right">Opened</th>
                  <th className="px-4 py-3 font-bold text-right">Claimed</th>
                  <th className="px-4 py-3 font-bold text-right">Spent</th>
                  <th className="px-4 py-3 font-bold text-right">Booked</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCampaign.map((c, i) => (
                  <tr key={c.campaign} className={i % 2 ? 'bg-[#FBF6EA]' : 'bg-white'}>
                    <td className="px-4 py-3 font-bold">{c.campaign}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {c.viewed.toLocaleString()} <span className="text-[#161616]/45">({pct(c.viewed, c.sent)})</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">{c.claimed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{money(c.spentCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold">{money(c.claimed * 49700)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
