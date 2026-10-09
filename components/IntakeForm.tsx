'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IntakeInput, IntakeProfile, IntakeSection, IntakeUpload } from '@/lib/intake-profiles';

/**
 * The paid-client intake, drawn from the profile for this business.
 *
 * Written for an owner between jobs, patients or services, not for somebody at
 * a desk. Every question can be answered from memory and nothing is required,
 * because a form that refuses to submit is a form that does not come back.
 *
 * What it asks comes from lib/intake-profiles.ts: a physical therapist is asked
 * about conditions, insurance and referrals, a builder about crews and towns.
 * Photos sit first, because they are the ask that matters most.
 *
 * Rebuilt 2026-10-08 after Tami Ellis (Blue Mountain PT) could neither add a
 * photo nor keep what she had typed:
 *
 *  - Files go from the phone straight to storage on a signed URL. They used to
 *    go through a Vercel function that rejects anything over 4.5 MB, which is
 *    every phone photo, and the form swallowed the error. Photos are shrunk in
 *    the browser first, each one shows its own progress, and a failure says so
 *    and offers a retry. Each file is filed on the client's card as it lands.
 *  - Answers save as she types (to the server and to this device), on leaving
 *    the page, and on "Save and finish later". A phone that reloads the tab
 *    while she is in her camera roll brings every word back.
 *  - The form never blocks on browser validation. An email field holding
 *    "same as above" used to stop the whole form submitting, silently.
 */

type Kind = IntakeUpload['kind'];

type Item = {
  id: string;
  /** The upload card it belongs to: "Headshot", "Clinic photo", "Logo"... */
  group: string;
  kind: Kind;
  name: string;
  status: 'uploading' | 'filing' | 'done' | 'failed';
  progress: number;
  url?: string;
  /** Set once the bytes are in storage, so a retry only re-files. */
  path?: string;
  preview?: string;
  error?: string;
  file?: File;
  tries: number;
};

export type IntakeSaved = {
  answers: Record<string, string>;
  submittedAt: string | null;
  updatedAt: string | null;
  files: Array<{ label: string; url: string; kind: string }>;
};

type SaveState = { state: 'idle' | 'saving' | 'saved' | 'retrying'; at?: Date };

const FIELD =
  'w-full bg-white border-2 border-[#0b3b44] rounded-lg px-4 py-3 font-body text-[16px] text-[#0b3b44] placeholder-[#0b3b44]/35 focus:outline-none focus:shadow-[3px_3px_0_0_#0b3b44] transition-shadow';
const LABEL = 'block font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-[#0b3b44]/55 mb-2';
const HINT = 'mt-2 font-body text-[13px] leading-relaxed text-[#0b3b44]/55';

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)(\?|$)/i;
const UPLOAD_CONCURRENCY = 3;
const SAVE_DELAY_MS = 1200;

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

function timeLabel(d: Date) {
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/**
 * Shrinks a big phone photo before it leaves the phone: longest edge 2560 px,
 * JPEG at 0.86. Far faster on a weak signal and still sharper than any slot on
 * the site needs. Anything the browser cannot decode (HEIC on Chrome, PDFs,
 * SVG logos) goes up untouched, which the bucket accepts as is.
 */
async function shrink(file: File, kind: Kind): Promise<File> {
  if (!file.type.startsWith('image/') || /svg|gif/.test(file.type) || file.size < 1_500_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    // A PNG logo keeps its transparency. Everything else becomes a JPEG.
    const type = kind === 'logo' && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, type, 0.86));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + (type === 'image/png' ? '.png' : '.jpg'), { type });
  } catch {
    return file;
  }
}

