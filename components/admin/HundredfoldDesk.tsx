'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { HUNDREDFOLD, money } from '@/lib/hundredfold';

/**
 * The HUNDREDFOLD desk. Who is in the funnel, who has been interviewed, and how
 * many seats are left.
 *
 * Ordered by heat rather than by date: a finished interview is the hottest lead
 * this business produces, so those sit at the top no matter when they landed.
 */

type Member = {
  id: string;
  email: string;
  name: string | null;
  business_name: string | null;
  host: string | null;
  status: string;
  roadmap_slug: string | null;
  deep_roadmap: unknown;
  offer: unknown;
  started_at: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  applicant: 'bg-white text-[#161616]/70 border-[#161616]/30',
  interviewing: 'bg-[#1E50C8]/10 text-[#1E50C8] border-[#1E50C8]/40',
  interviewed: 'bg-[#E0301E]/12 text-[#C4160B] border-[#C4160B]/45',
  offered: 'bg-[#F5B700]/30 text-[#8f6600] border-[#8f6600]/45',
  active: 'bg-[#2F7D32]/12 text-[#2F7D32] border-[#2F7D32]/45',
  paused: 'bg-[#161616]/8 text-[#161616]/60 border-[#161616]/30',
  alumni: 'bg-[#161616]/8 text-[#161616]/60 border-[#161616]/30',
  declined: 'bg-[#161616]/5 text-[#161616]/40 border-[#161616]/20',
};

/** Interviewed first. That row is a person waiting for a plan. */
const HEAT = ['interviewed', 'offered', 'interviewing', 'active', 'applicant', 'paused', 'alumni', 'declined'];

export default function HundredfoldDesk() {
  const [members, setMembers] = useState<Member[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/hundredfold');
      const data = await res.json();
      if (data.ok) {
        setMembers(data.members as Member[]);
        setActive(Number(data.active) || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = [...members].sort((a, b) => {
    const d = HEAT.indexOf(a.status) - HEAT.indexOf(b.status);
    return d !== 0 ? d : +new Date(b.created_at) - +new Date(a.created_at);
  });

  const counts = HEAT.map((s) => ({ s, n: members.filter((m) => m.status === s).length })).filter((x) => x.n);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="hundredfold" title="Hundredfold" />

      <main className="max-w-7xl mx-auto px-5 md:px-8 py-8 md:py-10">
        <header className="mb-8">
          <span className="block text-[9px] uppercase tracking-[0.4em] font-mono font-bold text-[#C4160B] mb-3">
            The flagship
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">HUNDREDFOLD</h1>
          <p className="mt-2 text-[#161616]/70 font-body text-sm md:text-base max-w-2xl leading-relaxed">
            {money(HUNDREDFOLD.setupCents)} to start, then {money(HUNDREDFOLD.monthlyCents)} a month.{' '}
            <Link href="/hundredfold" target="_blank" className="text-[#1E50C8] font-semibold hover:text-[#161616]">
              Open the sales page
            </Link>
          </p>
        </header>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Paying members', value: active },
            { label: 'Waiting on a plan', value: members.filter((m) => m.status === 'interviewed').length },
            { label: 'Interviews taken', value: members.filter((m) => m.status !== 'applicant').length },
            { label: 'Monthly recurring', value: money(HUNDREDFOLD.monthlyCents * active) },
          ].map((s) => (
            <div key={s.label} className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5">
              <span className="block text-[9px] uppercase tracking-[0.28em] font-mono font-bold text-[#161616]/55 mb-2">
                {s.label}
              </span>
              <span className="font-display text-2xl md:text-3xl font-black">{s.value}</span>
            </div>
          ))}
        </div>

        {counts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {counts.map((c) => (
              <span
                key={c.s}
                className={`px-3 py-1.5 rounded border-2 text-[10px] uppercase tracking-[0.18em] font-mono font-bold ${
                  STATUS_STYLE[c.s] ?? STATUS_STYLE.applicant
                }`}
              >
                {c.s} {c.n}
              </span>
            ))}
          </div>
        )}

        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="bg-[#161616] text-[#FBF6EA]">
                  {['Member', 'Status', 'Plan', 'Free roadmap', 'Joined', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-[9px] uppercase tracking-[0.28em] font-mono font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-body text-[#161616]/50">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm font-body text-[#161616]/50">
                      Nobody yet. The first interview from /hundredfold lands here.
                    </td>
                  </tr>
                )}
                {sorted.map((m) => (
                  <tr key={m.id} className="border-t border-[#161616]/10 align-top hover:bg-[#FFFDF6]">
                    <td className="px-4 py-4 max-w-[260px]">
                      <Link
                        href={`/admin/hundredfold/${m.id}`}
                        className="font-sans font-extrabold text-sm hover:text-[#1E50C8] block truncate"
                      >
                        {m.business_name || m.name || m.email}
                      </Link>
                      <span className="block text-[11px] font-body text-[#161616]/55 truncate">{m.email}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded border-2 text-[9px] uppercase tracking-[0.18em] font-mono font-bold ${
                          STATUS_STYLE[m.status] ?? STATUS_STYLE.applicant
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-[#161616]/60">
                      {m.deep_roadmap ? (m.offer ? 'roadmap + offer' : 'roadmap only') : '–'}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {m.roadmap_slug ? (
                        <Link
                          href={`/scaling-roadmap/r/${m.roadmap_slug}`}
                          target="_blank"
                          className="text-[#1E50C8] font-semibold hover:underline"
                        >
                          open
                        </Link>
                      ) : (
                        <span className="text-[#161616]/30">none</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[11px] font-mono text-[#161616]/55 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/hundredfold/${m.id}`}
                        className="text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
