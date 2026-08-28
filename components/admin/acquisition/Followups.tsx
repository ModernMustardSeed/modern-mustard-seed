'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import LeadListSheet from '@/components/admin/outbound/LeadListSheet';
import LeadEmailComposer from '@/components/admin/LeadEmailComposer';
import { AcqNav, Chip, ToastHost, api, card, btnPrimary, btnGhost, eyebrow, useToasts } from '@/components/admin/acquisition/ui';
import type { OutboundLead } from '@/lib/outbound';

/**
 * WHO IS WAITING ON A PERSON.
 *
 * Every other screen in Acquisition is about what the machine is doing. This
 * one is the short list it cannot do: somebody who talked to Mr. Mustard and
 * never got booked, somebody who pressed the free-build button and stopped,
 * somebody whose agent is built and whose only email address bounces.
 *
 * It is deliberately small. A follow-up list of two hundred is a list nobody
 * works, so anybody the drip is still chasing is excluded on purpose: they are
 * not waiting on a person, they are mid-sequence.
 *
 * Tick the ones you want and the same sheet the Outbound floor uses puts them
 * on paper or into an inbox.
 */

type Followup = {
  reason: string;
  why: string;
  move: string;
  at: string;
  rank: number;
  lead: OutboundLead;
};

function fmt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime()) || d.getTime() === 0) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Followups() {
  const [list, setList] = useState<Followup[] | null>(null);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toasts, push } = useToasts();

  const load = useCallback(async () => {
    try {
      const res = await api<{ followups: Followup[] }>('/api/admin/acquisition/followups');
      setList(res.followups);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the follow-up list.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const by = new Map<string, Followup[]>();
    for (const f of list ?? []) {
      const g = by.get(f.move) ?? [];
      g.push(f);
      by.set(f.move, g);
    }
    return [...by.entries()];
  }, [list]);

  const toggle = (id: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const all = list ?? [];
  const allPicked = all.length > 0 && picked.size === all.length;
  // The sheet takes what is ticked, or everything when nothing is.
  const forSheet = picked.size ? all.filter((f) => picked.has(f.lead.id)).map((f) => f.lead) : all.map((f) => f.lead);

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="acquisition" title="Acquisition" onRefresh={() => void load()} />
      <main className="max-w-[86rem] mx-auto px-5 md:px-6 py-6">
        <AcqNav
          active="followups"
          right={
            <div className="flex items-center gap-2">
              <button className={btnGhost} onClick={() => setPicked(allPicked ? new Set() : new Set(all.map((f) => f.lead.id)))} disabled={!all.length}>
                {allPicked ? 'Clear' : 'Tick all'}
              </button>
              <button className={btnPrimary} onClick={() => setSheetOpen(true)} disabled={!all.length}>
                Print or email {picked.size ? `${picked.size} ticked` : 'the list'}
              </button>
            </div>
          }
        />

        <div className={`${card} p-5 mb-6`}>
          <p className={eyebrow}>Waiting on a person</p>
          <h1 className="font-oswald text-3xl font-bold uppercase tracking-tight">
            {list === null ? 'Reading the floor...' : `${all.length} to work`}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[#161616]/70">
            Everyone here gave a real signal and then the machine ran out of moves. Nobody the drip is still chasing is
            on this list, and neither is anybody a scanner made look interested.
          </p>
        </div>

        {error && <p className="mb-3 text-sm font-semibold text-[#E0301E]">{error}</p>}

        {list !== null && all.length === 0 && (
          <div className={`${card} p-8 text-center`}>
            <p className="font-oswald text-xl font-bold uppercase tracking-tight">Nobody is waiting on you.</p>
            <p className="mt-1 text-sm text-[#161616]/65">
              Every warm lead is either mid-sequence, already booked, or correctly held back. Come back after the next
              send window.
            </p>
          </div>
        )}

        {groups.map(([move, items]) => (
          <section key={move} className="mb-7">
            <h2 className="font-oswald text-lg font-bold uppercase tracking-[0.06em] mb-3">
              {move} <span className="text-[#161616]/45">({items.length})</span>
            </h2>
            <div className="space-y-2.5">
              {items.map((f) => {
                const l = f.lead as unknown as Record<string, unknown>;
                const where = [l.city, l.state].filter(Boolean).join(', ');
                return (
                  <div key={f.lead.id} className={`${card} p-4 flex flex-wrap items-start gap-4`}>
                    <input
                      type="checkbox"
                      checked={picked.has(f.lead.id)}
                      onChange={() => toggle(f.lead.id)}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#F5B700]"
                      aria-label={`Pick ${String(l.business_name)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/acquisition/prospects/${f.lead.id}`}
                          className="font-oswald text-lg font-bold uppercase tracking-tight underline decoration-[#F5B700] decoration-2 underline-offset-4"
                        >
                          {String(l.business_name)}
                        </Link>
                        {l.lead_score != null && <Chip label={`score ${l.lead_score}`} tone={Number(l.lead_score) >= 70 ? 'good' : 'neutral'} />}
                        {where && <span className="text-[13px] text-[#161616]/60">{where}</span>}
                        {fmt(f.at) && <span className="ml-auto font-mono text-[11px] text-[#161616]/55">{fmt(f.at)}</span>}
                      </div>
                      <p className="mt-1 text-[13px] leading-snug text-[#161616]/80">{f.why}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                        {l.phone ? (
                          <a href={`tel:${String(l.phone).replace(/[^0-9+]/g, '')}`} className="font-semibold underline">
                            {String(l.phone)}
                          </a>
                        ) : (
                          <span className="text-[#161616]/45">no phone</span>
                        )}
                        {l.email ? <span className="break-all text-[#161616]/70">{String(l.email)}</span> : <span className="text-[#161616]/45">no email</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      <LeadEmailComposer source="lead" id={f.lead.id} triggerClassName={btnGhost} onSent={() => void load()} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {/* The same sheet the Outbound floor prints from. */}
      <LeadListSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        leads={forSheet}
        scopeLabel={picked.size ? 'the leads you ticked' : 'everyone waiting on a person'}
        defaultTitle="Follow up"
        selectionCount={picked.size}
        push={push}
      />
      <ToastHost toasts={toasts} />
    </div>
  );
}
