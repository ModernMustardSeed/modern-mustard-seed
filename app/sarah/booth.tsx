'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The booth: records Sarah (camera), her screen (demo walkthroughs), or both
 * at once while the prompter rolls, and sends every take straight to the
 * private Supabase `booth` bucket for editing.
 *
 * Screen mode captures the picked tab/window/screen plus a MIXED audio track
 * (her mic + the tab's own audio), so a live call with a voice agent records
 * both sides cleanly. Arm Camera at the same time and a second synced take
 * (-cam) records her face for a picture-in-picture bubble in the edit.
 *
 * No booth code: /sarah is private (noindex, unlinked, single user). Every take
 * uploads on its own, is kept in the browser for instant replay this session,
 * and can be rewatched later from the "Saved in the booth" library, which lists
 * everything in the bucket. Uploads/deletes are guarded server-side by a
 * same-origin check.
 */

export type TakeStatus = 'local' | 'uploading' | 'sent' | 'failed';

export type Take = {
  id: string;
  scriptId: string;
  fileName: string;
  label: string;
  bytes: number;
  seconds: number;
  status: TakeStatus;
  progress: number;
  /** Object URL kept for the session so the take can be rewatched instantly. */
  url?: string;
  blob?: Blob;
};

/** A take already stored in the bucket (this or an earlier session). */
export type SavedTake = {
  path: string;
  scriptId: string;
  fileName: string;
  bytes: number;
  updatedAt: string | null;
  signedUrl: string | null;
};

const MAX_TAKE_MS = 25 * 60 * 1000;

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  for (const m of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

export function useBoothCamera() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [screenReady, setScreenReady] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [takes, setTakes] = useState<Take[]>([]);

  const [library, setLibrary] = useState<SavedTake[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [libError, setLibError] = useState<string | null>(null);

  const camStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mixCtxRef = useRef<AudioContext | null>(null);
  const activeRecsRef = useRef<MediaRecorder[]>([]);
  const meterCtxRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const takesRef = useRef<Take[]>([]);
  useEffect(() => {
    takesRef.current = takes;
  }, [takes]);

  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
    if (el && camStreamRef.current) {
      el.srcObject = camStreamRef.current;
      void el.play().catch(() => {});
    }
  }, []);

  const startMeter = useCallback((stream: MediaStream) => {
    try {
      if (meterCtxRef.current) return;
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      meterCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const loop = (ts: number) => {
        if (ts - last > 100) {
          last = ts;
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i] - 128) / 128;
            sum += v * v;
          }
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3));
        }
        levelRafRef.current = requestAnimationFrame(loop);
      };
      levelRafRef.current = requestAnimationFrame(loop);
    } catch {}
  }, []);

  const enable = useCallback(async () => {
    setCamError(null);
    setEnabled(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      camStreamRef.current = stream;
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        void videoElRef.current.play().catch(() => {});
      }
      startMeter(stream);
      setReady(true);
    } catch (err) {
      setCamError(err instanceof Error ? err.message : 'Camera was blocked.');
      setEnabled(false);
    }
  }, [startMeter]);

  const disable = useCallback(() => {
    camStreamRef.current?.getTracks().forEach((t) => t.stop());
    camStreamRef.current = null;
    setReady(false);
    setEnabled(false);
  }, []);

  const cleanupScreen = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setScreenReady(false);
  }, []);

  const enableScreen = useCallback(async () => {
    setScreenError(null);
    try {
      const disp = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: true,
      });
      const vt = disp.getVideoTracks()[0];
      if (vt) vt.addEventListener('ended', cleanupScreen);
      screenStreamRef.current = disp;
      // Narration needs a mic even when the camera stays off.
      if (!camStreamRef.current && !micStreamRef.current) {
        try {
          micStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          startMeter(micStreamRef.current);
        } catch {
          setScreenError('Mic was blocked; the screen take would be silent narration-wise.');
        }
      }
      setScreenReady(true);
    } catch (err) {
      setScreenError(err instanceof Error ? err.message : 'Screen share was cancelled.');
    }
  }, [cleanupScreen, startMeter]);

  const canRecord = ready || screenReady;

  /** Pulls the full list of stored takes (with fresh signed playback URLs). */
  const loadLibrary = useCallback(async () => {
    setLibLoading(true);
    setLibError(null);
    try {
      const res = await fetch('/api/booth/list', { method: 'POST' });
      const json = (await res.json()) as { takes?: SavedTake[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'list failed');
      setLibrary(json.takes ?? []);
    } catch {
      setLibError('Could not load saved takes. Try again.');
    } finally {
      setLibLoading(false);
    }
  }, []);

  const upload = useCallback(
    async (takeId: string) => {
      const take = takesRef.current.find((t) => t.id === takeId);
      if (!take || !take.blob) return;
      const patch = (p: Partial<Take>) => setTakes((ts) => ts.map((t) => (t.id === takeId ? { ...t, ...p } : t)));

      patch({ status: 'uploading', progress: 0 });
      try {
        const res = await fetch('/api/booth/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptId: take.scriptId, fileName: take.fileName }),
        });
        const json = (await res.json()) as { signedUrl?: string };
        if (!res.ok || !json.signedUrl) throw new Error('sign failed');

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', json.signedUrl as string);
          xhr.setRequestHeader('Content-Type', take.blob!.type || 'video/webm');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) patch({ progress: e.loaded / e.total });
          };
          xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error('HTTP ' + xhr.status)));
          xhr.onerror = () => reject(new Error('network'));
          xhr.send(take.blob);
        });
        // Keep the object URL so it stays instantly rewatchable this session.
        patch({ status: 'sent', progress: 1, blob: undefined });
        void loadLibrary();
      } catch {
        patch({ status: 'failed' });
      }
    },
    [loadLibrary],
  );

  const recordStream = useCallback(
    (stream: MediaStream, meta: { scriptId: string; label: string; fileName: string }, vbr: number) => {
      const chunks: BlobPart[] = [];
      const rec = new MediaRecorder(stream, {
        mimeType: pickMime(),
        videoBitsPerSecond: vbr,
        audioBitsPerSecond: 128_000,
      });
      const started = Date.now();
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: pickMime().split(';')[0] });
        const take: Take = {
          id: meta.fileName,
          scriptId: meta.scriptId,
          fileName: meta.fileName,
          label: meta.label,
          bytes: blob.size,
          seconds: Math.round((Date.now() - started) / 1000),
          status: 'local',
          progress: 0,
          url: URL.createObjectURL(blob),
          blob,
        };
        setTakes((ts) => [take, ...ts]);
        setTimeout(() => void upload(take.id), 50);
      };
      rec.start(1000);
      activeRecsRef.current.push(rec);
    },
    [upload],
  );

  const startTake = useCallback(
    (scriptId: string, label: string) => {
      if (activeRecsRef.current.length > 0) return;
      const screen = screenStreamRef.current;
      const cam = camStreamRef.current;
      if (!screen && !cam) return;
      const n =
        takesRef.current.filter((t) => t.scriptId === scriptId && t.label === label && !t.fileName.includes('-cam-')).length + 1;
      const ts = Date.now();

      if (screen) {
        // Mix mic narration with the shared tab/system audio into one track.
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        mixCtxRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        const micSource = camStreamRef.current?.getAudioTracks().length ? camStreamRef.current : micStreamRef.current;
        if (micSource?.getAudioTracks().length) ctx.createMediaStreamSource(new MediaStream(micSource.getAudioTracks())).connect(dest);
        if (screen.getAudioTracks().length) ctx.createMediaStreamSource(new MediaStream(screen.getAudioTracks())).connect(dest);
        const mixed = new MediaStream([...screen.getVideoTracks(), ...dest.stream.getAudioTracks()]);
        recordStream(mixed, { scriptId, label, fileName: `${label}-take${n}-screen-${ts}.webm` }, 4_000_000);
      }
      if (cam) {
        const suffix = screen ? '-cam' : '';
        recordStream(cam, { scriptId, label, fileName: `${label}-take${n}${suffix}-${ts}.webm` }, 3_000_000);
      }
      setRecording(true);
      autoStopRef.current = setTimeout(() => {
        activeRecsRef.current.forEach((r) => r.state === 'recording' && r.stop());
        activeRecsRef.current = [];
        setRecording(false);
      }, MAX_TAKE_MS);
    },
    [recordStream],
  );

  const stopTake = useCallback(() => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    activeRecsRef.current.forEach((r) => r.state === 'recording' && r.stop());
    activeRecsRef.current = [];
    void mixCtxRef.current?.close().catch(() => {});
    mixCtxRef.current = null;
    setRecording(false);
  }, []);

  /** Deletes a local session take: from the drawer, and from storage if sent. */
  const deleteTake = useCallback(async (takeId: string): Promise<boolean> => {
    const take = takesRef.current.find((t) => t.id === takeId);
    if (!take) return true;
    if (take.status === 'sent') {
      try {
        const res = await fetch('/api/booth/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scriptId: take.scriptId, fileName: take.fileName }),
        });
        if (!res.ok) return false;
      } catch {
        return false;
      }
    }
    if (take.url) URL.revokeObjectURL(take.url);
    setTakes((ts) => ts.filter((t) => t.id !== takeId));
    setLibrary((lib) => lib.filter((s) => s.path !== `${take.scriptId}/${take.fileName}`));
    return true;
  }, []);

  /** Deletes a stored take that is only in the library (no local copy). */
  const deleteSaved = useCallback(async (scriptId: string, fileName: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/booth/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, fileName }),
      });
      if (!res.ok) return false;
    } catch {
      return false;
    }
    setLibrary((lib) => lib.filter((s) => s.path !== `${scriptId}/${fileName}`));
    return true;
  }, []);

  const download = useCallback((takeId: string) => {
    const take = takesRef.current.find((t) => t.id === takeId);
    const href = take?.url;
    if (!take || !href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = take.fileName;
    a.click();
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      const pending = takesRef.current.some(
        (t) => t.blob && (t.status === 'local' || t.status === 'uploading' || t.status === 'failed'),
      );
      if (pending) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  useEffect(
    () => () => {
      stopTake();
      disable();
      cleanupScreen();
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      takesRef.current.forEach((t) => t.url && URL.revokeObjectURL(t.url));
      if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
      void meterCtxRef.current?.close().catch(() => {});
    },
    [stopTake, disable, cleanupScreen],
  );

  return {
    enabled,
    ready,
    camError,
    screenReady,
    screenError,
    canRecord,
    recording,
    level,
    takes,
    library,
    libLoading,
    libError,
    enable,
    disable,
    enableScreen,
    disableScreen: cleanupScreen,
    attachVideo,
    startTake,
    stopTake,
    retry: upload,
    download,
    deleteTake,
    deleteSaved,
    loadLibrary,
  };
}

export type BoothCamera = ReturnType<typeof useBoothCamera>;

const GOLD = '#F5B700';
const CREAM = '#FBF6EA';
const INK = '#161616';

export function SelfView({ booth, visible }: { booth: BoothCamera; visible: boolean }) {
  if (!booth.enabled) return null;
  return (
    <div
      className="absolute left-1/2 top-9 z-30 -translate-x-1/2 transition-opacity duration-300"
      style={{ opacity: visible ? (booth.recording ? 0.55 : 1) : 0, pointerEvents: 'none' }}
    >
      <div className="border-2" style={{ borderColor: booth.recording ? '#E0301E' : 'rgba(251,246,234,0.3)' }}>
        <video
          ref={booth.attachVideo}
          muted
          playsInline
          className="block h-[86px] w-[152px] object-cover"
          style={{ transform: 'scaleX(-1)', background: '#000' }}
        />
      </div>
      <div className="mt-1 h-1 w-full" style={{ background: 'rgba(251,246,234,0.15)' }}>
        <div
          className="h-full transition-[width] duration-100"
          style={{ width: `${Math.round(booth.level * 100)}%`, background: booth.level > 0.85 ? '#E0301E' : GOLD }}
        />
      </div>
    </div>
  );
}

function fmtBytes(b: number): string {
  if (b > 1024 * 1024 * 1024) return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  return Math.max(1, Math.round(b / (1024 * 1024))) + ' MB';
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

const STATUS_CHIP: Record<TakeStatus, { text: string; bg: string; fg: string }> = {
  local: { text: 'Saved here', bg: 'rgba(251,246,234,0.15)', fg: CREAM },
  uploading: { text: 'Sending…', bg: GOLD, fg: INK },
  sent: { text: 'Sent to Claude ✓', bg: '#2c7a4b', fg: CREAM },
  failed: { text: 'Failed', bg: '#E0301E', fg: CREAM },
};

/** Fullscreen playback overlay for rewatching a take. */
function TakePlayer({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      style={{ background: 'rgba(4,7,12,0.92)' }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-[min(96vw,960px)] flex-col border-2"
        style={{ borderColor: INK, background: '#05070C', boxShadow: `7px 7px 0 0 ${GOLD}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(251,246,234,0.15)' }}>
          <span className="truncate font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: GOLD }}>
            Replay · {name}
          </span>
          <button onClick={onClose} aria-label="Close player" className="shrink-0 font-mono text-[15px]" style={{ color: CREAM }}>
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={url} controls autoPlay className="h-full max-h-[78vh] w-full" style={{ background: '#000' }} />
        </div>
      </div>
    </div>
  );
}

export function TakesDrawer({
  booth,
  open,
  onClose,
}: {
  booth: BoothCamera;
  open: boolean;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteFailed, setDeleteFailed] = useState<string | null>(null);
  const [player, setPlayer] = useState<{ url: string; name: string } | null>(null);

  // Load the saved-takes library whenever the drawer opens.
  const { loadLibrary } = booth;
  useEffect(() => {
    if (open) void loadLibrary();
  }, [open, loadLibrary]);

  if (!open) return null;

  // A saved take that also has a local session card is shown only once (local wins).
  const localPaths = new Set(booth.takes.map((t) => `${t.scriptId}/${t.fileName}`));
  const savedOnly = booth.library.filter((s) => !localPaths.has(s.path));

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-[min(94vw,380px)] flex-col border-l-2" style={{ background: '#0B1019', borderColor: 'rgba(251,246,234,0.2)' }}>
      <div className="flex shrink-0 items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(251,246,234,0.15)' }}>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>
          Takes
        </span>
        <button onClick={onClose} aria-label="Close takes" className="font-mono text-[13px]" style={{ color: 'rgba(251,246,234,0.7)' }}>
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {/* This session */}
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(251,246,234,0.5)' }}>
          This session
        </p>
        {booth.takes.length === 0 && (
          <p className="mb-4 font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(251,246,234,0.5)' }}>
            No takes yet. Arm the camera (or the screen for a demo walkthrough), hit play, and every take lands
            here, uploads on its own, and can be replayed right away. Record section by section; short takes
            upload fast and edit clean.
          </p>
        )}
        {booth.takes.map((t) => {
          const chip = STATUS_CHIP[t.status];
          return (
            <div key={t.id} className="mb-3 border p-3" style={{ borderColor: 'rgba(251,246,234,0.18)', background: 'rgba(251,246,234,0.04)' }}>
              <p className="truncate font-mono text-[11px]" style={{ color: CREAM }}>
                {t.fileName}
              </p>
              <p className="mt-1 font-mono text-[10px]" style={{ color: 'rgba(251,246,234,0.55)' }}>
                {Math.floor(t.seconds / 60)}:{String(t.seconds % 60).padStart(2, '0')} · {fmtBytes(t.bytes)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em]" style={{ background: chip.bg, color: chip.fg }}>
                  {t.status === 'uploading' ? `Sending ${Math.round(t.progress * 100)}%` : chip.text}
                </span>
                {t.url && (
                  <button
                    onClick={() => setPlayer({ url: t.url as string, name: t.fileName })}
                    className="font-mono text-[10px] font-bold uppercase underline"
                    style={{ color: GOLD }}
                  >
                    ▶ Watch
                  </button>
                )}
                {t.status === 'failed' && (
                  <button onClick={() => void booth.retry(t.id)} className="font-mono text-[10px] uppercase underline" style={{ color: GOLD }}>
                    Retry
                  </button>
                )}
                {t.url && (
                  <button onClick={() => booth.download(t.id)} className="font-mono text-[10px] uppercase underline" style={{ color: 'rgba(251,246,234,0.7)' }}>
                    Download
                  </button>
                )}
                {confirmDelete === t.id ? (
                  <button
                    onClick={() => {
                      setConfirmDelete(null);
                      void booth.deleteTake(t.id).then((ok) => setDeleteFailed(ok ? null : t.id));
                    }}
                    className="ml-auto font-mono text-[10px] font-bold uppercase underline"
                    style={{ color: '#E0301E' }}
                  >
                    Really delete?
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(t.id)}
                    className="ml-auto font-mono text-[10px] uppercase underline"
                    style={{ color: 'rgba(251,246,234,0.45)' }}
                    aria-label={`Delete take ${t.fileName}`}
                  >
                    Delete
                  </button>
                )}
                {deleteFailed === t.id && (
                  <span className="font-mono text-[9px] uppercase" style={{ color: '#E0301E' }}>
                    Delete failed, try again
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Saved in the booth (the whole bucket) */}
        <div className="mb-2 mt-5 flex items-center justify-between">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'rgba(251,246,234,0.5)' }}>
            Saved in the booth{savedOnly.length > 0 ? ` (${savedOnly.length})` : ''}
          </p>
          <button
            onClick={() => void booth.loadLibrary()}
            className="font-mono text-[10px] uppercase underline"
            style={{ color: 'rgba(251,246,234,0.6)' }}
          >
            {booth.libLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {booth.libError && (
          <p className="mb-3 font-mono text-[10px] uppercase" style={{ color: '#E0301E' }}>
            {booth.libError}
          </p>
        )}
        {!booth.libLoading && !booth.libError && savedOnly.length === 0 && (
          <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'rgba(251,246,234,0.45)' }}>
            Every take you record is stored here and can be rewatched anytime, even from another day or machine.
          </p>
        )}
        {savedOnly.map((s) => (
          <div key={s.path} className="mb-3 border p-3" style={{ borderColor: 'rgba(251,246,234,0.14)', background: 'rgba(251,246,234,0.03)' }}>
            <p className="truncate font-mono text-[11px]" style={{ color: CREAM }}>
              {s.fileName}
            </p>
            <p className="mt-1 truncate font-mono text-[10px]" style={{ color: 'rgba(251,246,234,0.5)' }}>
              {s.scriptId} · {fmtBytes(s.bytes)}{s.updatedAt ? ` · ${fmtWhen(s.updatedAt)}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {s.signedUrl ? (
                <button
                  onClick={() => setPlayer({ url: s.signedUrl as string, name: s.fileName })}
                  className="font-mono text-[10px] font-bold uppercase underline"
                  style={{ color: GOLD }}
                >
                  ▶ Watch
                </button>
              ) : (
                <span className="font-mono text-[10px] uppercase" style={{ color: 'rgba(251,246,234,0.4)' }}>
                  Link expired · refresh
                </span>
              )}
              {s.signedUrl && (
                <a
                  href={s.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] uppercase underline"
                  style={{ color: 'rgba(251,246,234,0.7)' }}
                >
                  Download
                </a>
              )}
              {confirmDelete === s.path ? (
                <button
                  onClick={() => {
                    setConfirmDelete(null);
                    void booth.deleteSaved(s.scriptId, s.fileName).then((ok) => setDeleteFailed(ok ? null : s.path));
                  }}
                  className="ml-auto font-mono text-[10px] font-bold uppercase underline"
                  style={{ color: '#E0301E' }}
                >
                  Really delete?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(s.path)}
                  className="ml-auto font-mono text-[10px] uppercase underline"
                  style={{ color: 'rgba(251,246,234,0.45)' }}
                  aria-label={`Delete saved take ${s.fileName}`}
                >
                  Delete
                </button>
              )}
              {deleteFailed === s.path && (
                <span className="font-mono text-[9px] uppercase" style={{ color: '#E0301E' }}>
                  Delete failed, try again
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {player && <TakePlayer url={player.url} name={player.name} onClose={() => setPlayer(null)} />}
    </div>
  );
}
