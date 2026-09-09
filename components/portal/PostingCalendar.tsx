'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PhotoDrop, { type Uploaded } from '@/components/portal/PhotoDrop';
import PlatformPreview from '@/components/posting/PlatformPreview';
import { PLATFORM_LABEL, hourFor, type AccountView, type MaterialRow, type Platform, type PlatformStats, type PostRow, type SettingsRow } from '@/lib/posting/types';
import type { GuideSection } from '@/lib/posting/guide';
import { prettyDate, prettyHour } from '@/lib/posting/time';

/**
 * THE CLIENT'S POSTING CALENDAR.
 *
 * They say it, we shape it. The page is three things in the order a client
 * uses them: type a post (with a photo or a graphic request, the platforms it
 * goes to, a link), see the day it takes with every platform version shown
 * the way that feed will show it, connect the accounts. Every version can be
 * read, edited, approved, or skipped up to the hour it posts; after that it
 * shows where it went, the live links, and the numbers it earned.
 */
type Data = { settings: SettingsRow | null; today: string; posts: PostRow[]; materials: MaterialRow[]; accounts: AccountView[]; emptyDays: number; guide: GuideSection[] };

const STATUS: Record<PostRow['status'], { label: string; cls: string }> = {
  writing: { label: 'Being shaped', cls: 'bg-[#F5B700]/25 text-[#8f6600] border-[#8f6600]/30' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30' },
  held: { label: 'Waiting', cls: 'bg-white text-[#161616] border-[#161616]/30' },
  publishing: { label: 'Posting now', cls: 'bg-[#F5B700]/25 text-[#161616] border-[#161616]/30' },
  published: { label: 'Posted', cls: 'bg-emerald-100 text-emerald-800 border-emerald-800/25' },
  partial: { label: 'Going out', cls: 'bg-emerald-50 text-emerald-800 border-emerald-800/25' },
  failed: { label: 'Did not post', cls: 'bg-red-50 text-[#C4160B] border-[#C4160B]/30' },
  skipped: { label: 'Skipped', cls: 'bg-white text-[#161616]/55 border-[#161616]/20' },
};

const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block';
const BTN = 'px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const BTN_GOLD = BTN.replace('bg-white', 'bg-[#F5B700]');
const CHIP = 'px-2.5 py-1 text-[10px] uppercase tracking-[0.15em] font-mono font-bold rounded-full border-2';
const INPUT = 'w-full rounded-xl border-2 border-[#161616]/30 bg-[#FBF6EA] px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] outline-none';

type ActResult = { ok: boolean; planned: Array<{ date: string; action: string; reason?: string }> };

export default function PostingCalendar() {
  const params = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauth, setUnauth] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/posting');
      if (res.status === 401) {
        setUnauth(true);
        return;
      }
      setData((await res.json()) as Data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const c = params.get('connect');
    if (!c) return;
    if (c.startsWith('x-ok:')) setNotice(`X is connected as ${c.slice(5)}.`);
    else if (c.startsWith('linkedin-ok:')) setNotice(`LinkedIn is connected: ${c.slice(12)}.`);
    else if (c.endsWith('unconfigured')) setError('That connection is not switched on yet. Sarah will connect it for you.');
    else if (c.includes('denied')) setError('The connection was cancelled.');
    else if (c.includes('failed')) setError(`The connection did not go through${c.includes(':') ? `: ${c.split(':').slice(1).join(':')}` : ''}.`);
  }, [params]);

  const act = async (body: Record<string, unknown>): Promise<ActResult> => {
    setError(null);
    const res = await fetch('/api/portal/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await res.json().catch(() => ({}))) as { error?: string; planned?: ActResult['planned'] };
    if (!res.ok) setError(j.error ?? 'That did not go through.');
    await load();
    return { ok: res.ok, planned: j.planned ?? [] };
  };

  const { upcoming, past } = useMemo(() => {
    const posts = data?.posts ?? [];
    const today = data?.today ?? '';
    return {
      upcoming: posts.filter((p) => p.scheduled_for >= today).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for)),
      past: posts.filter((p) => p.scheduled_for < today),
    };
  }, [data]);

  if (unauth) {
    return (
      <Shell>
        <p className="text-center py-16 font-body text-[#161616]/60">
          Your session ended. <Link href="/portal/login?next=/portal/posting" className="text-[#C4380C] font-semibold">Sign back in</Link>.
        </p>
      </Shell>
    );
  }
  if (loading) return <Shell><p className="text-center text-[#161616]/50 py-20 font-body italic">Opening your calendar...</p></Shell>;
  if (!data?.settings) {
    return (
      <Shell>
        <div className={`${CARD} p-6 max-w-xl mx-auto`}>
          <h2 className="font-display text-2xl font-semibold text-[#161616] mb-2">Daily Posting is not on this account</h2>
          <p className="font-body text-[#161616]/70 text-sm">If you have signed up for it, it is being set up and will appear here. <Link href="/portal" className="text-[#C4380C] font-semibold">Back to your portal</Link>.</p>
        </div>
      </Shell>
    );
  }

  const s = data.settings;
  const graphicsWaiting = data.materials.filter((m) => m.wants_graphic && !m.graphic_done_at && m.status !== 'archived');
  const waitingApproval = upcoming.filter((p) => p.status === 'held' && !p.approved_at && s.approve_first).length;

  return (
    <Shell business={s.business_name}>
      {notice && <p className="mb-4 rounded-xl border-2 border-emerald-800/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <p className="mb-4 rounded-xl border-2 border-[#C4160B]/30 bg-red-50 px-4 py-3 text-sm font-semibold text-[#C4160B]">{error}</p>}
      {waitingApproval > 0 && <p className="mb-4 rounded-xl border-2 border-[#161616] bg-[#F5B700]/30 px-4 py-3 text-sm font-semibold text-[#161616]">{waitingApproval} {waitingApproval === 1 ? 'day is' : 'days are'} waiting on your approval below.</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Composer s={s} onSubmit={act} onDone={(msg) => setNotice(msg)} />

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <span className={EYEBROW}>Coming up</span>
              {data.emptyDays > 0 && upcoming.length > 0 && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#161616]/50">{data.emptyDays} open {data.emptyDays === 1 ? 'day' : 'days'} this week</span>}
            </div>
            <div className="space-y-4">
              {upcoming.length === 0 && <p className={`${CARD} p-5 font-body text-sm text-[#161616]/60`}>Nothing queued. Type a post above and it takes the next open day.</p>}
              {upcoming.map((p) => (
                <PostCard key={p.id} post={p} s={s} today={data.today} graphicPending={graphicsWaiting.some((m) => m.id === p.material_id)} onAct={act} />
              ))}
            </div>
          </section>

          {past.length > 0 && (
            <section>
              <span className={`${EYEBROW} mb-3`}>Posted</span>
              <div className="space-y-4">
                {past.map((p) => (
                  <PostCard key={p.id} post={p} s={s} today={data.today} graphicPending={false} onAct={act} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <GuideCard sections={data.guide} />

          <section className={`${CARD} p-6`}>
            <span className={`${EYEBROW} mb-1`}>Where it goes</span>
            <h3 className="font-display text-xl font-semibold text-[#161616] mb-3">Your accounts</h3>
            <ul className="space-y-3">
              {s.platforms.map((p) => {
                const a = data.accounts.find((x) => x.provider === p);
                return <AccountRow key={p} platform={p} account={a} onDisconnect={() => void act({ action: 'disconnect', platform: p })} />;
              })}
            </ul>
            <p className="font-body text-xs text-[#161616]/50 mt-4">We never get a password. Facebook and Instagram come through the admin access you gave us; Houzz is posted by hand every day.</p>
          </section>

          <section className={`${CARD} p-6`}>
            <span className={`${EYEBROW} mb-1`}>When</span>
            <h3 className="font-display text-xl font-semibold text-[#161616] mb-1">The hour for each feed</h3>
            <p className="font-body text-xs text-[#161616]/55 mb-3">Set to the hour each platform tends to reward. Change any of them.</p>
            <ul className="space-y-2">
              {s.platforms.map((p) => (
                <li key={p} className="flex items-center justify-between gap-3">
                  <span className="font-sans text-sm font-bold text-[#161616]">{PLATFORM_LABEL[p]}</span>
                  <select value={hourFor(s, p)} onChange={(e) => void act({ action: 'settings', platform_hours: { [p]: Number(e.target.value) } })} className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1 font-sans text-sm font-bold text-[#161616]">
                    {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map((h) => (
                      <option key={h} value={h}>{prettyHour(h)}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
            <label className="flex items-center gap-2 mt-4 font-body text-sm text-[#161616]/80">
              <input type="checkbox" checked={s.approve_first} onChange={(e) => void act({ action: 'settings', approve_first: e.target.checked })} />
              I want to approve each post before it goes
            </label>
            <label className="flex items-center gap-2 mt-2 font-body text-sm text-[#161616]/80">
              <input type="checkbox" checked={s.weekly_summary} onChange={(e) => void act({ action: 'settings', weekly_summary: e.target.checked })} />
              A short note every Monday with last week's posts
            </label>
          </section>
        </aside>
      </div>
    </Shell>
  );
}

function GuideCard({ sections }: { sections: GuideSection[] }) {
  const [open, setOpen] = useState<number>(0);
  return (
    <section className={`${CARD} p-6`}>
      <span className={`${EYEBROW} mb-1`}>How it works</span>
      <h3 className="font-display text-xl font-semibold text-[#161616] mb-3">You say it. We shape it.</h3>
      <ul className="divide-y divide-[#161616]/10">
        {sections.map((sec, i) => (
          <li key={sec.title}>
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="w-full text-left py-2.5 flex items-center justify-between gap-2 font-sans text-sm font-bold text-[#161616]">
              {sec.title}
              <span className="font-mono text-[#161616]/40">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && (
              <ul className="pb-3 space-y-1.5">
                {sec.lines.map((l, j) => (
                  <li key={j} className="font-body text-sm text-[#161616]/75 leading-snug pl-3 border-l-2 border-[#F5B700]">{l}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Composer({ s, onSubmit, onDone }: { s: SettingsRow; onSubmit: (b: Record<string, unknown>) => Promise<ActResult>; onDone: (msg: string) => void }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<Uploaded | null>(null);
  const [wantsGraphic, setWantsGraphic] = useState(false);
  const [brief, setBrief] = useState('');
  const [link, setLink] = useState('');
  const [more, setMore] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>(s.platforms);
  const [busy, setBusy] = useState(false);
  const allOn = platforms.length === s.platforms.length;

  const submit = async () => {
    if (text.trim().length < 3) return;
    setBusy(true);
    try {
      const r = await onSubmit({ action: 'post', text, url: image?.url ?? null, wants_graphic: wantsGraphic && !image, graphic_brief: brief, link: link || undefined, platforms: allOn ? undefined : platforms });
      if (r.ok) {
        const day = r.planned[r.planned.length - 1];
        onDone(
          !day ? 'In. It takes the next open day.'
            : day.reason === 'graphic' ? `In. It takes ${prettyDate(day.date)} once the graphic is made.`
            : day.reason === 'approval' ? `In. It takes ${prettyDate(day.date)} and waits for your approval below.`
            : `In. It goes out ${prettyDate(day.date)}, each platform at its hour.`,
        );
        setText('');
        setImage(null);
        setWantsGraphic(false);
        setBrief('');
        setLink('');
        setPlatforms(s.platforms);
        setMore(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${CARD} p-6`}>
      <span className={`${EYEBROW} mb-1`}>Say it</span>
      <h2 className="font-display text-2xl font-semibold text-[#161616] mb-1">Your next post</h2>
      <p className="font-body text-sm text-[#161616]/65 mb-4">Write it the way you would say it to a neighbor. We shape it for each platform and it goes out on the next open day, each feed at its hour.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="What do you want to say?" className={`${INPUT} mb-3`} />
      {image ? (
        <div className="flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-20 w-20 object-cover rounded-lg border-2 border-[#161616]" />
          <button type="button" onClick={() => setImage(null)} className={BTN}>Remove</button>
        </div>
      ) : (
        <PhotoDrop compact label="Add a photo or graphic (optional)" onUploaded={async (files) => setImage(files[0] ?? null)} />
      )}
      {!image && (
        <div className="mt-3">
          <label className="flex items-center gap-2 font-body text-sm text-[#161616]/80">
            <input type="checkbox" checked={wantsGraphic} onChange={(e) => setWantsGraphic(e.target.checked)} />
            Make me a graphic for this
          </label>
          {wantsGraphic && <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="What do you picture? Colors, words on it, a photo of yours to build on, the feel." className={`${INPUT} mt-2`} />}
        </div>
      )}
      <button type="button" onClick={() => setMore((v) => !v)} className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#1E50C8] hover:text-[#161616]">{more ? 'Fewer options' : 'Where it goes, and a link'}</button>
      {more && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {s.platforms.map((p) => {
              const on = platforms.includes(p);
              return (
                <button key={p} type="button" onClick={() => setPlatforms((v) => (on ? v.filter((x) => x !== p) : [...v, p]))} className={`${CHIP} ${on ? 'bg-[#F5B700] border-[#161616] text-[#161616]' : 'bg-white border-[#161616]/25 text-[#161616]/50'}`}>{PLATFORM_LABEL[p]}</button>
              );
            })}
          </div>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="A page to point to (optional). Goes on Facebook, LinkedIn and Google." className={INPUT} />
        </div>
      )}
      <div className="mt-4">
        <button type="button" onClick={() => void submit()} disabled={busy || text.trim().length < 3 || platforms.length === 0} className={BTN_GOLD}>{busy ? 'Sending' : 'Queue it'}</button>
      </div>
    </section>
  );
}

function Shell({ children, business }: { children: React.ReactNode; business?: string }) {
  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <header className="border-b-2 border-[#161616] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold">{business ?? 'Your portal'}</span>
            <h1 className="font-sans text-xl font-bold text-[#161616] tracking-tight mt-1">Daily Posting</h1>
          </div>
          <Link href="/portal" className="text-[11px] uppercase tracking-[0.2em] font-sans font-semibold text-[#1E50C8] hover:text-[#161616] px-4 py-2">Your portal</Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function AccountRow({ platform, account, onDisconnect }: { platform: Platform; account?: AccountView; onDisconnect: () => void }) {
  const connected = account?.connected;
  const connectHref = platform === 'x' ? '/api/oauth/x/start' : platform === 'linkedin' ? '/api/oauth/linkedin/start' : platform === 'gbp' ? '/api/oauth/google/start' : null;
  const canSelf = connectHref && !account?.needs;
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-sans font-bold text-sm text-[#161616]">{PLATFORM_LABEL[platform]}</p>
        <p className="font-body text-xs text-[#161616]/60">
          {connected ? `Connected: ${account?.accountName ?? 'yes'}` : platform === 'houzz' ? 'Posted by hand each day' : account?.status === 'revoked' ? 'Connection dropped. Reconnect.' : platform === 'facebook' || platform === 'instagram' ? 'Sarah connects this once you have added her as admin' : 'Not connected yet'}
        </p>
      </div>
      {connected ? (
        <button type="button" onClick={onDisconnect} className="shrink-0 text-[10px] uppercase tracking-[0.15em] font-mono font-bold text-[#161616]/50 hover:text-[#C4160B]">Disconnect</button>
      ) : canSelf ? (
        <a href={connectHref} className={`${BTN_GOLD} shrink-0`}>Connect</a>
      ) : null}
    </li>
  );
}

type Res = { ok?: boolean; pending?: boolean; manual?: boolean; url?: string; error?: string } | undefined;

function StatChips({ st }: { st: PlatformStats | undefined }) {
  if (!st) return null;
  const bits = [st.reach != null ? `${st.reach} reached` : null, st.likes != null ? `${st.likes} likes` : null, st.comments ? `${st.comments} comments` : null, st.shares ? `${st.shares} shares` : null, st.saves ? `${st.saves} saves` : null].filter(Boolean);
  if (!bits.length) return null;
  return <p className="mt-1 font-mono text-[10px] text-[#161616]/55">{bits.join(' · ')}</p>;
}

function PostCard({ post, s, today, graphicPending, onAct }: { post: PostRow; s: SettingsRow; today: string; graphicPending: boolean; onAct: (b: Record<string, unknown>) => Promise<ActResult> }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'preview' | 'text'>('preview');
  const [editing, setEditing] = useState<Platform | null>(null);
  const [draft, setDraft] = useState('');
  const st = STATUS[post.status];
  const locked = ['published', 'publishing'].includes(post.status);
  const isToday = post.scheduled_for === today;
  const platforms = (post.platforms?.length ? post.platforms : s.platforms).filter((p) => s.platforms.includes(p));
  const main = post.captions.facebook ?? post.captions.instagram ?? '';
  const needsApproval = post.status === 'held' && !post.approved_at && s.approve_first;
  const holdNote = post.status === 'held' ? (graphicPending ? 'Your graphic is being made.' : needsApproval ? 'Waiting on your approval.' : ((post.results as { note?: string }).note ?? 'Held.')) : null;

  const save = async () => {
    if (!editing) return;
    const r = await onAct({ action: 'caption', id: post.id, platform: editing, text: draft });
    if (r.ok) setEditing(null);
  };

  return (
    <article className={`${CARD} overflow-hidden`}>
      <div className="flex gap-4 p-5">
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="h-24 w-24 sm:h-28 sm:w-28 object-cover rounded-xl border-2 border-[#161616] shrink-0" />
        ) : (
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl border-2 border-dashed border-[#161616]/30 shrink-0 flex items-center justify-center text-center px-2 font-mono text-[10px] text-[#161616]/40">{graphicPending ? 'graphic being made' : 'words only'}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#161616]/70">{isToday ? 'Today' : prettyDate(post.scheduled_for)}</span>
            <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
          </div>
          <h3 className="font-sans font-bold text-[#161616] leading-tight">{post.headline ?? 'Post'}</h3>
          {holdNote ? <p className="font-body text-sm text-[#161616]/70 mt-1">{holdNote}</p> : main ? <p className="font-body text-sm text-[#161616]/70 mt-1 line-clamp-2 whitespace-pre-line">{main}</p> : <p className="font-body text-sm italic text-[#161616]/50 mt-1">Being shaped for each platform. Your words are in.</p>}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {platforms.map((p) => {
              const r = post.results[p] as Res;
              const cls = r?.ok ? 'bg-emerald-100 text-emerald-800 border-emerald-800/25' : r?.pending ? 'bg-white text-[#161616]/60 border-[#161616]/25' : r ? 'bg-red-50 text-[#C4160B] border-[#C4160B]/30' : 'bg-white text-[#161616]/45 border-[#161616]/15';
              const label = r?.ok ? `${PLATFORM_LABEL[p]} ✓` : r?.pending ? `${PLATFORM_LABEL[p]} · by hand` : r ? `${PLATFORM_LABEL[p]} · failed` : `${PLATFORM_LABEL[p]} · ${prettyHour(hourFor(s, p))}`;
              return r?.url ? (
                <a key={p} href={r.url} target="_blank" rel="noopener noreferrer" className={`text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-1 rounded-full border ${cls}`}>{label} ↗</a>
              ) : (
                <span key={p} className={`text-[9px] uppercase tracking-[0.12em] font-mono font-bold px-2 py-1 rounded-full border ${cls}`}>{label}</span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="border-t-2 border-[#161616]/10 px-5 py-3 flex flex-wrap items-center gap-2 bg-[#FBF6EA]/60">
        {needsApproval && !graphicPending && <button type="button" onClick={() => void onAct({ action: 'approve', id: post.id })} className={BTN_GOLD}>Approve</button>}
        <button type="button" onClick={() => setOpen((v) => !v)} className={BTN}>{open ? 'Close' : 'See every version'}</button>
        {!locked && post.status !== 'skipped' && <button type="button" onClick={() => void onAct({ action: 'skip', id: post.id })} className={BTN}>Skip this day</button>}
        {post.status === 'skipped' && <button type="button" onClick={() => void onAct({ action: 'unskip', id: post.id })} className={BTN_GOLD}>Put it back</button>}
        {['published', 'partial'].includes(post.status) && post.scheduled_for < today && <button type="button" onClick={() => void onAct({ action: 'repost', id: post.id })} className={BTN}>Say it again</button>}
      </div>
      {open && (
        <div className="px-5 pb-5 bg-[#FBF6EA]/60">
          <div className="flex gap-2 py-3">
            <button type="button" onClick={() => setView('preview')} className={`${CHIP} ${view === 'preview' ? 'bg-[#161616] text-white border-[#161616]' : 'bg-white border-[#161616]/25 text-[#161616]/60'}`}>As it will look</button>
            <button type="button" onClick={() => setView('text')} className={`${CHIP} ${view === 'text' ? 'bg-[#161616] text-white border-[#161616]' : 'bg-white border-[#161616]/25 text-[#161616]/60'}`}>The words</button>
          </div>
          <div className={view === 'preview' ? 'grid sm:grid-cols-2 gap-4' : 'space-y-4'}>
            {platforms.map((p) => {
              const r = post.results[p] as Res;
              const text = post.captions[p] ?? '';
              return (
                <div key={p}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">{PLATFORM_LABEL[p]} <span className="text-[#161616]/40">· {prettyHour(hourFor(s, p))}</span></span>
                    {!locked && editing !== p && (
                      <button type="button" onClick={() => { setEditing(p); setDraft(text); setView('text'); }} className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#1E50C8] hover:text-[#161616]">Edit</button>
                    )}
                  </div>
                  {editing === p ? (
                    <div>
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} className="w-full rounded-xl border-2 border-[#161616] bg-white px-3 py-2 font-body text-sm text-[#161616]" />
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={() => void save()} className={BTN_GOLD}>Save</button>
                        <button type="button" onClick={() => setEditing(null)} className={BTN}>Cancel</button>
                      </div>
                    </div>
                  ) : view === 'preview' && text ? (
                    <PlatformPreview platform={p} business={s.business_name} text={text} imageUrl={post.image_url} link={post.link} />
                  ) : (
                    <p className="font-body text-sm text-[#161616]/80 whitespace-pre-line bg-white rounded-xl border-2 border-[#161616]/15 px-3 py-2">{text || <span className="italic opacity-60">Not shaped yet.</span>}</p>
                  )}
                  {post.notes?.[p] && <p className="mt-1 font-body text-xs text-[#161616]/55 italic">{post.notes[p]}</p>}
                  <StatChips st={post.stats?.[p]} />
                  {r?.error && !r.ok && !r.pending && <p className="mt-1 text-xs font-semibold text-[#C4160B]">{r.error}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
