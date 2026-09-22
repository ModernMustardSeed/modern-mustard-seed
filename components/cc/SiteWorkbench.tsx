'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, CardHead, Empty, Field, Label, cx, dayLabel, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * PUT IT ON OUR WEBSITE.
 *
 * Three doors that did not exist: a new project page, a piece for their own
 * blog, and anything else at all. Each one starts with what they already have
 * (photographs, or a topic and a few notes), comes back as a draft in their
 * own voice, and goes into the queue only when they press the button.
 *
 * The queue at the bottom is the part that makes the rest believable. A client
 * who asks for something and then watches nothing happen stops asking. So every
 * request shows where it is in plain words, and what we said back.
 */

type Kind = 'project' | 'article' | 'change';

type Request = {
  id: string;
  kind: string;
  title: string | null;
  body: string;
  photos: string[];
  status: 'new' | 'read' | 'done';
  status_note: string | null;
  live_url: string | null;
  created_at: string;
};

type ProjectDraft = { title: string; story: string; highlights: string[]; saw: string[] };
type ArticleDraft = { title: string; summary: string; body: string };

const STATUS: Record<Request['status'], { word: string; tone: 'plain' | 'live' | 'good' }> = {
  new: { word: 'Asked for', tone: 'plain' },
  read: { word: 'We are on it', tone: 'live' },
  done: { word: 'Live on your site', tone: 'good' },
};

const KIND_WORD: Record<string, string> = { project: 'Project page', article: 'Blog piece', change: 'Change', photos: 'Photos', note: 'Note' };

