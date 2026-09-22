'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, Label, Skeleton, cx, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * FROM THE SITE. Built for one hand, outside, in gloves, before the concrete
 * truck arrives.
 *
 * Everything on this screen is big, there are three fields, and the button at
 * the end does all of it. The photographs become the job's own record, a note
 * to the homeowner, and a post, and the person on site decides which of the
 * three actually happen by leaving a tick in place or taking it out.
 *
 * The camera input carries `capture`, so on a phone the button opens the
 * camera instead of a file browser. That one attribute is most of the
 * difference between a tool used on site and a tool used that evening, which
 * means never.
 */

type Job = { id: string; name: string; stage: string; contact_name: string | null; contact_email: string | null; town: string | null };

type Read = {
  log: string;
  clientNote: { subject: string; body: string } | null;
  post: string | null;
  saw: string[];
  careful: string[];
};

export default function Field() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [jobId, setJobId] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [busy, setBusy] = useState<'upload' | 'read' | 'file' | null>(null);
  const [read, setRead] = useState<Read | null>(null);
  const [keep, setKeep] = useState({ log: true, note: true, post: true });
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [readId, setReadId] = useState<string | null>(null);
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/cc/jobs', { cache: 'no-store' });
        const j = (await r.json()) as { jobs?: Job[] };
        const open = (j.jobs ?? []).filter((x) => ['design', 'estimate', 'contract', 'building'].includes(x.stage));
        setJobs(open.length ? open : (j.jobs ?? []));
        if (open.length === 1) setJobId(open[0].id);
      } catch {
        setJobs([]);
      }
    })();
  }, []);

  const job = (jobs ?? []).find((j) => j.id === jobId) ?? null;

  const upload = useCallback(async (list: File[]) => {
    setBusy('upload');
    setNote(null);
    try {
      const done: Array<{ url: string; name: string; type: string }> = [];
      for (const file of list.slice(0, 8)) {
        const ask = await fetch('/api/cc/field', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'upload', name: file.name, size: file.size, type: file.type }) });
        const j = (await ask.json()) as { ok?: boolean; uploadUrl?: string; url?: string; error?: string };
        if (!j.ok || !j.uploadUrl || !j.url) {
          setNote({ ok: false, text: j.error ?? 'That photo did not upload.' });
          continue;
        }
        const put = await fetch(j.uploadUrl, { method: 'PUT', body: file, headers: { 'content-type': file.type } });
        if (put.ok) done.push({ url: j.url, name: file.name, type: file.type });
        else setNote({ ok: false, text: 'That photo did not upload.' });
      }
      setFiles((prev) => [...prev, ...done].slice(0, 8));
      setRead(null);
    } finally {
      setBusy(null);
    }
  }, []);

  const land = useCallback((r: Read) => {
    setRead(r);
    setReadId(null);
    setBusy(null);
    setKeep({ log: true, note: Boolean(r.clientNote), post: Boolean(r.post) });
  }, []);

  const run = async () => {
    setBusy('read');
    setNote(null);
    try {
      const r = await fetch('/api/cc/field', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'read', jobId, text, files }) });
      const j = (await r.json()) as { ok?: boolean; read?: Read; queued?: boolean; jobId?: string; note?: string; error?: string };
      if (j.ok && j.read) return land(j.read);
      if (j.queued) {
        setReadId(j.jobId ?? null);
        setNote({ ok: true, text: j.note ?? 'Still reading the photos.' });
        return;
      }
      setNote({ ok: false, text: j.error ?? 'Nothing could read that.' });
      setBusy(null);
    } catch {
      setNote({ ok: false, text: 'Nothing could read that.' });
      setBusy(null);
    }
  };

  // A slow read finishes on the queue. Somebody standing in a doorway should
  // not have to do it twice.
  useEffect(() => {
    if (!readId) return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/cc/field', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'collect', readId, jobId, text, files }) });
        const j = (await r.json()) as { status?: string; read?: Read; error?: string };
        if (!alive) return;
        if (j.status === 'done' && j.read) land(j.read);
        if (j.status === 'failed') {
          setReadId(null);
          setBusy(null);
          setNote({ ok: false, text: j.error ?? 'It could not be read.' });
        }
      } catch {
        /* the job is a row and rows wait */
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [readId, jobId, text, files, land]);

  const send = async () => {
    if (!read) return;
    setBusy('file');
    setNote(null);
    try {
      const r = await fetch('/api/cc/field', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'file', jobId, files, read, keep }) });
      const j = (await r.json()) as { ok?: boolean; done?: string[]; failed?: string[] };
      const said = [j.done?.length ? `Filed ${j.done.join(', ')}.` : '', j.failed?.length ? `Not done: ${j.failed.join(', ')}.` : ''].filter(Boolean).join(' ');
      setNote({ ok: Boolean(j.ok), text: said || 'Nothing was kept.' });
      if (j.done?.length) {
        setFiles([]);
        setText('');
        setRead(null);
      }
    } catch {
      setNote({ ok: false, text: 'That did not go through.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHead
          title="From the site"
          hint="Photos from your phone become the job's record, a note to the homeowner, and a post. One press, and you decide which of the three."
        />

        {!jobs ? (
          <Skeleton rows={3} />
        ) : jobs.length === 0 ? (
          <Empty title="No jobs on the board yet" note="Add a job on The Board and photos from the site can land on it." />
        ) : (
          <div className="space-y-4">
            <div>
              <span className="mb-1.5 block"><Label>Which job</Label></span>
              <select className={cx(inputCls, 'text-[16px] py-3')} value={jobId} onChange={(e) => { setJobId(e.target.value); setRead(null); }}>
                <option value="">Pick the job</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.name}</option>
                ))}
              </select>
            </div>

            <input ref={camera} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { const l = Array.from(e.target.files ?? []); if (l.length) void upload(l); e.target.value = ''; }} />
            <input ref={library} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { const l = Array.from(e.target.files ?? []); if (l.length) void upload(l); e.target.value = ''; }} />

            <div className="grid grid-cols-2 gap-2">
              <Button kind="primary" full onClick={() => camera.current?.click()} disabled={busy !== null}>
                <Icon name="tray" size={16} /> {busy === 'upload' ? 'Uploading' : 'Take a photo'}
              </Button>
              <Button full onClick={() => library.current?.click()} disabled={busy !== null}>From the roll</Button>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <div key={f.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="aspect-square w-full rounded-lg border border-[var(--cc-line)] object-cover" />
                    <button
                      onClick={() => setFiles((prev) => prev.filter((_, n) => n !== i))}
                      className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--cc-line)] bg-white text-[var(--cc-muted)] shadow"
                      aria-label="Remove this photo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <span className="mb-1.5 block"><Label>Anything to add</Label></span>
              <textarea className={cx(inputCls, 'min-h-[90px] text-[16px] leading-relaxed')} value={text} onChange={(e) => setText(e.target.value)} placeholder="Trusses set before the wind came up. Roof line standing by noon." />
            </div>

            {note && <p className={cx('text-[13.5px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}

            {!read && (
              <Button kind="primary" full onClick={run} disabled={busy !== null || (!files.length && text.trim().length < 3)}>
                {busy === 'read' || readId ? 'Reading it' : 'Read it'}
              </Button>
            )}
          </div>
        )}
      </Card>

      {read && (
        <Card>
          <CardHead title="What it made" hint="Take the tick out of anything you do not want. Nothing has happened yet." />

          {read.saw.length > 0 && (
            <div className="mb-4 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cc-muted)]">What it saw</p>
              <ul className="mt-1.5 space-y-0.5 text-[13px] text-[var(--cc-ink)]">
                {read.saw.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {read.careful.length > 0 && (
            <div className="mb-4 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#B54708]">Look at this before it goes out</p>
              <ul className="mt-1.5 space-y-0.5 text-[13px] text-[#B54708]">
                {read.careful.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <label className="flex gap-3 rounded-lg border border-[var(--cc-line)] p-4">
              <input type="checkbox" className="mt-1 h-5 w-5 flex-none accent-[var(--cc-accent)]" checked={keep.log} onChange={(e) => setKeep({ ...keep, log: e.target.checked })} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[14.5px] font-semibold">On the job record <Badge>Private</Badge></span>
                <span className="mt-1 block whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--cc-muted)]">{read.log}</span>
              </span>
            </label>

            {read.clientNote ? (
              <label className="flex gap-3 rounded-lg border border-[var(--cc-line)] p-4">
                <input type="checkbox" className="mt-1 h-5 w-5 flex-none accent-[var(--cc-accent)]" checked={keep.note} onChange={(e) => setKeep({ ...keep, note: e.target.checked })} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14.5px] font-semibold">
                    A note to {job?.contact_name ?? 'the homeowner'} <Badge>Goes to your drafts</Badge>
                  </span>
                  <span className="mt-1 block text-[12.5px] text-[var(--cc-muted)]">{read.clientNote.subject}</span>
                  <span className="mt-1 block whitespace-pre-wrap text-[13.5px] leading-relaxed">{read.clientNote.body}</span>
                </span>
              </label>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--cc-line)] px-4 py-3 text-[13px] text-[var(--cc-muted)]">
                No note to the homeowner. {job ? 'There was not enough in the photos to say something worth their time.' : 'Pick a job and there will be one.'}
              </div>
            )}

            {read.post ? (
              <label className="flex gap-3 rounded-lg border border-[var(--cc-line)] p-4">
                <input type="checkbox" className="mt-1 h-5 w-5 flex-none accent-[var(--cc-accent)]" checked={keep.post} onChange={(e) => setKeep({ ...keep, post: e.target.checked })} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[14.5px] font-semibold">A post <Badge tone="live">Public</Badge></span>
                  <span className="mt-1 block whitespace-pre-wrap text-[13.5px] leading-relaxed">{read.post}</span>
                  <span className="mt-1.5 block text-[12.5px] text-[var(--cc-muted)]">
                    It goes on the calendar shaped for every feed, and you can change any line until the hour it posts. No homeowner name, no address: a post never carries either.
                  </span>
                </span>
              </label>
            ) : (
              <div className="rounded-lg border border-dashed border-[var(--cc-line)] px-4 py-3 text-[13px] text-[var(--cc-muted)]">
                Nothing here to post publicly. {read.careful.length ? 'See the note above.' : 'The photos did not carry a post on their own.'}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button kind="primary" onClick={send} disabled={busy !== null || (!keep.log && !keep.note && !keep.post)}>
              {busy === 'file' ? 'Filing' : 'Do it'}
            </Button>
            <Button kind="ghost" onClick={() => setRead(null)} disabled={busy !== null}>Start over</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
