'use client';

import Link from 'next/link';
import AdminHeader from './AdminHeader';
import { campaigns } from '@/data/campaigns';

/**
 * The company outreach board. Every named B2B campaign we are running to land a
 * specific enterprise / multi-unit account, visible to everyone. Each card opens
 * a fully-loaded command page (live demo, pricing, contacts, ready emails).
 */
export default function CampaignsHub() {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="campaigns" title="Campaigns" />
      <main className="max-w-5xl mx-auto px-5 sm:px-6 py-8">
        <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-5 mb-7">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1.5">Outreach campaigns</span>
          <p className="font-body text-sm text-[#3A3733] leading-relaxed">
            Named accounts we are going after, each one loaded and ready to run: the live demo you can call, the pricing, the real decision-makers, and a written email for every person. Open a campaign, copy the email, send it, mark it. This is for the whole team.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {campaigns.map((c) => {
            const phone = c.assets.find((a) => a.kind === 'phone');
            return (
              <Link
                key={c.slug}
                href={`/admin/campaigns/${c.slug}`}
                className="group block rounded-2xl border-2 border-[#161616] shadow-[5px_5px_0_0_#161616] overflow-hidden hover:-translate-y-1 hover:shadow-[7px_7px_0_0_#161616] transition-all"
              >
                <div className={`bg-gradient-to-r ${c.accent} px-5 py-5 text-white`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-[0.3em] font-mono font-bold text-white/80">{c.product}</span>
                    <span className="text-[9px] uppercase tracking-[0.18em] font-mono font-bold bg-white/15 border border-white/25 rounded-full px-2 py-0.5">
                      {c.status === 'live' ? '● Live' : c.status}
                    </span>
                  </div>
                  <h2 className="font-sans text-2xl font-extrabold tracking-tight mt-1.5">{c.brand}</h2>
                  <p className="font-body text-white/85 text-xs mt-1.5 leading-relaxed line-clamp-2">{c.hook}</p>
                </div>
                <div className="bg-white px-5 py-3.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-[#161616]/45">Lead</span>
                    <p className="font-sans text-sm font-bold text-[#161616] truncate">{c.lead.name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-center">
                      <span className="block font-sans text-lg font-extrabold text-[#161616] leading-none">{c.contacts.length}</span>
                      <span className="text-[8px] uppercase tracking-[0.15em] font-mono text-[#161616]/45">contacts</span>
                    </span>
                    {phone?.note && (
                      <span className="text-center hidden sm:block">
                        <span className="block font-mono text-xs font-bold text-[#E0301E] leading-none">{phone.note.split(' · ')[0]}</span>
                        <span className="text-[8px] uppercase tracking-[0.15em] font-mono text-[#161616]/45">call demo</span>
                      </span>
                    )}
                    <span className="text-[#161616]/30 group-hover:text-[#161616] text-lg transition-colors">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
