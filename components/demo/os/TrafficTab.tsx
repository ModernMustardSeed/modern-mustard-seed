'use client';

import { useMemo } from 'react';
import { SectionTitle, StatCard, hash, useOs } from './os-kit';

/**
 * WEBSITE: the site half of the command center. Your new website is not a
 * brochure that sits there, it feeds the same board as your phone. This module
 * shows the traffic and analytics an owner actually reads: who is visiting,
 * where they came from, what they looked at, and how many turned into leads
 * that landed in Customers.
 *
 * Deterministic (hash-seeded, hydration-safe) and honestly labeled sample; the
 * real build wires the business's live analytics the day the site goes up.
 */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TrafficTab() {
  const { config, preset, theme, say } = useOs();
  const h = hash(config.business + 'traffic');

  const data = useMemo(() => {
    const visitors = 180 + (h % 260);
    const prev = Math.round(visitors * (0.74 + (h % 12) / 100));
    const trend = Math.round(((visitors - prev) / prev) * 100);
    const leads = 7 + (h % 16);
    const calls = 4 + (h % 9);
    const conv = Math.max(1, Math.round(((leads + calls) / visitors) * 100));
    // 7-day bar series, deterministic, weekend dip, today (Fri here) tallest-ish.
    const series = DAYS.map((d, i) => {
      const weekend = i >= 5 ? 0.55 : 1;
      return Math.round(((visitors / 7) * weekend) * (0.7 + ((hash(config.business + d) % 60) / 100)));
    });
    const peak = Math.max(...series, 1);

    const sources = [
      { name: 'Google & AI search', pct: 44 + (h % 8), icon: '🔎' },
      { name: 'Direct', pct: 20 + (h % 6), icon: '↗' },
      { name: 'Facebook & Instagram', pct: 16 + (h % 6), icon: '📣' },
      { name: 'Referral & Maps', pct: 8 + (h % 5), icon: '⭐' },
    ];
    const sSum = sources.reduce((s, x) => s + x.pct, 0);
    sources.forEach((s) => (s.pct = Math.round((s.pct / sSum) * 100)));

    const svc = preset.label || 'Services';
    const pages = [
      { name: 'Home', views: Math.round(visitors * 0.9) },
      { name: `${svc} & pricing`, views: Math.round(visitors * (0.42 + (h % 10) / 100)) },
      { name: 'Book online', views: Math.round(visitors * (0.3 + (h % 8) / 100)) },
      { name: 'Reviews', views: Math.round(visitors * (0.22 + (h % 7) / 100)) },
      { name: 'About', views: Math.round(visitors * (0.16 + (h % 6) / 100)) },
    ].sort((a, b) => b.views - a.views);
    const pPeak = Math.max(...pages.map((p) => p.views), 1);

    return { visitors, trend, leads, calls, conv, series, peak, sources, pages, pPeak };
  }, [config.business, h, preset.label]);

  return (
    <div className="max-w-3xl">
      <SectionTitle title="Website" sub="Your site is not a brochure. It works. Here is who is visiting, where they came from, and how many became leads on your board." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Visitors"
          value={data.visitors.toLocaleString()}
          sub={`this week · ${data.trend >= 0 ? '▲' : '▼'} ${Math.abs(data.trend)}% vs last`}
          i={0}
          pulse
        />
        <StatCard label="Leads from the site" value={String(data.leads)} sub="forms filled, filed in Customers" i={1} />
        <StatCard label="Calls from the site" value={String(data.calls)} sub="tapped your number to call" i={2} />
        <StatCard label="Visitor to lead" value={`${data.conv}%`} sub="better than most local sites" i={3} />
      </div>

      {/* 7-day traffic bars */}
      <div className="rounded-2xl border p-5 mb-4 animate-[osIn_.5s_ease-out_.05s_both]" style={{ background: theme.panel, borderColor: theme.line }}>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: theme.dim }}>Visitors, last 7 days</p>
          <p className="font-mono text-[12px] font-bold" style={{ color: theme.accent }}>{data.visitors.toLocaleString()} total</p>
        </div>
        <div className="flex items-end gap-2" style={{ height: 160 }}>
          {data.series.map((v, i) => (
            <div key={DAYS[i]} className="flex-1 h-full flex flex-col items-center min-w-0">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${Math.max(6, (v / data.peak) * 100)}%`,
                    background: i === 4 ? theme.accent : theme.accentSoft,
                    border: `1px solid ${theme.accent}`,
                    transition: 'height .6s ease-out',
                  }}
                  title={`${v} visitors`}
                />
              </div>
              <span className="mt-1.5 text-[10px]" style={{ color: theme.dim }}>{DAYS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-4">
        {/* Where they came from */}
        <div className="rounded-2xl border p-5 animate-[osIn_.5s_ease-out_.1s_both]" style={{ background: theme.panel, borderColor: theme.line }}>
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3.5" style={{ color: theme.dim }}>Where they came from</p>
          <div className="space-y-3">
            {data.sources.map((s, i) => (
              <div key={s.name} className="animate-[osIn_.4s_ease-out_both]" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[13px]" style={{ color: theme.text }}><span aria-hidden>{s.icon}</span> {s.name}</span>
                  <span className="font-mono text-[12px]" style={{ color: theme.dim }}>{s.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.panelSoft }}>
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: theme.accent }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top pages */}
        <div className="rounded-2xl border p-5 animate-[osIn_.5s_ease-out_.15s_both]" style={{ background: theme.panel, borderColor: theme.line }}>
          <p className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-3.5" style={{ color: theme.dim }}>Most-visited pages</p>
          <div className="space-y-3">
            {data.pages.map((p, i) => (
              <div key={p.name} className="animate-[osIn_.4s_ease-out_both]" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[13px] truncate pr-2" style={{ color: theme.text }}>{p.name}</span>
                  <span className="font-mono text-[12px] shrink-0" style={{ color: theme.dim }}>{p.views.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: theme.panelSoft }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.round((p.views / data.pPeak) * 100)}%`, background: theme.accent }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The tie-in: the site and the phone feed ONE board. */}
      <button
        onClick={() => say(`${data.leads} website leads and ${data.calls} calls landed in Customers this week. One board, phone and website together.`)}
        className="w-full text-left rounded-2xl border-2 p-4 flex items-center gap-4 animate-[osIn_.5s_ease-out_.2s_both] hover:brightness-110 transition-all"
        style={{ background: theme.accentSoft, borderColor: theme.accent }}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: theme.accent }}>Your website and your phone, one board</span>
          <span className="block text-[13px] mt-1" style={{ color: theme.dim }}>
            Every form on the site and every call to your number lands in the same place, with the AI already following up. See where they went.
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-2xl font-bold" style={{ color: theme.text }}>{data.leads + data.calls}</span>
          <span className="block text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: theme.accent }}>new leads →</span>
        </span>
      </button>

      <p className="text-[12px] mt-3" style={{ color: theme.dim }}>
        Sample analytics. The day your site goes live, this fills with your real traffic, and every form and call feeds Customers automatically.
      </p>
    </div>
  );
}
