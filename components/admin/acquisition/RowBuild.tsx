'use client';

import { useState } from 'react';
import { api } from '@/components/admin/acquisition/ui';

/**
 * BUILD AND SEND FROM THE ROW.
 *
 * Sarah, 2026-08-22: the build belongs on the contact card, not only on the
 * Build board. Scanning a list is where you actually notice that a business is
 * warm, and making you open them, build, come back and find your place again is
 * how a warm one goes cold.
 *
 * So this is the whole loop in one control, sized for a table row: build the
 * suite, open it, send it. It builds the SAME suite the board builds, through
 * the same endpoint, so there is one definition of what a build is.
 *
 * It states its own refusals rather than going quiet. A row with no email
 * address can be built but never mailed, and saying so on the row beats a
 * disabled button with no explanation.
 */

export type RowSuite = {
  stage: string;
  voiceUrl: string | null;
  siteUrl: string | null;
  siteStatus: string | null;
  osUrl: string | null;
  osShown: boolean;
  hubUrl: string | null;
  filmStatus: string | null;
  pieces: number;
};

type Props = {
  id: string;
  business: string;
  email: string | null;
  suite: RowSuite | null | undefined;
  demoEmailedAt?: string | null;
  /** Reload the list once something actually changed. */
  onDone: () => void | Promise<void>;
  /** Optional toast sink. Without one, the control speaks through its own label. */
  push?: (text: string, tone?: 'ok' | 'error') => void;
};

const btn =
  'inline-flex items-center gap-1 rounded-lg border-2 px-2.5 py-1 font-oswald text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:pointer-events-none disabled:opacity-40';

export default function RowBuild({ id, business, email, suite, demoEmailedAt, onDone, push }: Props) {
  const [busy, setBusy] = useState('');
  const [failed, setFailed] = useState('');

  const building = suite?.siteStatus === 'queued' || suite?.siteStatus === 'building';
  const built = (suite?.pieces ?? 0) > 0;
  const sent = Boolean(demoEmailedAt);
  // A prospect who already has a voice agent and no website used to have no way
  // out of this control: everything was built, so the build button was gone, and
  // the only path to a website was opening them. The website is also the thing
  // that lands last and takes the longest, so it gets its own button.
  const needsSite = built && !building && !suite?.siteUrl;

  const run = async (action: 'forge' | 'send-suite', done: string) => {
    setBusy(action);
    setFailed('');
    try {
      const res = await api<{ note?: string; refused?: string[]; results?: { ok: boolean; note: string }[] }>(
        '/api/admin/acquisition/build',
        { method: 'POST', body: JSON.stringify({ action, ids: [id], site: true }) },
      );
      const refusal = res.refused?.[0] ?? res.results?.find((r) => !r.ok)?.note ?? null;
      if (refusal) {
        setFailed(refusal);
        push?.(`${business}: ${refusal}`, 'error');
      } else {
        push?.(`${business}: ${done}`);
      }
      await onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'That did not go through.';
      setFailed(msg);
      push?.(`${business}: ${msg}`, 'error');
    } finally {
      setBusy('');
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {building && (
        <span className={`${btn} cursor-default border-[#F5B700] bg-[#F5B700]/20 text-[#7a5c00]`} title="Their website is on the anvil.">
          ⚒ Building
        </span>
      )}

      {!built && !building && (
        <button
          onClick={() => void run('forge', 'built. The website is on the anvil.')}
          disabled={busy !== ''}
          className={`${btn} border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5`}
          title="Build their voice agent and their website."
        >
          {busy === 'forge' ? 'Building…' : '⚒ Build'}
        </button>
      )}

      {needsSite && (
        <button
          onClick={() => void run('forge', 'website queued. It is on the anvil now.')}
          disabled={busy !== ''}
          className={`${btn} border-[#161616] bg-[#F5B700] text-[#161616] shadow-[2px_2px_0_0_#161616] hover:-translate-y-0.5`}
          title="Queue their demo website. Twenty to forty minutes on your machine."
        >
          {busy === 'forge' ? 'Queuing…' : '🌐 Build website'}
        </button>
      )}

      {built && suite?.hubUrl && (
        <a
          href={suite.hubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border-[#161616] bg-[#161616] text-[#F5B700] hover:-translate-y-0.5`}
          title={`${suite.pieces} piece${suite.pieces === 1 ? '' : 's'} they can open`}
        >
          ▦ Suite ↗
        </a>
      )}

      {built && !sent && email && (
        <button
          onClick={() => void run('send-suite', 'suite sent.')}
          disabled={busy !== ''}
          className={`${btn} border-[#161616] bg-white text-[#161616] hover:border-[#E0301E] hover:text-[#a32315]`}
          title={`Email it to ${email}`}
        >
          {busy === 'send-suite' ? 'Sending…' : '✉ Send'}
        </button>
      )}

      {built && !sent && !email && (
        <span className="font-sans text-[10px] text-[#a32315]" title="No email address on the record, so their suite can only be handed over by phone.">
          phone only
        </span>
      )}

      {sent && (
        <span className="font-sans text-[10px] font-semibold text-[#2c4225]" title={`Sent ${new Date(demoEmailedAt!).toLocaleString()}`}>
          sent
        </span>
      )}

      {failed && !push && (
        <span className="max-w-[220px] truncate font-sans text-[10px] text-[#a32315]" title={failed}>
          {failed}
        </span>
      )}
    </span>
  );
}
