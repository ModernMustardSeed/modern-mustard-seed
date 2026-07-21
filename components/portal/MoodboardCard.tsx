'use client';

/**
 * THE DIRECTION BOARD, CLIENT SIDE. Sarah forges it after intake; the client
 * approves it here BEFORE the official site goes live. Approving fires
 * confetti and unblocks the scheduled reveal. Asking for changes sends the
 * note straight to Sarah and keeps holding the launch.
 *
 * Self-hiding: renders nothing until a board has actually been sent.
 */

import { useCallback, useEffect, useState } from 'react';
import MoodboardCanvas from '@/components/moodboard/MoodboardCanvas';
import { fireConfetti } from '@/lib/confetti';
import type { Moodboard } from '@/lib/moodboard-shared';

type BoardData = {
  projectId: string;
  board: Moodboard;
  status: 'sent' | 'changes' | 'approved';
  note: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  businessName: string;
  logoUrl: string | null;
  photos: string[];
};

export default function MoodboardCard() {
  const [data, setData] = useState<BoardData | null>(null);
  const [busy, setBusy] = useState<'approve' | 'changes' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState('');
  const [justApproved, setJustApproved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/moodboard');
      if (!res.ok) return;
      const j = await res.json();
      if (j?.moodboard) setData(j.moodboard as BoardData);
    } catch {
      /* portal stays quiet */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return null;

  const act = async (action: 'approve' | 'changes') => {
    setBusy(action);
    setErr(null);
    try {
      const res = await fetch('/api/portal/moodboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'changes' ? { action, note } : { action }),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(j?.error ?? 'That did not go through. Try again?');
        return;
      }
      if (action === 'approve') {
        fireConfetti();
        setJustApproved(true);
        setData({ ...data, status: 'approved', approvedAt: (j?.approvedAt as string) ?? new Date().toISOString() });
      } else {
        setAsking(false);
        setData({ ...data, status: 'changes', note });
        setNote('');
      }
    } catch {
      setErr('Network hiccup. Try again?');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616] p-6 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#E0301E] font-mono font-bold block mb-1">
            Your Direction Board
          </span>
          <p className="font-display text-2xl font-bold text-[#161616] leading-tight">
            {data.status === 'approved' ? 'This is the direction. Signed.' : 'Before we build: approve the direction.'}
          </p>
        </div>
        {data.status === 'approved' && data.approvedAt && (
          <span className="rounded-full border-2 border-emerald-700 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
            Approved {new Date(data.approvedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {data.status !== 'approved' && (
        <p className="font-body text-sm text-[#3a3733] leading-relaxed mb-5 max-w-2xl">
          Sarah cut this board just for {data.businessName}: the letters, the colors, the feel, and the one
          moment your visitors will remember. Love it and your site is built exactly this way. If something
          feels off, say so below and she will re-cut it. Nothing goes live until you sign the direction.
        </p>
      )}

      <MoodboardCanvas
        board={data.board}
        businessName={data.businessName}
        logoUrl={data.logoUrl}
        photos={data.photos}
        approvedAt={data.approvedAt}
      />

      {data.status === 'changes' && !justApproved && (
        <div className="mt-5 rounded-xl border-2 border-[#161616] bg-[#FFF8E6] px-5 py-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#8f6600] mb-1">
            Change request sent
          </p>
          <p className="font-body text-sm text-[#3a3733] leading-relaxed">
            You asked: &ldquo;{data.note}&rdquo;. Sarah is re-cutting the board and the new version will land
            right here.
          </p>
        </div>
      )}

      {data.status === 'sent' && (
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <button
              type="button"
              onClick={() => act('approve')}
              disabled={busy !== null}
              className="rounded-full border-2 border-[#161616] bg-[#F5B700] px-8 py-3.5 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] shadow-[4px_4px_0_0_#161616] transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy === 'approve' ? 'Signing...' : 'I love it. Build it.'}
            </button>
            <button
              type="button"
              onClick={() => setAsking((v) => !v)}
              disabled={busy !== null}
              className="rounded-full border-2 border-[#161616] bg-white px-6 py-3.5 font-sans text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#161616] transition-all hover:-translate-y-0.5 disabled:opacity-60"
            >
              Something feels off
            </button>
          </div>

          {asking && (
            <div className="mt-4">
              <label htmlFor="mb-note" className="sr-only">What should change?</label>
              <textarea
                id="mb-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={800}
                placeholder="Say it plainly: too dark, wrong blue, my grandpa built the shop in 1962 and I want that story front and center..."
                className="w-full rounded-xl border-2 border-[#161616] bg-white px-4 py-3 font-body text-sm text-[#161616] placeholder:text-[#161616]/35 focus:outline-none focus:ring-2 focus:ring-[#F5B700]"
              />
              <button
                type="button"
                onClick={() => act('changes')}
                disabled={busy !== null || !note.trim()}
                className="mt-2.5 rounded-full border-2 border-[#161616] bg-[#161616] px-6 py-3 font-sans text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5B700] transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                {busy === 'changes' ? 'Sending...' : 'Send it to Sarah'}
              </button>
            </div>
          )}
        </div>
      )}

      {justApproved && (
        <p className="mt-5 rounded-xl border-2 border-[#161616] bg-[#FBF6EA] px-5 py-4 font-display text-lg font-bold text-[#161616]">
          Signed. Your site gets built in exactly this direction, and it goes live on schedule.
        </p>
      )}

      {err && <p className="mt-3 font-mono text-[11px] font-bold text-[#E0301E]">{err}</p>}
    </div>
  );
}
