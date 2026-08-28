'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Type his address, read what will go, press send.
 *
 * Sarah, 2026-08-28: "give me place where i can add his email and then i press
 * send, for the intial email with his demos and costs and gbp info and all the
 * things we cover and do."
 *
 * The preview is the real thing, built by the same function that sends it,
 * rendered in an iframe. A description of an email is not an email, and the
 * only way to be sure the buttons are the right colour and the links are the
 * right links is to look at it.
 *
 * "Send it to me first" exists because she reads every one of these before a
 * client does, and making her do that by sending herself a copy from a script
 * is how a client eventually gets the script's copy.
 */

type Built = {
  subject: string;
  html: string;
  links: Array<{ label: string; url: string; kind: string }>;
  onFile: string;
  needsAddress: boolean;
};

export default function DeliveryEmailPanel({
  clientEmail,
  onSent,
}: {
  clientEmail: string;
  onSent?: () => void;
}) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState<'send' | 'preview' | null>(null);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(null);
  const [showing, setShowing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/delivery-email?email=${encodeURIComponent(clientEmail)}`);
      if (!r.ok) return;
      const d = (await r.json()) as Built;
      setBuilt(d);
      // Only prefill an address that can actually receive mail. Prefilling the
      // placeholder is how it gets sent to the placeholder.
      if (!d.needsAddress) setTo(d.onFile);
    } catch {
      /* the panel just stays quiet */
    }
  }, [clientEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  async function send(preview: boolean) {
    const addr = preview ? 'sarah@modernmustardseed.com' : to.trim();
    if (!addr) {
      setNote({ text: 'Put an address in first.', bad: true });
      return;
    }
    setBusy(preview ? 'preview' : 'send');
    setNote(null);
    try {
      const r = await fetch('/api/admin/delivery-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientEmail, to: addr, preview }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; movedTo?: string | null };
      if (!r.ok || !d.ok) {
        setNote({ text: d.error ?? 'It did not send.', bad: true });
      } else {
        setNote({
          text: preview
            ? 'Sent to you. Read it, then send it to him.'
            : d.movedTo
              ? `Sent to ${addr}. His card is now filed under that address instead of the placeholder.`
              : `Sent to ${addr}.`,
        });
        if (!preview) onSent?.();
      }
    } catch {
      setNote({ text: 'It did not reach the server.', bad: true });
    } finally {
      setBusy(null);
    }
  }

  const payLinks = (built?.links ?? []).filter((l) => /^pay:/i.test(l.label));
  const lookLinks = (built?.links ?? []).filter(
    (l) => !/^pay:/i.test(l.label) && !/^(go-live|golive|runbook|call sheet|notes|internal|admin)/i.test(l.label),
  );

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6">
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-4">
        Send him everything
      </span>

      <p className="text-[15px] leading-relaxed text-[#3a3733] mb-4">
        One email with every link on this card, both prices, the step by step for claiming
        his Google listing, and what we do about getting him found. Built from what is
        filed here, so the email and this card can never disagree.
      </p>

      {built ? (
        <div className="mb-4 text-[13px] text-[#6e7c87] leading-relaxed">
          {lookLinks.length > 0 && (
            <p className="mb-1">
              <span className="font-mono uppercase tracking-wider text-[11px]">Links: </span>
              {lookLinks.map((l) => l.label).join(', ')}
            </p>
          )}
          <p>
            <span className="font-mono uppercase tracking-wider text-[11px]">Pay buttons: </span>
            {payLinks.length
              ? payLinks.map((l) => l.label.replace(/^pay:\s*/i, '')).join(', ')
              : 'none on this card yet. Add a link labelled "Pay: ..." and it becomes an orange button.'}
          </p>
        </div>
      ) : null}

      {built?.needsAddress ? (
        <p className="mb-4 border-l-4 border-[#C4380C] bg-[#faf3f0] px-4 py-3 text-[14px] leading-relaxed text-[#3a3733]">
          He is filed under a placeholder address, so nothing has ever reached him. Put his
          real one in below and sending will move his whole card onto it.
        </p>
      ) : null}

      <label className="block font-mono text-[11px] tracking-[0.14em] uppercase text-[#6e7c87] mb-2">
        Send it to
      </label>
      <input
        value={to}
        onChange={(e) => setTo(e.target.value)}
        type="email"
        placeholder="his@email.com"
        className="w-full border-2 border-[#161616] bg-white px-4 py-3 text-[16px] outline-none focus:border-[#C4380C]"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy !== null || !to.trim()}
          onClick={() => void send(false)}
          className="border-2 border-[#161616] bg-[#F5B700] px-5 py-3 font-mono text-[11px] tracking-[0.14em] uppercase shadow-[4px_4px_0_0_#161616] disabled:opacity-40"
        >
          {busy === 'send' ? 'Sending' : 'Send it'}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void send(true)}
          className="border-2 border-[#161616] bg-white px-4 py-3 font-mono text-[11px] tracking-[0.14em] uppercase disabled:opacity-40"
        >
          {busy === 'preview' ? 'Sending' : 'Send it to me first'}
        </button>
        <button
          type="button"
          onClick={() => setShowing((v) => !v)}
          className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#6e7c87] underline underline-offset-4 hover:text-[#161616]"
        >
          {showing ? 'Hide it' : 'Read it here'}
        </button>
      </div>

      {note ? (
        <p
          className="mt-4 mb-0 text-[14px] leading-relaxed"
          style={{ color: note.bad ? '#C4160B' : '#0f766e' }}
        >
          {note.text}
        </p>
      ) : null}

      {showing && built ? (
        <div className="mt-5 border-2 border-[#161616]">
          <p className="m-0 border-b-2 border-[#161616] bg-[#faf7f2] px-4 py-2 font-mono text-[11px] text-[#6e7c87]">
            {built.subject}
          </p>
          {/* The real email, in the sandbox it belongs in. Rendering it inline
            * would let its styles leak into the admin. */}
          <iframe
            title="The email"
            srcDoc={built.html}
            sandbox=""
            className="block h-[560px] w-full border-0 bg-white"
          />
        </div>
      ) : null}
    </div>
  );
}
