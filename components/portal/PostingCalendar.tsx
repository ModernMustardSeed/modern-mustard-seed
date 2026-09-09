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
 * Three things on one page, in the order a client uses them: drop photos,
 * see what goes out and when, connect the accounts. Every post can be read,
 * edited, or skipped up to the hour it posts; after that it shows where it
 * went, with the live links.
 */
type Data = { settings: SettingsRow | null; today: string; posts: PostRow[]; materials: MaterialRow[]; accounts: AccountView[] };

const STATUS: Record<PostRow['status'], { label: string; cls: string }> = {
  writing: { label: 'Being written', cls: 'bg-[#F5B700]/25 text-[#8f6600] border-[#8f6600]/30' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-[#1E50C8] border-[#1E50C8]/30' },
  held: { label: 'Held', cls: 'bg-white text-[#161616] border-[#161616]/30' },
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
      const j = (await res.json()) as Data;
      setData(j);
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

  const act = async (body: Record<string, unknown>) => {
    setError(null);
    const res = await fetch('/api/portal/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setError(j.error ?? 'That did not go through.');
    await load();
    return res.ok;
  };

  const onUploaded = async (files: Uploaded[]) => {
    for (const f of files) await act({ action: 'material', url: f.url, note: pendingNote.trim() || undefined });
    setPendingNote('');
    setNotice(files.length === 1 ? 'Photo in. It takes the next open day.' : `${files.length} photos in. Each takes its own day.`);
  };
  const [pendingNote, setPendingNote] = useState('');

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
  const fresh = data.materials.filter((m) => m.status === 'fresh');

  return (
    <Shell business={s.business_name}>
      {notice && <p className="mb-4 rounded-xl border-2 border-emerald-800/30 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      {error && <p className="mb-4 rounded-xl border-2 border-[#C4160B]/30 bg-red-50 px-4 py-3 text-sm font-semibold text-[#C4160B]">{error}</p>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Drop */}
          <section className={`${CARD} p-6`}>
            <span className={`${EYEBROW} mb-1`}>Drop it here</span>
            <h2 className="font-display text-2xl font-semibold text-[#161616] mb-1">Photos from the job</h2>
            <p className="font-body text-sm text-[#161616]/65 mb-4">A photo and a line is all it takes. Each one becomes a day's post on every platform, in your voice, at {prettyHour(s.post_hour_mt)}. No photo, and the feed still posts every day from what we know about the business.</p>
            <textarea
              value={pendingNote}
              onChange={(e) => setPendingNote(e.target.value)}
              placeholder="A line about it: what, where, anything worth saying. Applies to the photos you drop next."
              rows={2}
              className="w-full mb-3 rounded-xl border-2 border-[#161616]/30 bg-[#FBF6EA] px-3 py-2 font-body text-sm text-[#161616] focus:border-[#161616] outline-none"
            />
            <PhotoDrop onUploaded={onUploaded} />
            {fresh.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#161616]/55 mb-2">Waiting for a day ({fresh.length})</p>
                <div className="flex flex-wrap gap-2">
                  {fresh.map((m) => (
                    <div key={m.id} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="" className="h-20 w-20 object-cover rounded-lg border-2 border-[#161616]" />
                      <button type="button" onClick={() => void act({ action: 'material-archive', id: m.id })} title="Remove" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border-2 border-[#161616] text-[11px] font-bold leading-none opacity-0 group-hover:opacity-100">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 2. Calendar */}
          <section>
            <span className={`${EYEBROW} mb-3`}>Coming up</span>
            <div className="space-y-4">
              {upcoming.length === 0 && <p className={`${CARD} p-5 font-body text-sm text-[#161616]/60`}>Tomorrow's post is written every evening. Check back after 8 PM.</p>}
              {upcoming.map((p) => (
                <PostCard key={p.id} post={p} platforms={s.platforms} today={data.today} onAct={act} />
              ))}
            </div>
          </section>

          {past.length > 0 && (
            <section>
              <span className={`${EYEBROW} mb-3`}>Posted</span>
              <div className="space-y-4">
                {past.map((p) => (
                  <PostCard key={p.id} post={p} platforms={s.platforms} today={data.today} onAct={act} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          {/* 3. Connections */}
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
            <select
              value={s.post_hour_mt}
              onChange={(e) => void act({ action: 'settings', post_hour_mt: Number(e.target.value) })}
              className="w-full rounded-xl border-2 border-[#161616] bg-white px-3 py-2 font-sans font-bold text-[#161616]"
            >
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
        <p className="font-body text-xs text-[#161616]/60 truncate">
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

function PostCard({ post, platforms, today, onAct }: { post: PostRow; platforms: Platform[]; today: string; onAct: (b: Record<string, unknown>) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Platform | null>(null);
  const [draft, setDraft] = useState('');
  const st = STATUS[post.status];
  const locked = ['published', 'publishing', 'partial'].includes(post.status);
  const isToday = post.scheduled_for === today;
  const main = post.captions.facebook ?? post.captions.instagram ?? '';

  const save = async () => {
    if (!editing) return;
    const ok = await onAct({ action: 'caption', id: post.id, platform: editing, text: draft });
    if (ok) setEditing(null);
  };

  return (
    <article className={`${CARD} overflow-hidden`}>
      <div className="flex gap-4 p-5">
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="h-24 w-24 sm:h-28 sm:w-28 object-cover rounded-xl border-2 border-[#161616] shrink-0" />
        ) : (
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl border-2 border-dashed border-[#161616]/30 shrink-0 flex items-center justify-center font-mono text-[10px] text-[#161616]/40">words only</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-[#161616]/70">{isToday ? 'Today' : prettyDate(post.scheduled_for)}</span>
            <span className={`text-[9px] uppercase tracking-[0.15em] font-mono font-bold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
            {post.source === 'evergreen' && <span className="text-[9px] uppercase tracking-[0.15em] font-mono text-[#161616]/45">from the bank</span>}
          </div>
          <h3 className="font-sans font-bold text-[#161616] leading-tight">{post.headline ?? 'Being written'}</h3>
          {main ? <p className="font-body text-sm text-[#161616]/70 mt-1 line-clamp-2 whitespace-pre-line">{main}</p> : <p className="font-body text-sm italic text-[#161616]/50 mt-1">The words land in the evening.</p>}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {platforms.map((p) => {
              const r = post.results[p];
              const cls = r?.ok ? 'bg-emerald-100 text-emerald-800 border-emerald-800/25' : r?.pending ? 'bg-white text-[#161616]/60 border-[#161616]/25' : r ? 'bg-red-50 text-[#C4160B] border-[#C4160B]/30' : 'bg-white text-[#161616]/45 border-[#161616]/15';
              const label = r?.ok ? (r.manual ? `${PLATFORM_LABEL[p]} ✓` : `${PLATFORM_LABEL[p]} ✓`) : r?.pending ? `${PLATFORM_LABEL[p]} · by hand` : r ? `${PLATFORM_LABEL[p]} · failed` : PLATFORM_LABEL[p];
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
          {platforms.map((p) => (
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
                <p className="font-body text-sm text-[#161616]/80 whitespace-pre-line bg-white rounded-xl border-2 border-[#161616]/15 px-3 py-2">{post.captions[p] ?? <span className="italic opacity-60">Not written yet.</span>}</p>
              )}
              {post.results[p]?.error && !post.results[p]?.ok && !post.results[p]?.pending && <p className="mt-1 text-xs font-semibold text-[#C4160B]">{post.results[p]?.error}</p>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
