'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Section, api, btnGhost, btnPrimary } from '@/components/admin/acquisition/ui';

type Push = (text: string, tone?: 'ok' | 'error') => void;

type SavedTake = {
  path: string;
  scriptId: string;
  fileName: string;
  bytes: number;
  updatedAt: string | null;
  signedUrl: string | null;
};

/**
 * A FACE ON THE DEMO.
 *
 * The forged suite is the proof. This is the part that makes it a person
 * sending it: one face-to-camera video, recorded in the booth for THIS
 * business, attached here. It then leads their demo hub and their suite email,
 * and everything else on the page becomes something you built for them rather
 * than something a machine mailed out.
 *
 * There is no column for it. The attachment IS a file at a prospect-scoped path
 * in the private booth bucket (founder/<id>.webm), copied server-side from the
 * take you pick, so deleting the original take later can never break a hub that
 * has already been sent. Its existence is the whole state.
 */
export default function PersonalVideoCard({ leadId, business, push }: { leadId: string; business: string; push: Push }) {
  const [attached, setAttached] = useState<boolean | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [takes, setTakes] = useState<SavedTake[]>([]);
  const [loadingTakes, setLoadingTakes] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ attached: boolean; url: string | null }>(`/api/admin/outbound/leads/${leadId}/personal-video`);
      setAttached(r.attached);
      setUrl(r.url);
    } catch {
      setAttached(false);
      setUrl(null);
    }
  }, [leadId]);

  useEffect(() => {
    setAttached(null);
    setUrl(null);
    setPicking(false);
    void refresh();
  }, [leadId, refresh]);

  const openPicker = async () => {
    setPicking(true);
    setLoadingTakes(true);
    try {
      const r = await api<{ takes: SavedTake[] }>('/api/booth/list', { method: 'POST' });
      setTakes(r.takes ?? []);
    } catch {
      push('Could not load the booth takes.', 'error');
    } finally {
      setLoadingTakes(false);
    }
  };

  const attach = async (takePath: string) => {
    setBusy(true);
    try {
      const r = await api<{ url: string | null }>(`/api/admin/outbound/leads/${leadId}/personal-video`, {
        method: 'POST',
        body: JSON.stringify({ takePath }),
      });
      setAttached(true);
      setUrl(r.url);
      setPicking(false);
      push('Video attached. It now leads their suite and their email.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'That take would not attach.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/admin/outbound/leads/${leadId}/personal-video`, { method: 'DELETE' });
      setAttached(false);
      setUrl(null);
      push('Video removed. Their suite falls back to the walkthrough film.');
    } catch {
      push('Could not remove it.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="A video from you"
      note={`Record one take for ${business} in the booth, attach it here, and it leads their suite page and their email.`}
      right={
        <Link href="/sarah" target="_blank" className={`${btnGhost} !py-2 !text-xs`}>
          Open the booth ↗
        </Link>
      }
    >
      {attached === null && <p className="font-sans text-[12px] text-[#161616]/40">Checking…</p>}

      {attached && (
        <div>
          {url && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              controls
              preload="metadata"
              src={url}
              className="mb-3 aspect-video w-full rounded-xl border-2 border-[#161616] bg-black"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} disabled={busy} onClick={() => void openPicker()}>
              Replace it
            </button>
            <button className={btnGhost} disabled={busy} onClick={() => void remove()}>
              Remove it
            </button>
          </div>
        </div>
      )}

      {attached === false && !picking && (
        <>
          <button className={btnPrimary} onClick={() => void openPicker()}>
            ▶ Attach a video
          </button>
          <p className="mt-3 text-[11px] leading-snug text-[#161616]/50">
            Nothing is attached, so their suite leads with the walkthrough film cut from their own website, voice agent
            and command center. A face beats a screen recording every time.
          </p>
          <p className="mt-2 text-[11px] leading-snug text-[#161616]/50">
            The script for this is <strong className="text-[#161616]/70">&ldquo;I Called Your Voice Agent&rdquo;</strong>{' '}
            in the booth: share the tab with their forged site, call their agent live on camera, and let it be genuinely
            unrehearsed. A flub is proof it was real.
          </p>
        </>
      )}

      {picking && (
        <div className="mt-2 rounded-xl border-2 border-[#161616]/15 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-oswald text-[11px] uppercase tracking-[0.18em] text-[#161616]/60">Pick a booth take</span>
            <button className="text-[12px] text-[#161616]/60 underline" onClick={() => setPicking(false)}>
              Close
            </button>
          </div>
          {loadingTakes && <p className="text-[12px] text-[#161616]/40">Loading takes…</p>}
          {!loadingTakes && takes.length === 0 && (
            <p className="text-[12px] text-[#161616]/50">
              No takes in the booth yet. Record one there first, then come back and attach it.
            </p>
          )}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {takes.map((t) => (
              <button
                key={t.path}
                disabled={busy}
                onClick={() => void attach(t.path)}
                className="w-full rounded-lg border border-[#161616]/15 px-3 py-2 text-left transition-colors hover:border-[#F5B700] hover:bg-[#FBF6EA] disabled:opacity-40"
              >
                <p className="truncate font-mono text-[11px] text-[#161616]">{t.fileName}</p>
                <p className="truncate font-mono text-[10px] text-[#161616]/50">
                  {t.scriptId}
                  {t.updatedAt ? ` · ${new Date(t.updatedAt).toLocaleDateString()}` : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </Section>
  );
}
