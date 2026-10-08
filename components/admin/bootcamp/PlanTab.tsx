'use client';

import { GATES, LAUNCHES, PLAN_PRICES, SOFTWARE, THE_FORTY, WEEKLY_RHYTHM, launchTotals, planM, planUsd } from '@/data/bootcamp-plan';
import { card, muted, td, th } from './shared';

const longDate = (iso: string) => new Date(`${iso}T12:00:00-07:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

export default function PlanTab() {
  const t = launchTotals();

  return (
    <div className="space-y-6">
      <section className={`${card} p-5 md:p-6 bg-[#161616] border-[#161616] text-[#FBF6EA]`}>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] font-bold text-[#F5B700]">The goal</p>
        <h2 className="font-display text-3xl md:text-4xl font-semibold mt-1 text-[#FBF6EA]">{THE_FORTY.goal}</h2>
        <p className="font-body text-sm text-[#FBF6EA]/80 mt-2 max-w-2xl">{THE_FORTY.line}</p>
        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          {[
            ['Four launches', planM(t.launchTotal)],
            ['Software, collected in year', planM(t.softwareInYear)],
            ['Year total', planM(t.yearTotal)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FBF6EA]/70">{k}</p>
              <p className="font-display text-2xl md:text-3xl font-semibold text-[#F5B700]">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-[#161616]">The four launches</h2>
          <p className={muted}>
            Average ticket {planUsd(PLAN_PRICES.avgTicket)}, Operator seat {planUsd(PLAN_PRICES.operator)}, done-for-you build {planUsd(PLAN_PRICES.doneForYou)}.
          </p>
        </div>
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-[#161616] text-[#FBF6EA] text-[10px] uppercase tracking-[0.15em] font-mono">
              <tr>
                <th className={th}>Launch</th>
                <th className={th}>Masterclass</th>
                <th className={th}>Bootcamp</th>
                <th className={th}>Tickets</th>
                <th className={th}>Operator</th>
                <th className={th}>Done for you</th>
                <th className={th}>Editions</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {LAUNCHES.map((l, i) => {
                const lt = t.launches[i];
                return (
                  <tr key={l.key} className="border-t border-[#161616]/10">
                    <td className={td}>
                      <p className="font-bold">{l.name}</p>
                      <p className="font-body text-xs text-[#3A3733] max-w-xs">{l.editionsNote}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{longDate(l.masterclass)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {longDate(l.bootcampStart)} to {longDate(l.bootcampEnd)}
                    </td>
                    <td className={`${td} font-mono whitespace-nowrap`}>
                      {l.tickets.toLocaleString('en-US')}
                      <span className="block text-xs text-[#3A3733]">{planUsd(lt.ticketRevenue)}</span>
                    </td>
                    <td className={`${td} font-mono whitespace-nowrap`}>
                      {l.operatorSeats.toLocaleString('en-US')}
                      <span className="block text-xs text-[#3A3733]">{planUsd(lt.programRevenue)}</span>
                    </td>
                    <td className={`${td} font-mono whitespace-nowrap`}>
                      {l.doneForYou.toLocaleString('en-US')}
                      <span className="block text-xs text-[#3A3733]">{planUsd(lt.doneForYouRevenue)}</span>
                    </td>
                    <td className={`${td} font-mono`}>{l.tradeEditions || 'main room'}</td>
                    <td className={`${td} font-mono font-bold text-right whitespace-nowrap`}>{planUsd(lt.total)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-[#161616] bg-[#FBF6EA]">
                <td className={`${td} font-bold`}>2027, four launches</td>
                <td className={td}></td>
                <td className={td}></td>
                <td className={`${td} font-mono font-bold whitespace-nowrap`}>
                  {t.tickets.toLocaleString('en-US')}
                  <span className="block text-xs text-[#3A3733] font-normal">{planUsd(t.ticketRevenue)}</span>
                </td>
                <td className={`${td} font-mono font-bold whitespace-nowrap`}>
                  {t.operatorSeats.toLocaleString('en-US')}
                  <span className="block text-xs text-[#3A3733] font-normal">{planUsd(t.programRevenue)}</span>
                </td>
                <td className={`${td} font-mono font-bold whitespace-nowrap`}>
                  {t.doneForYou.toLocaleString('en-US')}
                  <span className="block text-xs text-[#3A3733] font-normal">{planUsd(t.doneForYouRevenue)}</span>
                </td>
                <td className={td}></td>
                <td className={`${td} font-mono font-bold text-right whitespace-nowrap`}>{planUsd(t.launchTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-3">
        <div className={`${card} p-5`}>
          <h2 className="font-display text-xl font-semibold text-[#161616]">The software line</h2>
          <p className={`${muted} mt-1`}>What the graduates keep paying for after the room closes. Run rate is December 2027.</p>
          <dl className="mt-4 space-y-3">
            {[SOFTWARE.seedside, SOFTWARE.studio].map((s) => (
              <div key={s.label} className="flex items-baseline justify-between gap-3 border-b border-[#161616]/10 pb-2">
                <dt>
                  <p className="font-bold text-sm text-[#161616]">{s.label}</p>
                  <p className="font-body text-xs text-[#3A3733]">
                    {s.count.toLocaleString('en-US')} at {planUsd(s.monthly)} a month by {s.by}
                  </p>
                </dt>
                <dd className="font-mono font-bold text-[#161616] whitespace-nowrap">{planUsd(s.count * s.monthly * 12)} / yr</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-bold text-sm text-[#161616]">Run rate, annualized</dt>
              <dd className="font-mono font-bold text-[#161616]">{planM(t.softwareRunRate)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-bold text-sm text-[#161616]">Collected inside 2027</dt>
              <dd className="font-mono font-bold text-[#161616]">{planM(t.softwareInYear)}</dd>
            </div>
          </dl>
          <p className="font-body text-xs text-[#3A3733] mt-3">{SOFTWARE.inYearNote}</p>
        </div>

        <div className={`${card} p-5`}>
          <h2 className="font-display text-xl font-semibold text-[#161616]">The week, every week</h2>
          <ol className="mt-3 space-y-2.5">
            {WEEKLY_RHYTHM.map((d) => (
              <li key={d.day} className="grid grid-cols-[96px_1fr] gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] font-bold text-[#3A3733] pt-0.5">{d.day}</span>
                <p className="font-body text-sm text-[#161616]">{d.work}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${card} p-5`}>
        <h2 className="font-display text-xl font-semibold text-[#161616]">Gates before Launch 1 opens</h2>
        <p className={`${muted} mt-1`}>Every one green before the first ad runs. No exceptions.</p>
        <ul className="mt-3 divide-y divide-[#161616]/10">
          {GATES.map((g) => (
            <li key={g.key} className="py-3 grid md:grid-cols-[280px_1fr] gap-1 md:gap-4">
              <p className="font-bold text-sm text-[#161616]">{g.label}</p>
              <p className="font-body text-sm text-[#3A3733]">{g.why}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
