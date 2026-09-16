'use client';

import { useCallback, useEffect, useState } from 'react';
import PhotoDrop, { type Uploaded } from '@/components/portal/PhotoDrop';

/**
 * TWO MORE COMMAND CENTER CARDS.
 *   ProjectPhotosCard: Carmen picks a project, drops photos, they wait for
 *   the site build and then show as live on the page.
 *   ReviewsCard: one ask, from the business, with the places to leave a
 *   review, Google first. Every ask is kept.
 */
const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block mb-1';
const BTN = 'px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const LINK = 'text-[10px] uppercase tracking-[0.2em] font-mono font-bold text-[#1E50C8] hover:text-[#161616]';
const INPUT = 'w-full rounded-lg border-2 border-[#161616]/25 bg-white px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] outline-none';

type Proj = { slug: string; title: string };
type Photo = { id: string; project_slug: string; url: string; caption: string | null; status: string; live_at: string | null; created_at: string };

export function ProjectPhotosCard() {
  const [data, setData] = useState<{ projects: Proj[]; photos: Photo[]; siteUrl: string } | null | undefined>(undefined);
  const [slug, setSlug] = useState('');
  const [caption, setCaption] = useState('');
  const [pending, setPending] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/project-photos');
      const j = (r.ok ? await r.json() : null) as { projectPhotos?: { projects: Proj[]; photos: Photo[]; siteUrl: string } | null } | null;
      setData(j?.projectPhotos ?? null);
      if (j?.projectPhotos?.projects?.length && !slug) setSlug(j.projectPhotos.projects[0].slug);
    } catch {
      setData(null);
    }
  }, [slug]);
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setBusy(true);
    setErr(null);
    setNote(null);
    try {
      const r = await fetch('/api/portal/project-photos', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ project: slug, photos: pending, caption }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; count?: number };
      if (!r.ok || !j.ok) {
        setErr(j.error ?? 'That did not go through.');
        return;
      }
      setNote(`${j.count} ${j.count === 1 ? 'photo' : 'photos'} sent for the page. Sarah has them; they show as live here once the page is rebuilt.`);
      setPending([]);
      setCaption('');
      await load();
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    await fetch(`/api/portal/project-photos?id=${id}`, { method: 'DELETE' });
    await load();
  };

  if (data === undefined || data === null) return null;
  const byProject = new Map<string, Photo[]>();
  for (const p of data.photos) byProject.set(p.project_slug, [...(byProject.get(p.project_slug) ?? []), p]);
  const title = (s: string) => data.projects.find((p) => p.slug === s)?.title ?? s;

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Project photos</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Put new photos on a project page</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">Pick the project, drop the photos, add a line if you want. They land on that page on the website at the next build, and show as live here when they do.</p>
      <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3 mb-4 space-y-2">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className={INPUT}>
          {data.projects.map((p) => (
            <option key={p.slug} value={p.slug}>{p.title}</option>
          ))}
        </select>
        <PhotoDrop folder="projects" compact label="Drop photos for this project, or tap to choose" hint="Phone photos are fine. They are sized for the page on the way up." onUploaded={(files) => setPending((p) => [...p, ...files])} />
        {pending.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              {pending.map((f) => (
                <img key={f.url} src={f.url} alt={f.name} className="h-16 w-16 object-cover rounded-md border-2 border-[#161616]/20" />
              ))}
            </div>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="A line about these, if you like" className={INPUT} maxLength={500} />
            <div className="flex items-center gap-3">
              <button type="button" disabled={busy} onClick={() => void save()} className={`${BTN} bg-[#F5B700]`}>{busy ? 'Sending' : `Send ${pending.length} to ${title(slug)}`}</button>
              <button type="button" disabled={busy} onClick={() => setPending([])} className={LINK}>Clear</button>
            </div>
          </>
        )}
        {err && <p className="font-body text-xs text-[#C4160B]">{err}</p>}
        {note && <p className="font-body text-xs text-emerald-800">{note}</p>}
      </div>
      {byProject.size > 0 && (
        <ul className="space-y-3">
          {[...byProject.entries()].map(([s, list]) => (
            <li key={s}>
              <p className="font-sans font-bold text-[#161616] text-sm mb-1">
                <a href={`${data.siteUrl}/projects/${s}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{title(s)}</a>
                <span className="font-normal text-[#161616]/60"> · {list.filter((p) => p.status === 'live').length} live, {list.filter((p) => p.status === 'new').length} waiting</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {list.slice(0, 24).map((p) => (
                  <div key={p.id} className="relative">
                    <img src={p.url} alt={p.caption ?? title(s)} className={`h-16 w-16 object-cover rounded-md border-2 ${p.status === 'live' ? 'border-[#161616]' : 'border-[#161616]/20 opacity-80'}`} />
                    {p.status === 'new' && (
                      <button type="button" onClick={() => void remove(p.id)} title="Take this one back" className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border-2 border-[#161616] text-[10px] font-bold leading-none">×</button>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Ask = { id: string; name: string; email: string | null; phone: string | null; project: string | null; sent_email: boolean; sent_sms: boolean; error: string | null; created_at: string };
type Reviews = { links: Array<{ key: string; label: string; url: string }>; asks: Ask[]; projects: Proj[] };

export function ReviewsCard() {
  const [data, setData] = useState<Reviews | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [project, setProject] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/portal/reviews');
      const j = (r.ok ? await r.json() : null) as { reviews?: Reviews | null } | null;
      setData(j?.reviews ?? null);
    } catch {
      setData(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const send = async () => {
    setBusy(true);
    setErr(null);
    setDone(null);
    try {
      const r = await fetch('/api/portal/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, phone, project, note }) });
      const j = (await r.json()) as { ok?: boolean; error?: string; sent_email?: boolean; sent_sms?: boolean };
      if (!r.ok || !j.ok) {
        setErr(j.error ?? 'That did not go through.');
        return;
      }
      setDone(`Sent to ${name.split(' ')[0]}${j.sent_email && j.sent_sms ? ' by email and text' : j.sent_sms ? ' by text' : ' by email'}.`);
      setName('');
      setEmail('');
      setPhone('');
      setNote('');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (data === undefined || data === null) return null;
  const google = data.links.find((l) => l.key === 'google');

  return (
    <section className={`${CARD} p-6 mb-8`}>
      <span className={EYEBROW}>Reviews</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">Ask for a review when a job closes</h3>
      <p className="text-[#161616]/65 font-body text-sm mb-4">
        One short note from the business with the places to leave a review, Google first. Type their name and where to send it. Every ask is kept below so nobody is asked twice.
        {google && (
          <>
            {' '}Your Google listing: <a href={google.url} target="_blank" rel="noopener noreferrer" className="text-[#C4380C] font-semibold">open it ↗</a>
          </>
        )}
      </p>
      <div className="rounded-xl border-2 border-[#161616]/15 bg-[#FBF6EA] px-4 py-3 mb-4">
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Their name" className={INPUT} maxLength={120} />
          <select value={project} onChange={(e) => setProject(e.target.value)} className={INPUT}>
            <option value="">Which build (optional)</option>
            {data.projects.map((p) => (
              <option key={p.slug} value={p.title}>{p.title}</option>
            ))}
          </select>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their email" type="email" className={INPUT} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Their mobile (text)" type="tel" className={INPUT} />
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="A personal line, if you want. Otherwise we thank them for building with you." className={`${INPUT} mt-2`} maxLength={600} />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" disabled={busy || !name.trim() || (!email.trim() && !phone.trim())} onClick={() => void send()} className={`${BTN} bg-[#F5B700]`}>{busy ? 'Sending' : 'Send the ask'}</button>
          {err && <span className="font-body text-xs text-[#C4160B]">{err}</span>}
          {done && <span className="font-body text-xs text-emerald-800">{done}</span>}
        </div>
      </div>
      {data.asks.length > 0 && (
        <ul className="divide-y divide-[#161616]/10">
          {data.asks.slice(0, 12).map((a) => (
            <li key={a.id} className="py-2 flex items-start gap-3">
              <span className="min-w-0 flex-1">
                <span className="block font-sans font-bold text-[#161616] text-sm">{a.name}{a.project ? <span className="font-normal text-[#161616]/60"> · {a.project}</span> : null}</span>
                <span className="block font-body text-xs text-[#161616]/60">{[a.sent_email ? 'email' : null, a.sent_sms ? 'text' : null].filter(Boolean).join(' and ') || 'not sent'}{a.error ? ` · ${a.error}` : ''}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] text-[#161616]/50 mt-1">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
