'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@/components/cc/Workspace';
import PhotoDrop from '@/components/portal/PhotoDrop';
import { Badge, Button, Card, CardHead, Empty, ErrorNote, Field, Label, Skeleton, cx, dayLabel, inputCls } from '@/components/cc/ui';
import { Icon } from '@/components/cc/icons';

/**
 * THE SITE, FROM THE INSIDE. Put new photographs on a project page, make a
 * code for a sign that counts its own scans, and add the articles that get
 * written elsewhere. Everything here changes the live website, so every
 * control says plainly what it will do before it does it.
 */

type PhotoPayload = { projectPhotos: { projects: Array<{ slug: string; title: string }>; photos: Array<{ id: string; project: string; url: string; caption: string | null; live: boolean; created_at: string }>; siteUrl: string } | null };
type Campaign = { id: string; code: string; label: string; medium: string; path: string; scans: number; leads: number; url: string; scansThisWeek: number };
type CampaignPayload = { campaigns: Campaign[] | null; pages?: Array<{ path: string; label: string; group: string }>; media?: string[]; base?: string };
type Article = { id: string; title: string; url: string; published_at: string | null; status?: string };

export default function Website({ session }: { session: Session }) {
  const [photos, setPhotos] = useState<PhotoPayload['projectPhotos']>(null);
  const [camp, setCamp] = useState<CampaignPayload | null>(null);
  const [articles, setArticles] = useState<Article[] | null>(null);
  const [error, setError] = useState(false);
  const [project, setProject] = useState('');
  const [caption, setCaption] = useState('');
  const [pending, setPending] = useState<Array<{ url: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [sign, setSign] = useState({ label: '', medium: 'sign', path: '/' });
  const [articleUrl, setArticleUrl] = useState('');

  const load = useCallback(async () => {
    setError(false);
    try {
      const [p, c, a] = await Promise.all([
        fetch('/api/portal/project-photos', { cache: 'no-store' }),
        fetch('/api/portal/campaigns', { cache: 'no-store' }),
        fetch('/api/portal/articles', { cache: 'no-store' }),
      ]);
      const pj = (await p.json()) as PhotoPayload;
      const cj = (await c.json()) as CampaignPayload;
      const aj = (await a.json()) as { articles: Article[] };
      setPhotos(pj.projectPhotos);
      setCamp(cj);
      setArticles(aj.articles ?? []);
      if (!project && pj.projectPhotos?.projects[0]) setProject(pj.projectPhotos.projects[0].slug);
    } catch {
      setError(true);
    }
  }, [project]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePhotos = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/project-photos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ project, photos: pending, caption }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setNote({ ok: false, text: j.error ?? 'Those did not save.' });
        return;
      }
      setPending([]);
      setCaption('');
      setNote({ ok: true, text: 'Saved. They go on the page at the next build, and show as live here when they do.' });
      void load();
    } finally {
      setBusy(false);
    }
  };

  const makeSign = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/campaigns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sign) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setNote({ ok: false, text: j.error ?? 'That did not save.' });
        return;
      }
      setSign({ label: '', medium: 'sign', path: '/' });
      setNote({ ok: true, text: 'Code made. Print it on the sign; every scan is counted here.' });
      void load();
    } finally {
      setBusy(false);
    }
  };

  const addArticle = async () => {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch('/api/portal/articles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: articleUrl }) });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        setNote({ ok: false, text: j.error ?? 'That link did not take.' });
        return;
      }
      setArticleUrl('');
      setNote({ ok: true, text: 'Added. We write the summary and put it on your blog with a link to the full piece.' });
      void load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {note && <p className={cx('text-[13px]', note.ok ? 'text-[#067647]' : 'text-[#B42318]')}>{note.text}</p>}
      {error && <ErrorNote onRetry={load}>Some of this screen did not load.</ErrorNote>}

      <div className="grid lg:grid-cols-5 gap-5">
        <Card className="lg:col-span-3">
          <CardHead
            title="Put photos on a project page"
            hint="Pick the project, drop the photographs, add a line if you want."
            right={<Button href={session.brand.siteUrl}><Icon name="out" size={15} /> Open the site</Button>}
          />
          {!photos ? (
            <Skeleton rows={4} />
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Project">
                  <select className={inputCls} value={project} onChange={(e) => setProject(e.target.value)}>
                    {photos.projects.map((p) => (
                      <option key={p.slug} value={p.slug}>{p.title}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Caption" hint="Optional, one line.">
                  <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Timber trusses going up" />
                </Field>
              </div>
              <div className="mt-3">
                <PhotoDrop client={session.email} folder="projects" onUploaded={async (files) => setPending((p) => [...p, ...files.map((f) => ({ url: f.url }))])} />
              </div>
              {pending.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--cc-line)] bg-[#FAFBFC] px-4 py-3">
                  <span className="text-[13.5px]">{pending.length} {pending.length === 1 ? 'photo' : 'photos'} ready</span>
                  <Button kind="primary" onClick={savePhotos} disabled={busy}>{busy ? 'Saving' : 'Put them on the page'}</Button>
                </div>
              )}
              {photos.photos.length > 0 && (
                <div className="mt-4">
                  <Label>Recently added</Label>
                  <ul className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {photos.photos.slice(0, 10).map((ph) => (
                      <li key={ph.id} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--cc-line)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ph.url} alt={ph.caption ?? 'Project photo'} className="h-full w-full object-cover" />
                        {ph.live && <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em]">Live</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHead title="Signs and ads" hint="One code per sign, truck or card. Each scan is counted, and a lead that follows carries the sign's name." />
          <div className="space-y-3">
            <Field label="What is it on"><input className={inputCls} value={sign.label} onChange={(e) => setSign({ ...sign, label: e.target.value })} placeholder="Bigfork yard sign" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kind">
                <select className={inputCls} value={sign.medium} onChange={(e) => setSign({ ...sign, medium: e.target.value })}>
                  {(camp?.media ?? ['sign', 'jobsite', 'truck', 'card', 'print', 'ad', 'mail', 'other']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Lands on">
                <select className={inputCls} value={sign.path} onChange={(e) => setSign({ ...sign, path: e.target.value })}>
                  {(camp?.pages ?? [{ path: '/', label: 'Home page', group: 'Pages' }]).map((p) => (
                    <option key={p.path} value={p.path}>{p.label}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Button kind="primary" onClick={makeSign} disabled={busy || sign.label.trim().length < 2} full>Make the code</Button>
          </div>

          <div className="mt-5">
            {!camp ? (
              <Skeleton rows={2} />
            ) : !camp.campaigns?.length ? (
              <Empty title="No codes yet" note="The first one takes ten seconds." />
            ) : (
              <ul className="divide-y divide-[var(--cc-line)]">
                {camp.campaigns.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold">{c.label}</p>
                      <p className="truncate text-[12px] text-[var(--cc-muted)]">{c.medium} · {c.path}</p>
                    </div>
                    <div className="flex flex-none items-center gap-2">
                      <span className="text-right">
                        <span className="block text-[15px] font-semibold tabular-nums">{c.scans}</span>
                        <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cc-muted)]">scans</span>
                      </span>
                      <Button href={c.url} title="Open the link this code points at"><Icon name="out" size={15} /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Your writing" hint="When a piece of yours is published anywhere, paste the link. We summarise it in your voice, put it on your blog with a link to the original, and it starts working in search." />
        <div className="flex flex-wrap gap-2">
          <input className={cx(inputCls, 'flex-1 min-w-[240px]')} value={articleUrl} onChange={(e) => setArticleUrl(e.target.value)} placeholder="https://" />
          <Button kind="primary" onClick={addArticle} disabled={busy || !/^https?:\/\//.test(articleUrl)}>Add it</Button>
        </div>
        {!articles ? (
          <div className="mt-4"><Skeleton rows={2} /></div>
        ) : articles.length === 0 ? (
          <div className="mt-4"><Empty title="Nothing added yet" /></div>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--cc-line)]">
            {articles.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold">{a.title}</p>
                  <p className="truncate text-[12.5px] text-[var(--cc-muted)]">{a.published_at ? dayLabel(a.published_at) : 'Added'}</p>
                </div>
                <div className="flex flex-none items-center gap-2">
                  {a.status && <Badge>{a.status}</Badge>}
                  <Button href={a.url}><Icon name="out" size={15} /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
