'use client';

import { useCallback, useEffect, useState } from 'react';
import DripPanel, { dripChipLabel } from '@/components/admin/outbound/DripPanel';

/**
 * THE DRIP, WHERE SOMEBODY LOOKS FOR IT.
 *
 * The drip panel shipped as a chip in the header of the mail panel, beside
 * Refresh. On the Acquisition prospect that put it 1,048px down a 3,145px page:
 * present, findable by search, and invisible in practice. Sarah, twice: "i dont
 * see the create drip campaign on the contact cards."
 *
 * Starting a sequence is an ACTION, and on every contact screen the actions live
 * together in one rail. This is that button, self-contained so it can be dropped
 * into any of them: it fetches its own status, labels itself with where the
 * sequence stands, and owns the panel it opens.
 *
 * It labels itself rather than saying "Drip campaign" always, because the answer
 * to "did I already start this" should be readable without opening anything:
 * "Start drip campaign" when there is none, "Drip 2/5, next Thu" when it runs,
 * "Drip paused 3/5" when it is holding.
 */

type DripSummary = {
  id: string;
  status: 'active' | 'paused' | 'done' | 'stopped';
  step: number;
  next_at: string | null;
  started_at: string;
  last_sent_at: string | null;
  stopped_reason: string | null;
  last_error: string | null;
  sent: { step: number; at: string; messageId: string | null; subject: string }[];
} | null;

export default function DripButton({
  leadId: leadIdProp,
  email,
  businessName: businessNameProp,
  className,
  onNotice,
}: {
  leadId?: string | null;
  /**
   * For the Client Book, which knows an address and not a lead id. The mail
   * thread endpoint already resolves one to the other, so the lookup costs a
   * request this screen was going to make anyway rather than a new route.
   */
  email?: string | null;
  businessName?: string | null;
  /** The host screen's own button styling, so this looks native wherever it lands. */
  className?: string;
  onNotice?: (text: string, tone?: 'ok' | 'error') => void;
}) {
  const [leadId, setLeadId] = useState<string | null>(leadIdProp ?? null);
  const [businessName, setBusinessName] = useState<string>(businessNameProp ?? 'this contact');
  const [drip, setDrip] = useState<DripSummary>(null);
  const [length, setLength] = useState(5);
  const [stop, setStop] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Resolve the address to a lead when only an address was given. A contact with
  // no lead row behind it gets no button at all: there is nothing to drip.
  useEffect(() => {
    if (leadIdProp || !email) return;
    let live = true;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/email-thread?email=${encodeURIComponent(email)}`);
        if (!res.ok) return;
        const json = (await res.json()) as { leadId: string | null; businessName: string | null };
        if (!live) return;
        setLeadId(json.leadId ?? null);
        if (json.businessName) setBusinessName(json.businessName);
      } catch {
        /* no lead, no button */
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [leadIdProp, email]);

  /** The summary read, which skips rendering all five emails just to get a label. */
  const load = useCallback(async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/admin/outbound/leads/${leadId}/drip?summary=1`);
      if (!res.ok) return;
      const json = (await res.json()) as { drip: DripSummary; length: number; stop: string | null };
      setDrip(json.drip ?? null);
      setLength(json.length ?? 5);
      setStop(json.stop ?? null);
    } catch {
      /* a label that cannot load is not worth an error on the page */
    } finally {
      setLoaded(true);
    }
  }, [leadId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!leadId) return null;

  const label = !loaded ? 'Drip campaign' : drip ? dripChipLabel(drip, length) : '⏱ Start drip campaign';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={stop ? `The drip will refuse this one: ${stop}` : 'The five email sequence that works a demo into a sale'}
        className={
          className ??
          'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[#161616] bg-[#F5B700] px-4 py-2.5 font-oswald text-sm font-semibold uppercase tracking-[0.08em] text-[#161616] shadow-[3px_3px_0_0_#161616] transition-all hover:-translate-y-0.5'
        }
      >
        {label}
      </button>
      <DripPanel
        lead={{ id: leadId, business_name: businessName }}
        open={open}
        onClose={() => {
          setOpen(false);
          void load();
        }}
        push={(text, tone) => onNotice?.(text, tone)}
      />
    </>
  );
}
