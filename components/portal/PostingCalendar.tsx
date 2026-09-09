'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PhotoDrop, { type Uploaded } from '@/components/portal/PhotoDrop';
import { PLATFORM_LABEL, type AccountView, type MaterialRow, type Platform, type PostRow, type SettingsRow } from '@/lib/posting/types';
import { prettyDate, prettyHour } from '@/lib/posting/time';

/**
 * THE CLIENT'S POSTING CALENDAR.
 *
 * They say it, we shape it. The page is three things in the order a client
 * uses them: type a post (with a photo, or ask for a graphic), see the day it
 * takes and every platform version, connect the accounts. Every version can
 * be read, edited, or skipped up to the hour it posts; after that it shows
 * where it went, with the live links.
 */
type Data = { settings: SettingsRow | null; today: string; posts: PostRow[]; materials: MaterialRow[]; accounts: AccountView[]; emptyDays: number };

const STATUS: Record<PostRow['status'], { label: string; cls: string }> = {
  writing: { label: 'Being shaped', cls: 'bg-[#F5B700]/25 text-[#8f6600] border-[#8f6600]/30' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30' },
  held: { label: 'Waiting on the graphic', cls: 'bg-white text-[#161616] border-[#161616]/30' },
  publishing: { label: 'Posting now', cls: 'bg-[#F5B700]/25 text-[#161616] border-[#161616]/30' },
  published: { label: 'Posted', cls: 'bg-emerald-100 text-emerald-800 border-emerald-800/25' },
  partial: { label: 'Partly posted', cls: 'bg-emerald-50 text-emerald-800 border-emerald-800/25' },
  failed: { label: 'Did not post', cls: 'bg-red-50 text-[#C4160B] border-[#C4160B]/30' },
  skipped: { label: 'Skipped', cls: 'bg-white text-[#161616]/55 border-[#161616]/20' },
};

const CARD = 'bg-white border-2 border-[#161616] rounded-2xl shadow-[4px_4px_0_0_#161616]';
const EYEBROW = 'text-[10px] uppercase tracking-[0.3em] text-[#C4160B] font-mono font-bold block';
const BTN = 'px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-sans font-extrabold text-[#161616] bg-white border-2 border-[#161616] rounded-lg shadow-[3px_3px_0_0_#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const BTN_GOLD = BTN.replace('bg-white', 'bg-[#F5B700]');
const INPUT = 'w-full rounded-xl border-2 border-[#161616]/30 bg-[#FBF6EA] px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] outline-none';

type ActResult = { ok: boolean; planned: Array<{ date: string; action: string }> };

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
    const j = (await res.json().catch(() => ({}))) as { error?: string; planned?: Array<{ date: string; action: string }> };
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
          <p className="font-body text-[#161616]/70 text-sm">If you have signed up for it, tell Sarah and it will be switched on. <Link href="/portal" className="text-[#C4380C] font-semibold">Back to your portal</Link>.</p>
        </div>
      </Shell>
    );
  }

  const s = data.settings;
  const graphicsWaiting = data.materials.filter((m) => m.wants_graphic && !m.graphic_done_at && m.status !== 'archived');

  return (
    <Shell business={s.business_name}>
      {notice && <p className="mb-4 rounded-xl border-2 border-emerald-800/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <p className="mb-4 rounded-xl border-2 border-[#C4160B]/30 bg-red-50 px-4 py-3 text-sm font-semibold text-[#C4160B]">{error}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Composer hour={s.post_hour_mt} onSubmit={act} onDone={(msg) => setNotice(msg)} />

          <section>
            <div className="flex items-baseline justify-between mb-3">
              <span className={EYEBROW}>Coming up</span>
              {data.emptyDays > 0 && upcoming.length > 0 && <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#161616]/50">{data.emptyDays} open {data.emptyDays === 1 ? 'day' : 'days'} this week</span>}
            </div>
            <div className="space-y-4">
              {upcoming.length === 0 && <p className={`${CARD} p-5 font-body text-sm text-[#161616]/60`}>Nothing queued. Type a post above and it takes the next open day at {prettyHour(s.post_hour_mt)}.</p>}
              {upcoming.map((p) => (
                <PostCard key={p.id} post={p} platforms={s.platforms} today={data.today} graphicPending={graphicsWaiting.some((m) => m.id === p.material_id)} onAct={act} />
              ))}
            </div>
          </section>

          {past.length > 0 && (
            <section>
              <span className={`${EYEBROW} mb-3`}>Posted</span>
              <div className="space-y-4">
                {past.map((p) => (
                  <PostCard key={p.id} post={p} platforms={s.platforms} today={data.today} graphicPending={false} onAct={act} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className={`${CARD} p-6`}>
            <span className={`${EYEBROW} mb-1`}>How it works</span>
            <ol className="font-body text-sm text-[#161616]/75 space-y-2 mt-2 list-decimal pl-4">
              <li>You write what you want said, as you would say it. A photo or graphic with it if you have one.</li>
              <li>We shape it for each platform: paragraphs for Facebook, lines and hashtags for Instagram, a professional frame for LinkedIn, one thought for X, something a searcher can use for Google, a project note for Houzz. Your meaning and your voice stay yours.</li>
              <li>It goes out at {prettyHour(s.post_hour_mt)} on the day it took. Read every version before then, change any line, or skip the day.</li>
              <li>Need a graphic? Tick the box and say what you picture. We make it, and the day waits until it is on.</li>
            </ol>
          </section>

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
            <h3 className="font-display text-xl font-semibold text-[#161616] mb-3">Posting hour</h3>
            <select value={s.post_hour_mt} onChange={(e) => void act({ action: 'settings', post_hour_mt: Number(e.target.value) })} className="w-full rounded-xl border-2 border-[#161616] bg-white px-3 py-2 font-sans font-bold text-[#161616]">
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                <option key={h} value={h}>{prettyHour(h)} Mountain</option>
              ))}
            </select>
            <label className="flex items-center gap-2 mt-4 font-body text-sm text-[#161616]/80">
              <input type="checkbox" checked={s.weekly_summary} onChange={(e) => void act({ action: 'settings', weekly_summary: e.target.checked })} />
              A short note every Monday with last week's posts
            </label>
          </section>
        </aside>
      </div>
    </Shell>
  );
}

function Composer({ hour, onSubmit, onDone }: { hour: number; onSubmit: (b: Record<string, unknown>) => Promise<ActResult>; onDone: (msg: string) => void }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<Uploaded | null>(null);
  const [wantsGraphic, setWantsGraphic] = useState(false);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (text.trim().length < 3) return;
    setBusy(true);
    try {
      const r = await onSubmit({ action: 'post', text, url: image?.url ?? null, wants_graphic: wantsGraphic && !image, graphic_brief: brief });
      if (r.ok) {
        const day = r.planned[r.planned.length - 1];
        onDone(day ? (day.action === 'held' ? `In. It takes ${prettyDate(day.date)} once the graphic is made.` : `In. It goes out ${prettyDate(day.date)} at ${prettyHour(hour)}.`) : 'In. It takes the next open day.');
        setText('');
        setImage(null);
        setWantsGraphic(false);
        setBrief('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${CARD} p-6`}>
      <span className={`${EYEBROW} mb-1`}>Say it</span>
      <h2 className="font-display text-2xl font-semibold text-[#161616] mb-1">Your next post</h2>
      <p className="font-body text-sm text-[#161616]/65 mb-4">Write it the way you would say it. We shape it for each platform and it goes out at {prettyHour(hour)} on the next open day.</p>
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
      <div className="mt-4">
        <button type="button" onClick={() => void submit()} disabled={busy || text.trim().length < 3} className={BTN_GOLD}>{busy ? 'Sending' : 'Queue it'}</button>
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

function PostCard({ post, platforms, today, graphicPending, onAct }: { post: PostRow; platforms: Platform[]; today: string; graphicPending: boolean; onAct: (b: Record<string, unknown>) => Promise<ActResult> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [draft, setDraft] = useState('');
  const st = STATUS[post.status];
  const locked = ['published', 'publishing', 'partial'].includes(post.status);
  const isToday = post.scheduled_for === today;
  const main = post.captions.facebook ?? post.captions.instagram ?? '';

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
          {main ? <p className="font-body text-sm text-[#161616]/70 mt-1 line-clamp-2 whitespace-pre-line">{main}</p> : <p className="font-body text-sm italic text-[#161616]/50 mt-1">Being shaped for each platform. Your words are in.</p>}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {platforms.map((p) => {
              const r = post.results[p] as Res;
              const cls = r?.ok ? 'bg-emerald-100 text-emerald-800 border-emerald-800/25' : r?.pending ? 'bg-white text-[#161616]/60 border-[#161616]/25' : r ? 'bg-red-50 text-[#C4160B] border-[#C4160B]/30' : 'bg-white text-[#161616]/45 border-[#161616]/15';
              const label = r?.ok ? `${PLATFORM_LABEL[p]} ✓` : r?.pending ? `${PLATFORM_LABEL[p]} · by hand` : r ? `${PLATFORM_LABEL[p]} · failed` : PLATFORM_LABEL[p];
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
        <button type="button" onClick={() => setOpen((v) => !v)} className={BTN}>{open ? 'Close' : 'Read every version'}</button>
        {!locked && post.status !== 'skipped' && <button type="button" onClick={() => void onAct({ action: 'skip', id: post.id })} className={BTN}>Skip this day</button>}
        {post.status === 'skipped' && <button type="button" onClick={() => void onAct({ action: 'unskip', id: post.id })} className={BTN_GOLD}>Put it back</button>}
      </div>
      {open && (
        <div className="px-5 pb-5 space-y-4 bg-[#FBF6EA]/60">
          {platforms.map((p) => {
            const r = post.results[p] as Res;
            return (
              <div key={p}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4160B]">{PLATFORM_LABEL[p]}</span>
                  {!locked && editing !== p && (
                    <button type="button" onClick={() => { setEditing(p); setDraft(post.captions[p] ?? ''); }} className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#1E50C8] hover:text-[#161616]">Edit</button>
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
                ) : (
                  <p className="font-body text-sm text-[#161616]/80 whitespace-pre-line bg-white rounded-xl border-2 border-[#161616]/15 px-3 py-2">{post.captions[p] ?? <span className="italic opacity-60">Not shaped yet.</span>}</p>
                )}
                {r?.error && !r.ok && !r.pending && <p className="mt-1 text-xs font-semibold text-[#C4160B]">{r.error}</p>}
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
