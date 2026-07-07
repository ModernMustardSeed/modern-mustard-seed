'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';

type Item = {
  id: string;
  prospect_id: string | null;
  from_addr: string;
  subject: string | null;
  snippet: string | null;
  read: boolean;
  occurred_at: string;
  business: string;
};

export default function InboxPage() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/messages');
      const j = await r.json();
      setItems(j.items ?? []);
      setUnread(j.unread ?? 0);
    } catch {
      setItems([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#FBF6EA]">
      <AdminHeader active="inbox" title="Inbox" onRefresh={load} />
      <main className="max-w-3xl mx-auto px-5 md:px-6 py-8">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="font-display text-3xl font-bold text-[#161616]">Replies</h2>
          {unread > 0 && <span className="text-[11px] font-mono font-bold text-white bg-[#E0301E] rounded-full px-2.5 py-1">{unread} new</span>}
        </div>
        <p className="text-[#161616]/55 font-body text-sm mb-6">Every reply a lead sends lands here. Click one to open their thread on the tracker and reply.</p>

        {items === null ? (
          <p className="text-[#161616]/55 italic">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-[#161616]/55 italic">No replies yet. When a lead emails back, it shows up here.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <a
                key={it.id}
                href={it.prospect_id ? `/admin/prospects?focus=${it.prospect_id}` : '/admin/prospects'}
                className={`block rounded-xl border-2 border-[#161616] px-4 py-3 transition-colors hover:bg-[#FFF8E6] ${!it.read ? 'bg-[#FFF8E6] shadow-[3px_3px_0_0_#161616]' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans font-bold text-[#161616]">
                    {it.business}
                    {!it.read && <span className="ml-2 text-[9px] uppercase tracking-wider text-white bg-[#E0301E] rounded-full px-2 py-0.5">new</span>}
                  </span>
                  <span className="text-[11px] text-[#161616]/45 font-mono">{new Date(it.occurred_at).toLocaleDateString()}</span>
                </div>
                <p className="text-[13px] font-sans font-semibold text-[#161616]/80 mt-0.5">{it.subject || '(no subject)'}</p>
                <p className="text-sm font-body text-[#3A3733] line-clamp-2">{it.snippet}</p>
                <p className="text-[11px] text-[#161616]/40 font-mono mt-1">{it.from_addr}</p>
              </a>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
