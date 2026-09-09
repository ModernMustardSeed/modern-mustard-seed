'use client';

import { useRef, useState } from 'react';

/**
 * The drop zone. Every photo is re-encoded in the browser as a JPEG no wider
 * than 2048px before it goes up, because Instagram takes JPEG only and a
 * 40 MB phone photo has no business on a feed. HEIC from an iPhone decodes in
 * Safari; on a browser that cannot decode it, the file is refused with a
 * plain line rather than uploaded broken.
 */
export type Uploaded = { url: string; name: string };

export default function PhotoDrop({
  onUploaded,
  client,
  label = 'Drop photos here, or tap to choose',
  compact = false,
}: {
  onUploaded: (files: Uploaded[]) => Promise<void> | void;
  /** Admin use only: upload on a client's behalf. */
  client?: string;
  label?: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function toJpeg(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file).catch(() => null);
    if (!bitmap) throw new Error(`${file.name}: this browser cannot read that format. Save it as a JPEG and try again.`);
    const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare the image.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))), 'image/jpeg', 0.88));
  }

  async function handle(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name));
    if (!list.length) {
      setError('Photos only.');
      return;
    }
    const done: Uploaded[] = [];
    try {
      for (let i = 0; i < list.length; i++) {
        const f = list[i];
        setBusy(`Preparing ${i + 1} of ${list.length}`);
        const jpeg = await toJpeg(f);
        setBusy(`Uploading ${i + 1} of ${list.length}`);
        const start = await fetch('/api/portal/posting/upload', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name: f.name.replace(/\.[^.]+$/, '.jpg'), size: jpeg.size, type: 'image/jpeg', client }),
        });
        const j = (await start.json().catch(() => ({}))) as { ok?: boolean; uploadUrl?: string; url?: string; error?: string };
        if (!start.ok || !j.ok || !j.uploadUrl || !j.url) throw new Error(j.error ?? 'Could not start the upload.');
        const put = await fetch(j.uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-upsert': 'false' }, body: jpeg });
        if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
        done.push({ url: j.url, name: f.name });
      }
      await onUploaded(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      if (done.length) await onUploaded(done);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files?.length) void handle(e.dataTransfer.files);
        }}
        disabled={!!busy}
        className={`w-full border-2 border-dashed rounded-2xl text-center transition-colors ${compact ? 'px-4 py-5' : 'px-6 py-10'} ${over ? 'border-[#161616] bg-[#F5B700]/25' : 'border-[#161616]/40 bg-white hover:bg-[#F5B700]/10'} disabled:opacity-60`}
      >
        <span className="block font-sans font-bold text-[#161616]">{busy ?? label}</span>
        <span className="block text-[#161616]/55 font-body text-sm mt-1">Phone photos are fine. They are sized for the feeds on the way up.</span>
      </button>
      <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => e.target.files && void handle(e.target.files)} />
      {error && <p className="mt-2 text-sm font-semibold text-[#E0301E]">{error}</p>}
    </div>
  );
}