export default function SiteWorkbench({ publicUrl }: { publicUrl: string }) {
  const [open, setOpen] = useState<Kind | null>(null);
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [busy, setBusy] = useState<'upload' | 'draft' | 'ask' | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // the new project
  const [files, setFiles] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [town, setTown] = useState('');
  const [kind, setKind] = useState('a new custom home');
  const [answers, setAnswers] = useState('');
  const [pDraft, setPDraft] = useState<ProjectDraft | null>(null);

  // the article
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [aDraft, setADraft] = useState<ArticleDraft | null>(null);

  // anything else
  const [change, setChange] = useState('');

  const picker = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/cc/site', { cache: 'no-store' });
      const j = (await r.json()) as { requests?: Request[] };
      setRequests((j.requests ?? []).map((x) => ({ ...x, photos: x.photos ?? [] })));
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setFiles([]);
    setTown('');
    setAnswers('');
    setPDraft(null);
    setTopic('');
    setNotes('');
    setADraft(null);
    setChange('');
    setJobId(null);
    setNote(null);
  };

  const upload = async (list: File[]) => {
    setBusy('upload');
    setNote(null);
    try {
      const done: Array<{ url: string; name: string; type: string }> = [];
      for (const file of list.slice(0, 12)) {
        const ask = await fetch('/api/cc/site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'upload', name: file.name, size: file.size, type: file.type }) });
        const j = (await ask.json()) as { ok?: boolean; uploadUrl?: string; url?: string; error?: string };
        if (!j.ok || !j.uploadUrl || !j.url) {
          setNote({ ok: false, text: j.error ?? 'That photo did not upload.' });
          continue;
        }
        const put = await fetch(j.uploadUrl, { method: 'PUT', body: file, headers: { 'content-type': file.type } });
        if (put.ok) done.push({ url: j.url, name: file.name, type: file.type });
      }
      setFiles((prev) => [...prev, ...done].slice(0, 12));
      setPDraft(null);
    } finally {
      setBusy(null);
    }
  };

  const draft = async (which: Kind) => {
    setBusy('draft');
    setNote(null);
    try {
      const payload =
        which === 'project'
          ? { action: 'draft-project', town, kind, answers, files }
          : { action: 'draft-article', topic, notes };
      const r = await fetch('/api/cc/site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const j = (await r.json()) as { ok?: boolean; draft?: ProjectDraft & ArticleDraft; queued?: boolean; jobId?: string; note?: string; error?: string };
      if (j.ok && j.draft) {
        if (which === 'project') setPDraft(j.draft as ProjectDraft);
        else setADraft(j.draft as ArticleDraft);
        setBusy(null);
        return;
      }
      if (j.queued) {
        setJobId(j.jobId ?? null);
        setNote({ ok: true, text: j.note ?? 'Still writing.' });
        return;
      }
      setNote({ ok: false, text: j.error ?? 'That did not come back.' });
      setBusy(null);
    } catch {
      setNote({ ok: false, text: 'That did not come back.' });
      setBusy(null);
    }
  };

  // A slow draft finishes on the queue; the screen collects it rather than
  // throwing away an answer already paid for.
  useEffect(() => {
    if (!jobId || !open) return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch('/api/cc/site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'collect', jobId }) });
        const j = (await r.json()) as { status?: string; draft?: ProjectDraft & ArticleDraft; error?: string };
        if (!alive) return;
        if (j.status === 'done' && j.draft) {
          if (open === 'project') setPDraft(j.draft as ProjectDraft);
          else setADraft(j.draft as ArticleDraft);
          setJobId(null);
          setBusy(null);
          setNote(null);
        }
        if (j.status === 'failed') {
          setJobId(null);
          setBusy(null);
          setNote({ ok: false, text: j.error ?? 'It could not be written.' });
        }
      } catch {
        /* rows wait */
      }
    }, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [jobId, open]);

  const ask = async (which: Kind) => {
    setBusy('ask');
    setNote(null);
    try {
      const payload =
        which === 'project'
          ? {
              action: 'ask',
              kind: 'project',
              title: pDraft?.title ?? `A new project page${town ? `, ${town}` : ''}`,
              body: [pDraft?.story ?? answers, pDraft?.highlights?.length ? `\nWorth pointing at:\n${pDraft.highlights.map((h) => `- ${h}`).join('\n')}` : ''].join('\n'),
              details: { town, kind },
              files,
            }
          : which === 'article'
            ? { action: 'ask', kind: 'article', title: aDraft?.title ?? topic, body: [aDraft?.summary ? `${aDraft.summary}\n` : '', aDraft?.body ?? notes].join('\n'), details: { topic } }
            : { action: 'ask', kind: 'change', title: '', body: change };

      const r = await fetch('/api/cc/site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const j = (await r.json()) as { ok?: boolean; requests?: Request[]; error?: string };
      if (!j.ok) {
        setNote({ ok: false, text: j.error ?? 'That did not go through.' });
        return;
      }
      setRequests(j.requests ?? requests);
      setNote({ ok: true, text: 'Sarah has it. You will see it move below, and she will tell you when it is live.' });
      reset();
      setOpen(null);
      void load();
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
          title="Put something on your website"
          hint="A house you just finished, a piece for your blog, or anything you want changed. You get a draft to correct before anybody sees it."
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <Button kind={open === 'project' ? 'primary' : 'quiet'} full onClick={() => { setOpen(open === 'project' ? null : 'project'); setNote(null); }}>
            <Icon name="website" size={15} /> Add a project
          </Button>
          <Button kind={open === 'article' ? 'primary' : 'quiet'} full onClick={() => { setOpen(open === 'article' ? null : 'article'); setNote(null); }}>
            <Icon name="note" size={15} /> Write for the blog
          </Button>
          <Button kind={open === 'change' ? 'primary' : 'quiet'} full onClick={() => { setOpen(open === 'change' ? null : 'change'); setNote(null); }}>
            <Icon name="hand" size={15} /> Change something
          </Button>
        </div>

        {open === 'project' && (
          <div className="mt-4 space-y-4 border-t border-[var(--cc-line)] pt-4">
            <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { const l = Array.from(e.target.files ?? []); if (l.length) void upload(l); e.target.value = ''; }} />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => picker.current?.click()} disabled={busy !== null}>{busy === 'upload' ? 'Uploading' : 'Add photographs'}</Button>
              <span className="text-[12.5px] text-[var(--cc-muted)]">{files.length ? `${files.length} added` : 'The best eight or ten of the finished house.'}</span>
            </div>
            {files.length > 0 && (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {files.map((f, i) => (
                  <div key={f.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="aspect-square w-full rounded-lg border border-[var(--cc-line)] object-cover" />
                    <button onClick={() => setFiles((p) => p.filter((_, n) => n !== i))} className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-[var(--cc-line)] bg-white text-[var(--cc-muted)] shadow" aria-label="Remove">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Town"><input className={inputCls} value={town} onChange={(e) => setTown(e.target.value)} placeholder="Bigfork" /></Field>
              <Field label="What is it">
                <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option>a new custom home</option>
                  <option>a remodel</option>
                  <option>an addition</option>
                  <option>a shop or outbuilding</option>
                </select>
              </Field>
            </div>
            <Field label="Tell us about it" hint="What made it interesting, what you are proud of, anything unusual. A few lines is plenty.">
              <textarea className={cx(inputCls, 'min-h-[110px] leading-relaxed')} value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="Timber frame on a steep lot above the lake. The great room glass was the whole point. Radiant floors throughout." />
            </Field>

            {note && <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}

            {!pDraft ? (
              <Button kind="primary" onClick={() => draft('project')} disabled={busy !== null || (!files.length && answers.trim().length < 10)}>
                {busy === 'draft' || jobId ? 'Writing the draft' : 'Write the draft'}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] p-4">
                {pDraft.saw.length > 0 && (
                  <p className="text-[12.5px] text-[var(--cc-muted)]">From the photographs: {pDraft.saw.join('; ')}</p>
                )}
                <Field label="Page title"><input className={inputCls} value={pDraft.title} onChange={(e) => setPDraft({ ...pDraft, title: e.target.value })} /></Field>
                <Field label="The story" hint="Change any word. What you send is what goes on the page.">
                  <textarea className={cx(inputCls, 'min-h-[160px] leading-relaxed')} value={pDraft.story} onChange={(e) => setPDraft({ ...pDraft, story: e.target.value })} />
                </Field>
                <Field label="Worth pointing at">
                  <textarea className={cx(inputCls, 'min-h-[90px] leading-relaxed')} value={pDraft.highlights.join('\n')} onChange={(e) => setPDraft({ ...pDraft, highlights: e.target.value.split('\n').filter(Boolean) })} />
                </Field>
                <p className="text-[12px] text-[var(--cc-muted)]">A project page never carries the homeowner&rsquo;s name or the address. The town is as close as it gets.</p>
                <div className="flex flex-wrap gap-2">
                  <Button kind="primary" onClick={() => ask('project')} disabled={busy !== null}>{busy === 'ask' ? 'Sending' : 'Send it to Sarah'}</Button>
                  <Button onClick={() => draft('project')} disabled={busy !== null}>Write it again</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {open === 'article' && (
          <div className="mt-4 space-y-4 border-t border-[var(--cc-line)] pt-4">
            <Field label="What do you want to write about" hint="A question people keep asking, a thing that went wrong, what a stage really costs in time.">
              <input className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What a build really costs in the Flathead, start to finish" />
            </Field>
            <Field label="Your notes" hint="Rough is fine. Bullet points, half sentences, whatever you have.">
              <textarea className={cx(inputCls, 'min-h-[120px] leading-relaxed')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="People think the number is the house. It is the lot, the septic, the well, the driveway, the power..." />
            </Field>

            {note && <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}

            {!aDraft ? (
              <Button kind="primary" onClick={() => draft('article')} disabled={busy !== null || topic.trim().length < 6}>
                {busy === 'draft' || jobId ? 'Writing the draft' : 'Write the draft'}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] p-4">
                <Field label="Headline"><input className={inputCls} value={aDraft.title} onChange={(e) => setADraft({ ...aDraft, title: e.target.value })} /></Field>
                <Field label="One line summary"><input className={inputCls} value={aDraft.summary} onChange={(e) => setADraft({ ...aDraft, summary: e.target.value })} /></Field>
                <Field label="The piece" hint="Your words now. Change anything.">
                  <textarea className={cx(inputCls, 'min-h-[260px] leading-relaxed')} value={aDraft.body} onChange={(e) => setADraft({ ...aDraft, body: e.target.value })} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button kind="primary" onClick={() => ask('article')} disabled={busy !== null}>{busy === 'ask' ? 'Sending' : 'Send it to Sarah'}</Button>
                  <Button onClick={() => draft('article')} disabled={busy !== null}>Write it again</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {open === 'change' && (
          <div className="mt-4 space-y-3 border-t border-[var(--cc-line)] pt-4">
            <Field label="What do you want changed" hint="Anything at all. A photo, a word, a page, a phone number, a service you now offer.">
              <textarea className={cx(inputCls, 'min-h-[110px] leading-relaxed')} value={change} onChange={(e) => setChange(e.target.value)} placeholder="Swap the photo at the top of the Whitefish page for the one I sent Tuesday, and add barndominiums to what we build." />
            </Field>
            {note && <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <Button kind="primary" onClick={() => ask('change')} disabled={busy !== null || change.trim().length < 6}>{busy === 'ask' ? 'Sending' : 'Send it to Sarah'}</Button>
              <span className="text-[12.5px] text-[var(--cc-muted)]">Changes to what we built are included. There is never a charge and never a form.</span>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHead title="What you have asked for" hint="Everything you have sent, and where it is." />
        {!requests ? (
          <div className="h-16 animate-pulse rounded-lg bg-[#F1F3F6]" />
        ) : requests.length === 0 ? (
          <Empty title="Nothing asked for yet" note="Whatever you send lands here so you can see it move." />
        ) : (
          <ul className="divide-y divide-[var(--cc-line)]">
            {requests.map((r) => (
              <li key={r.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 basis-[280px]">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
                      {r.title || KIND_WORD[r.kind] || 'Request'}
                      <Badge>{KIND_WORD[r.kind] ?? r.kind}</Badge>
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] text-[var(--cc-muted)]">{r.body}</p>
                    {r.status_note && <p className="mt-1 text-[13px] text-[var(--cc-ink)]">{r.status_note}</p>}
                    {r.photos.length > 0 && <p className="mt-1 text-[12px] text-[var(--cc-muted)]">{r.photos.length} photo{r.photos.length === 1 ? '' : 's'} with it</p>}
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <Badge tone={STATUS[r.status]?.tone ?? 'plain'}>{STATUS[r.status]?.word ?? r.status}</Badge>
                    <span className="text-[12px] text-[var(--cc-muted)]">{dayLabel(r.created_at)}</span>
                    {r.live_url && (
                      <a href={r.live_url} target="_blank" rel="noopener noreferrer" className="text-[12.5px] font-semibold text-[var(--cc-accent)] hover:underline">
                        See it live
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-[var(--cc-muted)]">
          Your site is built and deployed rather than edited in a box, which is why it loads the way it does. Everything here reaches Sarah the moment you send it, and she puts it live.{' '}
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--cc-accent)] hover:underline">
            Open your site
          </a>
        </p>
      </Card>
    </div>
  );
}
