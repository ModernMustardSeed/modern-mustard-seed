'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Drawer, Empty, Label, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * DROP ANYTHING. A photograph of a napkin, a screenshot of a text message, a
 * spreadsheet the last office manager left, or a paragraph pasted in.
 *
 * The screen between reading and filing is the product. Every row arrives
 * ticked and editable, a row the reader was unsure about arrives flagged with
 * what was hard to read, and the button says how many people are about to
 * land in the book. Nothing is written until it is pressed.
 *
 * It lives at the top of every room because the moment someone has a napkin
 * in their hand is not the moment to go looking for the right screen.
 */

type Person = {
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  role: string | null;
  tags: string[];
  note: string | null;
  from: string | null;
  sure: 'clear' | 'unclear';
  doubt: string | null;
};

type Read = {
  kind: string;
  summary: string;
  people: Person[];
  post: { text: string; suggestedTags: string[] } | null;
  leftovers: string[];
};

type Dropped = { name: string; type: string; url: string; size: number };

export default function Tray({ open, onClose, onFiled }: { open: boolean; onClose: () => void; onFiled: () => void }) {
  const [files, setFiles] = useState<Dropped[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'upload' | 'read' | 'file' | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [keep, setKeep] = useState<boolean[]>([]);
  const [rows, setRows] = useState<Person[]>([]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFiles([]);
    setText('');
    setRead(null);
    setRows([]);
    setKeep([]);
    setJobId(null);
    setNote(null);
  };

  const upload = useCallback(async (list: File[]) => {
    setBusy('upload');
    setNote(null);
    try {
      const done: Dropped[] = [];
      for (const file of list.slice(0, 8)) {
        const ask = await fetch('/api/cc/tray', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'upload', name: file.name, size: file.size, type: file.type }),
        });
        const j = (await ask.json()) as { ok?: boolean; uploadUrl?: string; url?: string; error?: string };
        if (!j.ok || !j.uploadUrl || !j.url) {
          setNote({ ok: false, text: `${file.name}: ${j.error ?? 'that did not upload.'}` });
          continue;
        }
        const put = await fetch(j.uploadUrl, { method: 'PUT', body: file, headers: { 'content-type': file.type } });
        if (!put.ok) {
          setNote({ ok: false, text: `${file.name} did not upload.` });
          continue;
        }
        done.push({ name: file.name, type: file.type, url: j.url, size: file.size });
      }
      setFiles((prev) => [...prev, ...done].slice(0, 8));
    } finally {
      setBusy(null);
    }
  }, []);

  const land = useCallback((r: Read) => {
    setRead(r);
    setRows(r.people);
    setKeep(r.people.map(() => true));
    setJobId(null);
    setBusy(null);
  }, []);

  const run = async () => {
    setBusy('read');
    setNote(null);
    try {
      const r = await fetch('/api/cc/tray', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'read', text, files }),
      });
      const j = (await r.json()) as { ok?: boolean; read?: Read; queued?: boolean; jobId?: string; note?: string; error?: string };
      if (j.ok && j.read) {
        land(j.read);
        return;
      }
      if (j.queued) {
        setJobId(j.jobId ?? null);
        setNote({ ok: true, text: j.note ?? 'Still reading it.' });
        return;
      }
      setNote({ ok: false, text: j.error ?? 'Nothing could read that.' });
      setBusy(null);
    } catch {
      setNote({ ok: false, text: 'Nothing could read that.' });
      setBusy(null);
    }
  };

  // A slow read finishes on the queue. The screen collects it rather than
  // asking the person to do it again, which is how an answer already paid for
  // gets thrown away.
  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/cc/tray', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'collect', jobId }) });
        const j = (await r.json()) as { status?: string; read?: Read; error?: string };
        if (!alive) return;
        if (j.status === 'done' && j.read) land(j.read);
        if (j.status === 'failed') {
          setJobId(null);
          setBusy(null);
          setNote({ ok: false, text: j.error ?? 'It could not be read.' });
        }
      } catch {
        /* keep waiting; the job is a row and rows wait */
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [jobId, land]);

  const file = async () => {
    setBusy('file');
    setNote(null);
    try {
      const people = rows.filter((_, i) => keep[i]).map((p) => ({
        name: p.name,
        phone: p.phone,
        email: p.email,
        company: p.company,
        tags: p.tags,
        notes: [p.role, p.note].filter(Boolean).join('. ') || null,
      }));
      const r = await fetch('/api/cc/tray', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'file', people, source: files[0]?.name ? `Read from ${files[0].name}` : 'Read from a drop' }),
      });
      const j = (await r.json()) as { ok?: boolean; added?: number; merged?: number; skipped?: Array<{ name: string; why: string }>; error?: string };
      if (!j.ok) {
        setNote({ ok: false, text: j.error ?? 'That did not file.' });
        return;
      }
      const bits = [
        j.added ? `${j.added} added to your book` : '',
        j.merged ? `${j.merged} filled in on people already there` : '',
        j.skipped?.length ? `${j.skipped.length} left out (${j.skipped.slice(0, 3).map((s) => `${s.name}: ${s.why}`).join('; ')})` : '',
      ].filter(Boolean);
      setNote({ ok: true, text: `${bits.join(', ')}.` });
      setRead(null);
      setRows([]);
      setKeep([]);
      setFiles([]);
      setText('');
      onFiled();
    } catch {
      setNote({ ok: false, text: 'That did not file.' });
    } finally {
      setBusy(null);
    }
  };

  const edit = (i: number, patch: Partial<Person>) => setRows((prev) => prev.map((p, n) => (n === i ? { ...p, ...patch } : p)));
  const kept = keep.filter(Boolean).length;

  return (
    <Drawer
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Drop anything"
      footer={
        read && rows.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px] text-[var(--cc-muted)]">{kept} of {rows.length} kept</span>
            <div className="flex gap-2">
              <Button kind="ghost" onClick={reset}>Start over</Button>
              <Button kind="primary" onClick={file} disabled={busy !== null || kept === 0}>
                {busy === 'file' ? 'Filing' : `Add ${kept} to my book`}
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {!read ? (
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-[var(--cc-muted)]">
            A photo of a napkin with names on it. A screenshot of a text. A spreadsheet. A business card. Type or paste anything instead, or as well. It gets read, and you say what is right before a single thing is saved.
          </p>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              const list = Array.from(e.dataTransfer.files ?? []);
              if (list.length) void upload(list);
            }}
            className={cx(
              'rounded-xl border-2 border-dashed px-5 py-8 text-center transition',
              over ? 'border-[var(--cc-accent)] bg-[var(--cc-accent)]/5' : 'border-[var(--cc-line)] bg-[#FAFBFC]',
            )}
          >
            <p className="text-[14px] font-semibold">Drop files here</p>
            <p className="mt-1 text-[12.5px] text-[var(--cc-muted)]">Photos, PDFs, spreadsheets, text. Up to eight at a time.</p>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/csv,text/plain,.csv,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                if (list.length) void upload(list);
                e.target.value = '';
              }}
            />
            <div className="mt-4 flex justify-center">
              <Button onClick={() => fileRef.current?.click()} disabled={busy === 'upload'}>{busy === 'upload' ? 'Uploading' : 'Choose files'}</Button>
            </div>
          </div>

          {files.length > 0 && (
            <ul className="space-y-1.5">
              {files.map((f, i) => (
                <li key={f.url} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] px-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate">{f.name}</span>
                  <button className="flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--cc-muted)] underline" onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div>
            <span className="mb-1.5 block"><Label>Or type it</Label></span>
            <textarea className={cx(inputCls, 'min-h-[100px] resize-y leading-relaxed')} value={text} onChange={(e) => setText(e.target.value)} placeholder="Met Dana Fulbright at the Whitefish chamber lunch, 406 555 0134, she does title work." />
          </div>

          {note && <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}

          <Button kind="primary" full onClick={run} disabled={busy !== null || (!files.length && text.trim().length < 3)}>
            {busy === 'read' || jobId ? 'Reading it' : 'Read it'}
          </Button>
          {jobId && <p className="text-[12.5px] text-[var(--cc-muted)]">Handwriting takes longer than typing. This stays open and picks the answer up on its own.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
            <p className="text-[13.5px] leading-relaxed">{read.summary}</p>
            {read.leftovers.length > 0 && (
              <p className="mt-2 text-[12.5px] text-[var(--cc-muted)]">Also in there, filed nowhere: {read.leftovers.join('; ')}.</p>
            )}
          </div>

          {read.post && (
            <div className="rounded-lg border border-[var(--cc-line)] p-4">
              <p className="flex items-center gap-2 text-[14px] font-semibold">
                This reads like something to say <Badge tone="live">A post</Badge>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed">{read.post.text}</p>
              <p className="mt-2 text-[12.5px] text-[var(--cc-muted)]">Copy it into Marketing to shape it for each feed. Nothing is scheduled from here.</p>
            </div>
          )}

          {rows.length === 0 ? (
            <Empty title="No people in it" note="Nothing was added to your book." />
          ) : (
            <ul className="space-y-3">
              {rows.map((p, i) => (
                <li key={i} className={cx('rounded-lg border p-3', keep[i] ? 'border-[var(--cc-line)]' : 'border-dashed border-[var(--cc-line)] opacity-55')}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 flex-none accent-[var(--cc-accent)]"
                      checked={keep[i]}
                      onChange={(e) => setKeep((prev) => prev.map((v, n) => (n === i ? e.target.checked : v)))}
                      aria-label={`Keep ${p.name ?? 'this one'}`}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className={inputCls} value={p.name ?? ''} onChange={(e) => edit(i, { name: e.target.value })} placeholder="Name" aria-label="Name" />
                        <input className={inputCls} value={p.phone ?? ''} onChange={(e) => edit(i, { phone: e.target.value })} placeholder="Phone" aria-label="Phone" />
                        <input className={inputCls} value={p.email ?? ''} onChange={(e) => edit(i, { email: e.target.value })} placeholder="Email" aria-label="Email" />
                        <input className={inputCls} value={p.company ?? ''} onChange={(e) => edit(i, { company: e.target.value })} placeholder="Company" aria-label="Company" />
                      </div>
                      <input
                        className={inputCls}
                        value={p.tags.join(', ')}
                        onChange={(e) => edit(i, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8) })}
                        placeholder="Tags, separated by commas"
                        aria-label="Tags"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--cc-muted)]">
                        {p.sure === 'unclear' && <Badge tone="warn">Check this one</Badge>}
                        {p.doubt && <span>{p.doubt}</span>}
                        {p.from && <span className="truncate">From {p.from}</span>}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {note && <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}
          <p className="text-[12.5px] text-[var(--cc-muted)]">
            <Icon name="check" size={12} /> Anyone already in your book is filled in rather than added twice.
          </p>
        </div>
      )}
    </Drawer>
  );
}
