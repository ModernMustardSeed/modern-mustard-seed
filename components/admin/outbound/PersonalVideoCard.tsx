'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, card, eyebrow, btnPrimary, btnGhost } from '@/components/admin/outbound/ui';

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
 * Attach a face-to-camera video (recorded in the booth) to this one lead. It
 * then leads their demo hub and their demo email. State lives as a file in the
 * booth bucket (founder/<leadId>.webm), so this is just: check, pick a take,
 * copy it on, or remove it. No lead-row column involved.
 */
export default function PersonalVideoCard({ leadId, push }: { leadId: string; push: Push }) {
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
      push('Could not load booth takes.', 'error');
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
      push('Personal video attached. It now leads their hub and email.');
    } catch (e) {
      push(e instanceof Error ? e.message : 'Attach failed.', 'error');
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
      push('Personal video removed.');
    } catch {
      push('Could not remove it.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${card} p-5 md:p-6 mb-6`}>
      <div className="flex items-center gap-2.5 mb-3">
        <span className={eyebrow}>Personal video</span>
      </div>
      <p className="text-[13px] text-[#1a1815]/70 mb-4 leading-relaxed">
        Record the face-to-camera video for this lead in the booth (the &ldquo;I Called Your Receptionist&rdquo;
        script), then attach the take here. It leads their demo hub and their demo email.
      </p>

      {attached === null && <p className="text-[12px] text-[#1a1815]/40">Checking…</p>}

      {attached && (
        <div>
          {url && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video controls preload="metadata" src={url} className="w-full rounded-xl border-2 border-[#1a1815] bg-black aspect-video mb-3" />
          )}
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} disabled={busy} onClick={() => void openPicker()}>
              Replace
            </button>
            <button className={btnGhost} disabled={busy} onClick={() => void remove()}>
              Remove
            </button>
          </div>
        </div>
      )}

      {attached === false && !picking && (
        <button className={btnPrimary} onClick={() => void openPicker()}>
          ▶ Attach a personal video
        </button>
      )}

      {picking && (
        <div className="mt-2 rounded-xl border-2 border-[#1a1815]/15 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-oswald text-[11px] uppercase tracking-[0.18em] text-[#1a1815]/60">Pick a booth take</span>
            <button className="text-[12px] text-[#1a1815]/60 underline" onClick={() => setPicking(false)}>
              Close
            </button>
          </div>
          {loadingTakes && <p className="text-[12px] text-[#1a1815]/40">Loading takes…</p>}
          {!loadingTakes && takes.length === 0 && (
            <p className="text-[12px] text-[#1a1815]/50">No booth takes yet. Record one in the booth first, then come back.</p>
          )}
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {takes.map((t) => (
              <button
                key={t.path}
                disabled={busy}
                onClick={() => void attach(t.path)}
                className="w-full rounded-lg border border-[#1a1815]/15 px-3 py-2 text-left transition-colors hover:border-[#b58a2a] hover:bg-[#fdf7e8] disabled:opacity-40"
              >
                <p className="truncate font-mono text-[11px] text-[#1a1815]">{t.fileName}</p>
                <p className="truncate font-mono text-[10px] text-[#1a1815]/50">
                  {t.scriptId}
                  {t.updatedAt ? ` · ${new Date(t.updatedAt).toLocaleDateString()}` : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