/** PUT to the signed storage URL, reporting progress. Same body storage-js sends. */
function putToStorage(url: string, file: File, contentType: string, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`storage ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    xhr.ontimeout = () => reject(new Error('timeout'));
    xhr.timeout = 5 * 60_000;
    const fd = new FormData();
    fd.append('cacheControl', '3600');
    fd.append('', new Blob([file], { type: contentType }), file.name);
    xhr.send(fd);
  });
}

function Section({
  n,
  title,
  blurb,
  children,
}: {
  n: number;
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pop-card p-6 md:p-9">
      <div className="mb-6 flex items-start gap-4">
        <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b3b44] text-base font-black text-[#f5b700]">
          {n}
        </span>
        <div>
          <h2 className="font-display text-2xl leading-tight font-black tracking-tight text-[#0b3b44] md:text-3xl">
            {title}
          </h2>
          {blurb ? <p className="font-body mt-1.5 text-[15px] leading-relaxed text-[#0b3b44]/65">{blurb}</p> : null}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** A tap target that reads as a place to drop things, not a browser default. */
function Drop({
  title,
  detail,
  accept,
  multiple,
  onFiles,
  done,
}: {
  title: string;
  detail: string;
  accept?: string;
  multiple?: boolean;
  onFiles: (list: FileList | null) => void;
  done?: string;
}) {
  return (
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-[#0b3b44]/40 bg-white px-5 py-8 text-center transition-colors focus-within:border-[#0b3b44] hover:border-[#0b3b44] hover:bg-[#fff6d6]">
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
        className="sr-only"
      />
      <span className="font-display block text-xl font-black text-[#0b3b44]">{title}</span>
      <span className="font-body mt-1 block text-[14px] text-[#0b3b44]/60">{detail}</span>
      {done ? (
        <span className="mt-3 inline-block rounded-full bg-[#0a7c78] px-3 py-1 font-mono text-[11px] font-bold tracking-[0.12em] text-white uppercase">
          {done}
        </span>
      ) : null}
    </label>
  );
}

function Choice({
  name,
  value,
  title,
  detail,
  defaultChecked,
}: {
  name: string;
  value: string;
  title: string;
  detail: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-[#0b3b44]/15 bg-white p-4 transition-colors has-[:checked]:border-[#0b3b44] has-[:checked]:bg-[#fff6d6]">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 shrink-0 accent-[#0a7c78]"
      />
      <span>
        <span className="font-body block text-[16px] font-bold text-[#0b3b44]">{title}</span>
        <span className="font-body mt-0.5 block text-[14px] leading-relaxed text-[#0b3b44]/65">{detail}</span>
      </span>
    </label>
  );
}

/** One photo: its picture, its progress, and what to do if it failed. */
function Tile({ item, onRetry, onRemove }: { item: Item; onRetry: () => void; onRemove: () => void }) {
  const [broken, setBroken] = useState(false);
  const busy = item.status === 'uploading' || item.status === 'filing';
  return (
    <div className="relative aspect-square overflow-hidden rounded-md border-2 border-[#0b3b44]/20 bg-white">
      {item.preview && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.preview} alt={item.name} onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="font-body flex h-full w-full items-center justify-center p-2 text-center text-[11px] break-all text-[#0b3b44]/60">
          {item.name}
        </span>
      )}
      {busy ? (
        <span className="absolute inset-0 flex flex-col items-center justify-center bg-white/75 font-mono text-[11px] font-bold text-[#0a7c78]">
          {item.status === 'filing' ? 'Saving' : `${item.progress}%`}
          <span className="mt-1.5 h-1 w-3/4 overflow-hidden rounded-full bg-[#0b3b44]/15">
            <span className="block h-full bg-[#0a7c78] transition-all" style={{ width: `${item.status === 'filing' ? 100 : item.progress}%` }} />
          </span>
        </span>
      ) : null}
      {item.status === 'failed' ? (
        <button
          type="button"
          onClick={onRetry}
          className="absolute inset-0 flex flex-col items-center justify-center bg-[#b3261e]/90 px-1 text-center font-mono text-[10px] leading-tight font-bold text-white"
        >
          Did not upload
          <span className="mt-1 underline">Tap to retry</span>
        </button>
      ) : null}
      {!busy ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#0b3b44] text-[15px] leading-none text-white hover:bg-[#b3261e]"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

/** One document: its name and its state, for files that are not pictures. */
function Row({ item, onRetry, onRemove }: { item: Item; onRetry: () => void; onRemove: () => void }) {
  const busy = item.status === 'uploading' || item.status === 'filing';
  return (
    <div className="flex items-center gap-3 rounded-lg border-2 border-[#0b3b44]/15 bg-white px-4 py-3">
      <span className="font-body min-w-0 flex-1 truncate text-[14px] font-bold text-[#0b3b44]">{item.name}</span>
      {busy ? (
        <span className="font-mono text-[11px] font-bold text-[#0a7c78]">
          {item.status === 'filing' ? 'Saving' : `${item.progress}%`}
        </span>
      ) : item.status === 'failed' ? (
        <button type="button" onClick={onRetry} className="font-mono text-[11px] font-bold text-[#b3261e] underline">
          Did not upload. Retry
        </button>
      ) : (
        <span className="font-mono text-[11px] font-bold text-[#2e7d32]">Saved</span>
      )}
      {!busy ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="px-1 text-lg leading-none text-[#0b3b44]/40 hover:text-[#b3261e]"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

export default function IntakeForm({
  intakeKey,
  company,
  profile,
  services = [],
  saved,
}: {
  intakeKey: string;
  company: string;
  profile: IntakeProfile;
  /**
   * What the site already says the business does.
   *
   * Sarah, 2026-08-28: "ask real specialties, and let him know what I have
   * already." Asking an owner to list services in an empty box gets four of
   * them and a shrug. Showing the list already written and asking what is wrong
   * with it gets corrections, which is the useful answer.
   */
  services?: string[];
  /** Everything already given on an earlier visit: answers and files. */
  saved?: IntakeSaved;
}) {
  const answers0 = saved?.answers ?? {};
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [parked, setParked] = useState(false);
  const [save, setSave] = useState<SaveState>({ state: 'idle' });
  const [items, setItems] = useState<Item[]>(() =>
    (saved?.files ?? []).map((f) => {
      const cut = f.label.indexOf(': ');
      return {
        id: rid(),
        group: cut > 0 ? f.label.slice(0, cut) : f.label,
        kind: (['photo', 'logo', 'doc'].includes(f.kind) ? f.kind : 'doc') as Kind,
        name: cut > 0 ? f.label.slice(cut + 2) : f.label,
        status: 'done',
        progress: 100,
        url: f.url,
        preview: IMAGE_EXT.test(f.url) ? f.url : undefined,
        tries: 0,
      };
    }),
  );

  const formRef = useRef<HTMLFormElement>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>('');
  const storeKey = `mms-intake:${intakeKey}`;

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
  }, []);

  /* ---------------------------------------------------------------- */
  /* Answers: autosave                                                 */
  /* ---------------------------------------------------------------- */

  const snapshot = useCallback((): Record<string, string> => {
    const form = formRef.current;
    if (!form) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of new FormData(form).entries()) if (typeof v === 'string') out[k] = v;
    return out;
  }, []);

  const keepLocal = useCallback(
    (answers: Record<string, string>) => {
      try {
        localStorage.setItem(storeKey, JSON.stringify({ answers, at: new Date().toISOString() }));
      } catch {
        /* Private mode or a full disk: the server copy still saves. */
      }
    },
    [storeKey],
  );

  const flush = useCallback(
    async (keepalive = false): Promise<boolean> => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      /* No form on the page means the thank-you has replaced it. An iPhone
       * fires pagehide when that tab is closed, and saving an absent form sent
       * {} and erased every answer just submitted (loop test, 2026-10-09). */
      if (!formRef.current) return true;
      const answers = snapshot();
      const body = JSON.stringify({ key: intakeKey, answers });
      const sig = JSON.stringify(answers);
      if (sig === lastSaved.current) return true;
      keepLocal(answers);
      setSave({ state: 'saving' });
      try {
        const r = await fetch('/api/intake/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body,
          keepalive,
        });
        if (!r.ok) throw new Error(String(r.status));
        lastSaved.current = sig;
        setSave({ state: 'saved', at: new Date() });
        return true;
      } catch {
        // Kept on this device already. The effect below tries the server again.
        setSave({ state: 'retrying' });
        return false;
      }
    },
    [intakeKey, keepLocal, snapshot],
  );

  useEffect(() => {
    if (save.state !== 'retrying') return;
    const t = setTimeout(() => void flush(), 8000);
    return () => clearTimeout(t);
  }, [save.state, flush]);

  const onEdit = useCallback(() => {
    keepLocal(snapshot());
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    setParked(false);
  }, [flush, keepLocal, snapshot]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    lastSaved.current = JSON.stringify(snapshot());

    /* A copy on this device that is newer than the server's (the tab reloaded
     * before the last save went out, or the signal dropped) wins, and is sent. */
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const local = JSON.parse(raw) as { answers?: Record<string, string>; at?: string };
        const newer = local.at && (!saved?.updatedAt || new Date(local.at) > new Date(saved.updatedAt));
        if (newer && local.answers) {
          let changed = false;
          for (const [name, value] of Object.entries(local.answers)) {
            const el = form.elements.namedItem(name);
            if (!el || typeof value !== 'string') continue;
            if (el instanceof RadioNodeList) {
              if (el.value !== value) {
                el.value = value;
                changed = true;
              }
            } else if ((el instanceof HTMLInputElement && el.type !== 'file') || el instanceof HTMLTextAreaElement) {
              if (el.value !== value) {
                el.value = value;
                changed = true;
              }
            }
          }
          if (changed) setTimeout(() => void flush(), 0);
        }
      }
    } catch {
      /* Unreadable local copy: the server's answers stand. */
    }

    const away = () => {
      if (document.visibilityState === 'hidden') void flush(true);
    };
    const leaving = () => void flush(true);
    const guard = (e: BeforeUnloadEvent) => {
      if (itemsRef.current.some((x) => x.status === 'uploading' || x.status === 'filing')) e.preventDefault();
    };
    document.addEventListener('visibilitychange', away);
    window.addEventListener('pagehide', leaving);
    window.addEventListener('beforeunload', guard);
    return () => {
      document.removeEventListener('visibilitychange', away);
      window.removeEventListener('pagehide', leaving);
      window.removeEventListener('beforeunload', guard);
    };
    // Runs once on mount: the form's own state is the source of truth after.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /* Files: straight to storage, filed on the card as they land        */
  /* ---------------------------------------------------------------- */

  async function sendOne(item: Item): Promise<void> {
    let path = item.path;
    let tries = item.tries;
    // One quiet retry for a dropped signal, then it is the client's call.
    for (let attempt = 0; attempt < 2; attempt++) {
      tries += 1;
      patch(item.id, { status: 'uploading', progress: 0, error: undefined, tries });
      try {
        if (!path) {
          if (!item.file) throw new Error('This file is no longer on the page. Add it again.');
          const file = await shrink(item.file, item.kind);
          const s = await fetch('/api/intake/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: intakeKey, name: file.name, type: file.type, size: file.size }),
          });
          if (!s.ok) {
            throw new Error(
              s.status === 413
                ? 'This file is over 50 MB. Email it to sarah@modernmustardseed.com instead.'
                : 'Could not start the upload.',
            );
          }
          const signed = (await s.json()) as { signedUrl: string; path: string; contentType: string };
          await putToStorage(signed.signedUrl, file, signed.contentType, (pct) => patch(item.id, { progress: pct }));
          path = signed.path;
          patch(item.id, { path });
        }
        patch(item.id, { status: 'filing', progress: 100 });
        const r = await fetch('/api/intake/file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: intakeKey, path, label: `${item.group}: ${item.name}`, kind: item.kind }),
        });
        if (!r.ok) throw new Error('Uploaded, but not saved to your file yet.');
        const { url } = (await r.json()) as { url: string };
        patch(item.id, { status: 'done', url, file: undefined });
        return;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Upload failed.';
        if (attempt === 0 && item.tries === 0 && !/50 MB|no longer/.test(message)) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        patch(item.id, { status: 'failed', error: message });
        return;
      }
    }
  }

  function addFiles(list: FileList | null, u: IntakeUpload) {
    if (!list?.length) return;
    const picked = Array.from(list).slice(0, u.multiple ? 60 : 1);
    const fresh: Item[] = picked.map((file) => ({
      id: rid(),
      group: u.label,
      kind: u.kind,
      name: file.name || 'photo.jpg',
      status: 'uploading',
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      file,
      tries: 0,
    }));
    if (u.multiple) {
      setItems((cur) => [...cur, ...fresh]);
    } else {
      // A single-file slot (the logo) replaces what was there, on the card too.
      for (const old of itemsRef.current.filter((x) => x.group === u.label && x.status === 'done' && x.url)) {
        void removeFromCard(old.url!);
      }
      setItems((cur) => [...cur.filter((x) => x.group !== u.label), ...fresh]);
    }
    const queue = [...fresh];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await sendOne(next);
    };
    void Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, worker));
  }

  async function removeFromCard(url: string) {
    try {
      await fetch('/api/intake/file', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: intakeKey, url }),
      });
    } catch {
      /* It stays on the card, which is the safe side to fail on. */
    }
  }

  function remove(item: Item) {
    setItems((cur) => cur.filter((x) => x.id !== item.id));
    if (item.status === 'done' && item.url) void removeFromCard(item.url);
  }

  const busy = items.filter((x) => x.status === 'uploading' || x.status === 'filing').length;
  const failed = items.filter((x) => x.status === 'failed').length;

  /* ---------------------------------------------------------------- */
  /* Send it in, or park it                                            */
  /* ---------------------------------------------------------------- */

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy > 0) return;
    const answers = Object.fromEntries(Object.entries(snapshot()).map(([k, v]) => [k, v.trim()]));
    setStatus('sending');
    setErr('');
    try {
      const r = await fetch('/api/intake/contractor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: intakeKey,
          answers,
          files: items.filter((x) => x.status === 'done' && x.url).map((x) => ({ label: `${x.group}: ${x.name}`, url: x.url, kind: x.kind })),
        }),
      });
      if (!r.ok) throw new Error(String(r.status));
      lastSaved.current = JSON.stringify(snapshot());
      keepLocal(snapshot());
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      void flush();
      setStatus('error');
      setErr(
        'That did not go through, but everything you typed and every photo is saved. Try once more, or email sarah@modernmustardseed.com and I will take it from there.',
      );
    }
  }

  async function park() {
    const ok = await flush();
    setParked(ok);
    if (!ok) {
      setErr('Saved on this device. It will reach us the moment your signal is back. Keep this page open a moment longer.');
      setStatus('error');
    }
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  /* Uploads are counted by their card label, so a headshot and clinic photos
   * in the same section each show their own count. */
  const inGroup = (label: string) => items.filter((x) => x.group === label);

  function renderInput(f: IntakeInput) {
    /* A hint longer than a phone-width box is a hint nobody reads, so a field
     * with one gets two lines instead of a cut-off sentence. */
    const rows = f.long ? 4 : (f.placeholder?.length ?? 0) > 44 && f.type !== 'email' && f.type !== 'tel' ? 2 : 0;
    const value = answers0[f.name] ?? f.defaultValue;
    return (
      <div key={f.name}>
        <label className={LABEL} htmlFor={`f-${f.name}`}>
          {f.label}
        </label>
        {rows ? (
          <textarea
            id={`f-${f.name}`}
            name={f.name}
            rows={rows}
            defaultValue={value}
            placeholder={f.placeholder}
            className={FIELD}
          />
        ) : (
          <input
            id={`f-${f.name}`}
            name={f.name}
            type={f.type ?? 'text'}
            inputMode={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : undefined}
            defaultValue={value}
            placeholder={f.placeholder}
            className={FIELD}
          />
        )}
      </div>
    );
  }

  /* Half-width fields pair up into a two-column grid; full-width ones stand alone. */
  function renderFields(fields: IntakeInput[]) {
    const out: React.ReactNode[] = [];
    let run: IntakeInput[] = [];
    const flushRun = () => {
      if (!run.length) return;
      out.push(
        <div key={`grid-${run[0].name}`} className="grid gap-5 sm:grid-cols-2">
          {run.map(renderInput)}
        </div>,
      );
      run = [];
    };
    for (const f of fields) {
      if (f.half) run.push(f);
      else {
        flushRun();
        out.push(renderInput(f));
      }
    }
    flushRun();
    return out;
  }

  function renderUpload(u: IntakeUpload) {
    const mine = inGroup(u.label);
    const done = mine.filter((x) => x.status === 'done').length;
    const noun = u.kind === 'doc' ? 'file' : 'photo';
    const pictures = u.preview || u.kind === 'logo';
    return (
      <div key={u.label}>
        <Drop
          title={u.title}
          detail={u.detail}
          accept={u.accept}
          multiple={u.multiple}
          onFiles={(l) => addFiles(l, u)}
          done={done === 0 ? undefined : u.kind === 'logo' ? 'Logo saved' : `${done} ${noun}${done === 1 ? '' : 's'} saved`}
        />
        {mine.length > 0 &&
          (pictures ? (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {mine.map((x) => (
                <Tile key={x.id} item={x} onRetry={() => void sendOne(x)} onRemove={() => remove(x)} />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {mine.map((x) => (
                <Row key={x.id} item={x} onRetry={() => void sendOne(x)} onRemove={() => remove(x)} />
              ))}
            </div>
          ))}
      </div>
    );
  }

  function renderSection(s: IntakeSection, i: number) {
    return (
      <Section key={s.title} n={i + 1} title={s.title} blurb={s.blurb}>
        {s.knownServices && services.length > 0 ? (
          <div className="rounded-lg border-2 border-[#0b3b44]/15 bg-[#fbf5ea] p-5">
            <p className={LABEL}>What your site already lists</p>
            <p className="font-body text-[15px] leading-relaxed text-[#0b3b44]/80">{services.join(', ')}.</p>
            <p className={HINT}>Tell us below what to add or take off. Nothing is set, and changes are always included.</p>
          </div>
        ) : null}

        {(s.uploads ?? []).map(renderUpload)}

        {/* The domain. The single question that blocks going live, and the one
          * an owner is least likely to volunteer, because half of them are not
          * sure whether they own one. So "not sure" is a real answer here. */}
        {s.domain ? (
          <div className="space-y-3">
            {(
              [
                ['have-one', 'I already own one', 'Type it below, and where you bought it if you remember. We handle the setup.'],
                ['get-me-one', 'Get me one', 'We find a strong, easy-to-say name for your business and register it for you.'],
                ['not-sure', 'Not sure', 'We will look it up and walk you through it.'],
              ] as const
            ).map(([value, title, detail]) => (
              <Choice
                key={value}
                name="domain"
                value={value}
                title={title}
                detail={detail}
                defaultChecked={answers0.domain ? answers0.domain === value : s.domain?.defaultChoice === value}
              />
            ))}
          </div>
        ) : null}

        {renderFields(s.fields)}
      </Section>
    );
  }

  if (status === 'done') {
    return (
      <div className="pop-card-yellow p-10 text-center md:p-14">
        <p className="mb-4 font-mono text-[10px] font-bold tracking-[0.3em] text-[#0b3b44]/60 uppercase">Received</p>
        <h2 className="font-display mb-4 text-3xl font-black tracking-tight text-[#0b3b44] md:text-5xl">
          Thank you{company && company !== 'your business' ? `, ${company}` : ''}.
        </h2>
        <p className="font-body mx-auto max-w-lg text-[17px] leading-relaxed text-[#0b3b44]/80">
          I have everything I need to start building {company}. I will email you the moment it is ready to look at,
          and if one more thing comes up I will call or text.
        </p>
        <p className="font-body mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[#0b3b44]/65">
          Remembered something, or found more photos? This same link still works.
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-lg border-2 border-[#0b3b44] bg-white px-5 py-3 font-sans text-xs font-extrabold tracking-[0.18em] text-[#0b3b44] uppercase"
        >
          Add something
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} onChange={onEdit} noValidate className="space-y-8">
      <input type="hidden" name="kind" value={profile.kind} />

      {saved?.submittedAt ? (
        <p className="pop-card-cream font-body p-5 text-center text-[15px] leading-relaxed text-[#0b3b44]/80">
          You sent this in on{' '}
          {new Date(saved.submittedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Everything you
          gave us is below. Change or add anything and send it again.
        </p>
      ) : Object.keys(answers0).length > 1 || items.length > 0 ? (
        <p className="pop-card-cream font-body p-5 text-center text-[15px] leading-relaxed text-[#0b3b44]/80">
          Welcome back. Everything you started is right here, so pick up wherever you left off.
        </p>
      ) : null}

      {profile.sections.map(renderSection)}

      {status === 'error' && (
        <p role="alert" className="pop-card-cream font-body p-4 text-center text-[15px] font-bold text-[#b3261e]">
          {err}
        </p>
      )}

      <div>
        {failed > 0 && busy === 0 ? (
          <p className="font-body mb-4 text-center text-[14px] font-bold text-[#b3261e]">
            {failed} {failed === 1 ? 'file' : 'files'} did not upload. Tap {failed === 1 ? 'it' : 'them'} above to retry,
            or send the rest now.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={status === 'sending' || busy > 0}
          className="w-full rounded-xl border-2 border-[#0b3b44] bg-[#f5b700] py-5 font-sans text-sm font-extrabold tracking-[0.2em] text-[#0b3b44] uppercase shadow-[5px_5px_0_0_#0b3b44] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
        >
          {busy > 0 ? `Finishing ${busy} upload${busy === 1 ? '' : 's'}...` : status === 'sending' ? 'Sending...' : 'Send it in'}
        </button>
        <button
          type="button"
          onClick={() => void park()}
          className="mt-3 w-full rounded-xl border-2 border-[#0b3b44] bg-white py-4 font-sans text-xs font-extrabold tracking-[0.2em] text-[#0b3b44] uppercase transition-colors hover:bg-[#fff6d6]"
        >
          Save and finish later
        </button>
        {parked ? (
          <p role="status" className="pop-card-cream font-body mt-4 p-4 text-center text-[15px] leading-relaxed text-[#0b3b44]">
            Saved. Come back to this same link anytime, on any device, and everything will be right here.
          </p>
        ) : null}
        <p className="font-body mt-4 text-center text-[13px] text-[#0b3b44]/55">
          Everything is optional, and it saves as you go. Send what you have now and add the rest anytime.
        </p>
      </div>

      <p
        aria-live="polite"
        className={`pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border-2 border-[#0b3b44] bg-white px-4 py-1.5 font-mono text-[11px] font-bold tracking-[0.08em] text-[#0b3b44] shadow-[3px_3px_0_0_#0b3b44] transition-opacity ${
          save.state === 'idle' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {save.state === 'saving'
          ? 'Saving...'
          : save.state === 'retrying'
            ? 'Saved on this phone. Sending when the signal is back.'
            : save.at
              ? `Saved ${timeLabel(save.at)}`
              : ''}
      </p>
    </form>
  );
}
