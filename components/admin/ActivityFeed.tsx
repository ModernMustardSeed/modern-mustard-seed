'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Live activity on the command center. The same moments that fire an owner email
 * (new partner, new lead, new sale) shown in one stream, auto-refreshing, so
 * Sarah knows what is happening at a glance without ever opening her inbox.
 */

type ActivityEvent = {
  id: string;
  kind: 'partner' | 'lead' | 'sale' | 'client';
  emoji: string;
  title: string;
  detail: string;
  email: string;
  whenIso: string;
  amountCents?: number;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ACCENT: Record<ActivityEvent['kind'], string> = {
  partner: '#1E50C8',
  lead: '#F5B700',
  sale: '#E0301E',
  client: '#1a6b39',
};

export default function ActivityFeed({ showMoney = true }: { showMoney?: boolean }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/activity');
      const json = await res.json();
      if (res.ok && Array.isArray(json.events)) {
        setEvents(json.events);
        setErr(false);
      } else setErr(true);
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <section className="bg-white border-2 border-[#161616] rounded-2xl shadow-[5px_5px_0_0_#161616] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b-2 border-[#161616] bg-[#FBF6EA]">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E0301E] opacity-70" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E0301E]" />
          </span>
          <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] font-bold text-[#161616]">Live activity</h3>
        </div>
        <span className="font-mono text-[10px] text-[#161616]/40">new partners · leads · sales</span>
      </div>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-[#161616]/8">
        {loading ? (
          <div className="px-5 py-8 text-center text-[#161616]/40 font-body text-sm">Loading the feed...</div>
        ) : err ? (
          <div className="px-5 py-8 text-center text-[#161616]/40 font-body text-sm">Could not load activity right now.</div>
        ) : events.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-2xl mb-1">🌱</div>
            <p className="text-[#161616]/50 font-body text-sm">Quiet for now. New partners, leads, and sales will appear here the moment they happen.</p>
          </div>
        ) : (
          events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#FFFDF6] transition-colors">
              <span
                className="shrink-0 w-8 h-8 rounded-lg border-2 border-[#161616] flex items-center justify-center text-sm"
                style={{ background: `${ACCENT[e.kind]}22` }}
                aria-hidden
              >
                {e.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-sans font-bold text-[13px] text-[#161616]">{e.title}</span>
                  {typeof e.amountCents === 'number' && e.amountCents > 0 && (
                    <span className="font-mono text-[11px] font-bold text-[#E0301E]">
                      {showMoney ? `+$${(e.amountCents / 100).toLocaleString('en-US')}` : '+$•••'}
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] text-[#3A3733] font-body leading-snug truncate">{e.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-[#161616]/40 mt-0.5">{timeAgo(e.whenIso)}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
