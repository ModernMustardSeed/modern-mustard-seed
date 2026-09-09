'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import PhotoDrop, { type Uploaded } from '@/components/portal/PhotoDrop';
import PlatformPreview from '@/components/posting/PlatformPreview';
import { PLATFORMS, PLATFORM_LABEL, hourFor, type AccountView, type MaterialRow, type Platform, type PlatformStats, type PostRow, type SettingsRow } from '@/lib/posting/types';
import type { GuideSection } from '@/lib/posting/guide';
import { prettyDate, prettyHour } from '@/lib/posting/time';

/**
 * THE POSTING DESK. One row per client on Daily Posting; open one and every
 * lever is on the page: show or hide the calendar from the client, the
 * graphic requests waiting on a person, the days waiting on approval, the
 * queue in their words, the calendar with every platform version shown as
 * the feed will show it, post now, approve, hold, skip, move, say it again,
 * connect by token, the hand-post ticks, and the words for explaining all of
 * it across a table.
 */
type Overview = { settings: SettingsRow; today: { id: string; status: string; headline: string | null } | null; nextPlanned: string | null; queued: number; graphicsWaiting: number; approvalsWaiting: number; connected: Platform[] };
type Lead = { id: string; source: string; sources: string[]; name: string | null; phone: string | null; email: string | null; town: string | null; project_type: string | null; land: string | null; page: string | null; priority: number | null; handled_at: string | null; created_at: string };
type Detail = { settings: SettingsRow; today: string; posts: PostRow[]; materials: MaterialRow[]; accounts: AccountView[]; leads: Lead[]; guide: GuideSection[]; clientGuide: GuideSection[]; env: { x: boolean; linkedin: boolean; google: boolean; facebookApp: boolean } };

const CARD = 'rounded-2xl border-2 border-[#161616] bg-white p-5 shadow-[5px_5px_0_0_#161616]';
const BTN = 'rounded-lg border-2 border-[#161616] bg-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#161616] disabled:opacity-50 hover:-translate-y-0.5 transition-transform';
const BTN_GOLD = BTN.replace('bg-white', 'bg-[#F5B700]');
const BTN_RED = BTN.replace('bg-white', 'bg-[#E0301E]/10');
const BTN_INK = BTN.replace('bg-white', 'bg-[#161616]').replace('text-[#161616]', 'text-white');
const INPUT = 'w-full rounded-lg border-2 border-[#161616]/40 bg-[#FBF6EA] px-3 py-2 text-[14px] text-[#161616] focus:border-[#161616] outline-none';

type Act = (b: Record<string, unknown>, label?: string) => Promise<Record<string, unknown>>;

export default function PostingDesk() {
  const params = useSearchParams();
  const [clients, setClients] = useState<Overview[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [selected, setSelected] = useState<string | null>(params.get('client'));
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/posting${selected ? `?client=${encodeURIComponent(selected)}` : ''}`);
    const j = (await res.json().catch(() => ({}))) as { clients?: Overview[]; detail?: Detail | null; error?: string };
    setClients(j.clients ?? []);
    setDetail(j.detail ?? null);
    if (j.error) setError(j.error);
  }, [selected]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const c = params.get('connect');
    if (!c) return;
    if (c.includes('-ok:')) setNotice(`Connected: ${c.split(':').slice(1).join(':')}`);
    else setError(`Connection: ${c}`);
  }, [params]);

  const act: Act = async (body, label) => {
    setError(null);
    setBusy(label ?? (body.action as string));
    try {
      const res = await fetch('/api/admin/posting', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client: selected, ...body }) });
      const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        setError((j.error as string) ?? 'That did not go through.');
        return j;
      }
      await load();
      return j;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF6EA] text-[#161616]">
      <AdminHeader active="posting" title="Daily Posting" onRefresh={() => void load()} />
      <main className="mx-auto max-w-[86rem] px-5 py-6 md:px-6">
        {error && <p className="mb-3 rounded-xl border-2 border-[#E0301E]/40 bg-[#E0301E]/10 px-4 py-2 text-sm font-semibold text-[#E0301E]">{error}</p>}
        {notice && <p className="mb-3 rounded-xl border-2 border-[#3f5d34]/40 bg-emerald-50 px-4 py-2 text-sm font-semibold text-[#3f5d34]">{notice}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-5">
          <Tile label="Clients posting" value={clients.filter((c) => c.settings.active).length} />
          <Tile label="Out today" value={clients.filter((c) => c.today && ['published', 'partial'].includes(c.today.status)).length} tone="seed" />
          <Tile label="Graphics to make" value={clients.reduce((n, c) => n + c.graphicsWaiting, 0)} tone="red" />
          <Tile label="Awaiting approval" value={clients.reduce((n, c) => n + c.approvalsWaiting, 0)} />
          <Tile label="Queued ahead" value={clients.reduce((n, c) => n + c.queued, 0)} />
        </div>

        {!clients.length && <p className={`${CARD} text-[15px] text-[#161616]/70`}>Nobody is on Daily Posting yet. Run `node scripts/posting-seed-built-right.mjs` for the first client.</p>}

        <div className="space-y-3 mb-8">
          {clients.map((c) => (
            <button key={c.settings.client_email} type="button" onClick={() => setSelected(c.settings.client_email === selected ? null : c.settings.client_email)} className={`w-full text-left ${CARD} ${selected === c.settings.client_email ? 'bg-[#F5B700]/20' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-[20px] font-bold leading-tight">{c.settings.business_name}</h2>
                  <p className="font-mono text-[11px] text-[#161616]/55">{c.settings.client_email} · {c.settings.platforms.map((p) => `${PLATFORM_LABEL[p]} ${prettyHour(hourFor(c.settings, p)).replace(':00', '')}`).join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.12em]">
                  <span className={`rounded-lg border-2 px-2 py-1 ${c.settings.visible ? 'border-[#3f5d34] bg-emerald-50 text-[#3f5d34]' : 'border-[#161616] bg-[#161616] text-white'}`}>{c.settings.visible ? 'Client sees it' : 'Hidden from client'}</span>
                  <span className={`rounded-lg border-2 border-[#161616] px-2 py-1 ${c.today?.status === 'published' ? 'bg-[#F5B700]' : c.today?.status === 'failed' ? 'bg-[#E0301E]/10' : 'bg-white'}`}>Today: {c.today ? c.today.status : 'nothing queued'}</span>
                  {c.graphicsWaiting > 0 && <span className="rounded-lg border-2 border-[#E0301E] bg-[#E0301E]/10 px-2 py-1">{c.graphicsWaiting} graphic{c.graphicsWaiting === 1 ? '' : 's'} to make</span>}
                  {c.approvalsWaiting > 0 && <span className="rounded-lg border-2 border-[#161616] bg-[#F5B700]/40 px-2 py-1">{c.approvalsWaiting} awaiting approval</span>}
                  <span className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1">{c.queued} queued</span>
                  <span className="rounded-lg border-2 border-[#161616] bg-white px-2 py-1">Connected: {c.connected.length ? c.connected.map((p) => PLATFORM_LABEL[p]).join(', ') : 'none'}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {detail && selected && <ClientDetail d={detail} act={act} busy={busy} onNotice={setNotice} client={selected} />}
      </main>
    </div>
  );
}

function ClientDetail({ d, act, busy, onNotice, client }: { d: Detail; act: Act; busy: string | null; onNotice: (s: string) => void; client: string }) {
  const s = d.settings;
  const [fbToken, setFbToken] = useState('');
  const [fbChoices, setFbChoices] = useState<Array<{ id: string; name: string }> | null>(null);
  const [xAccess, setXAccess] = useState('');
  const [xRefresh, setXRefresh] = useState('');
  const [gbpLocations, setGbpLocations] = useState<Array<{ name: string; title: string }> | null>(null);
  const [theirText, setTheirText] = useState('');
  const [theirImage, setTheirImage] = useState<Uploaded | null>(null);
  const [settings, setSettings] = useState<Partial<SettingsRow>>({});
  const [tab, setTab] = useState<'desk' | 'words'>('desk');

  const connectFb = async (pageId?: string) => {
    const j = (await act({ action: 'facebook-token', token: fbToken, pageId }, 'fb')) as { choices?: Array<{ id: string; name: string }> | null; page?: { name: string }; instagram?: { username: string | null } | null };
    if (j.choices) setFbChoices(j.choices);
    else if (j.page) {
      setFbChoices(null);
      setFbToken('');
      onNotice(`Facebook connected: ${j.page.name}${j.instagram ? `, Instagram ${j.instagram.username ? `@${j.instagram.username}` : 'linked'}` : ', no Instagram business account on that Page'}`);
    }
  };

  const saveSettings = async () => {
    const patch: Record<string, unknown> = { ...settings };
    for (const k of ['towns', 'services', 'notify_emails'] as const) if (typeof patch[k] === 'string') patch[k] = (patch[k] as string).split(/\n|,/).map((x) => x.trim()).filter(Boolean);
    await act({ action: 'settings', ...patch }, 'settings');
    setSettings({});
    onNotice('Settings saved.');
  };

  const graphics = d.materials.filter((m) => m.wants_graphic && !m.graphic_done_at);
  const queue = d.materials.filter((m) => m.status === 'fresh' && !m.wants_graphic);
  const upcoming = d.posts.filter((p) => p.scheduled_for >= d.today).sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for));
  const past = d.posts.filter((p) => p.scheduled_for < d.today);

  return (
    <div>
      {/* The switch that matters most, on its own line. */}
      <div className={`${CARD} mb-6 flex flex-wrap items-center justify-between gap-3 ${s.visible ? 'border-[#3f5d34]' : ''}`}>
        <div>
          <p className="font-display text-[18px] font-bold">{s.visible ? `${s.business_name} can see their calendar` : `Hidden from ${s.business_name}`}</p>
          <p className="text-[13px] text-[#161616]/65">{s.visible ? 'The Daily Posting tile is on their portal and /portal/posting answers. Monday notes and Friday nudges go to them.' : 'Nothing about Daily Posting shows in their portal, and no email about it reaches them. The engine runs underneath; you can queue their words and watch it here until it is perfect.'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`${BTN} flex-none`} onClick={() => setTab(tab === 'desk' ? 'words' : 'desk')}>{tab === 'desk' ? 'The words for them' : 'Back to the desk'}</button>
          <button type="button" className={`${s.visible ? BTN_RED : BTN_INK} flex-none`} disabled={!!busy} onClick={() => void act({ action: 'settings', visible: !s.visible }, 'visible')}>{s.visible ? 'Hide from the client' : 'Show to the client'}</button>
        </div>
      </div>

      {tab === 'words' ? (
        <WordsPanel guide={d.guide} clientGuide={d.clientGuide} business={s.business_name} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {graphics.length > 0 && (
              <section className={`${CARD} border-[#E0301E]`}>
                <h3 className="font-display text-[18px] font-bold mb-1">Graphics to make ({graphics.length})</h3>
                <p className="text-[12px] text-[#161616]/65 mb-3">Their words and what they pictured. Make it, drop it here, and the day releases with the image on.</p>
                <div className="space-y-4">
                  {graphics.map((m) => <GraphicRequest key={m.id} m={m} act={act} busy={busy} client={client} />)}
                </div>
              </section>
            )}

            <section>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-[18px] font-bold">Calendar</h3>
                <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'plan' }, 'plan')}>Give the queue its days</button>
              </div>
              <div className="space-y-3">
                {upcoming.map((p) => <AdminPost key={p.id} p={p} s={s} today={d.today} act={act} busy={busy} material={d.materials.find((m) => m.id === p.material_id) ?? null} />)}
                {upcoming.length === 0 && <p className={`${CARD} text-sm text-[#161616]/60`}>Nothing queued ahead. Their next post lands here the moment they type it, or the moment you enter it for them.</p>}
              </div>
              {past.length > 0 && (
                <>
                  <h4 className="mt-6 mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">Past three weeks</h4>
                  <div className="space-y-3">{past.map((p) => <AdminPost key={p.id} p={p} s={s} today={d.today} act={act} busy={busy} material={d.materials.find((m) => m.id === p.material_id) ?? null} />)}</div>
                </>
              )}
            </section>

            <section className={CARD}>
              <h3 className="font-display text-[18px] font-bold mb-2">Leads from the site</h3>
              {d.leads.length === 0 ? (
                <p className="text-sm text-[#161616]/60">None yet. Every form and the chat on their site post to /api/client-lead.</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead><tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#161616]/55 text-left"><th className="py-1 pr-3">When</th><th className="py-1 pr-3">P</th><th className="py-1 pr-3">Who</th><th className="py-1 pr-3">Through</th><th className="py-1 pr-3">Town</th><th className="py-1">Called</th></tr></thead>
                  <tbody>
                    {d.leads.map((l) => (
                      <tr key={l.id} className="border-t border-[#161616]/10 align-top">
                        <td className="py-1.5 pr-3 whitespace-nowrap font-mono text-[11px]">{new Date(l.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                        <td className="py-1.5 pr-3 font-mono font-bold">{l.priority ?? '·'}</td>
                        <td className="py-1.5 pr-3"><strong>{l.name ?? 'No name'}</strong><br /><span className="text-[#161616]/60">{l.phone ?? l.email ?? ''}</span></td>
                        <td className="py-1.5 pr-3">{(l.sources?.length ? l.sources : [l.source]).join(' → ')}</td>
                        <td className="py-1.5 pr-3">{l.town ?? ''}</td>
                        <td className="py-1.5 font-mono text-[11px]">{l.handled_at ? 'yes' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className={CARD}>
              <h3 className="font-display text-[18px] font-bold mb-3">Accounts</h3>
              <ul className="space-y-3">
                {d.accounts.filter((a) => s.platforms.includes(a.provider)).map((a) => (
                  <li key={a.provider} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{PLATFORM_LABEL[a.provider]}</span>
                      <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${a.connected ? 'text-[#3f5d34]' : 'text-[#161616]/45'}`}>{a.connected ? 'connected' : a.manualOnly ? 'by hand' : a.status === 'revoked' ? 'dropped' : 'not yet'}</span>
                    </div>
                    {a.accountName && <p className="font-mono text-[11px] text-[#161616]/60">{a.accountName}</p>}
                    {a.error && <p className="text-[12px] text-[#E0301E]">{a.error}</p>}
                    {!a.connected && a.needs && !a.manualOnly && <p className="text-[12px] text-[#161616]/60">Needs {a.needs}</p>}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {a.connected && <button type="button" className={BTN} onClick={() => void act({ action: 'disconnect', platform: a.provider })}>Disconnect</button>}
                      {!a.connected && a.provider === 'x' && d.env.x && <a className={BTN_GOLD} href={`/api/oauth/x/start?client=${encodeURIComponent(client)}`}>Connect X as them</a>}
                      {!a.connected && a.provider === 'linkedin' && d.env.linkedin && <a className={BTN_GOLD} href={`/api/oauth/linkedin/start?client=${encodeURIComponent(client)}`}>Connect LinkedIn</a>}
                      {a.provider === 'gbp' && d.env.google && (
                        <button type="button" className={BTN} disabled={!!busy} onClick={async () => { const j = (await act({ action: 'gbp-locations' })) as { locations?: Array<{ name: string; title: string }> }; if (j.locations) setGbpLocations(j.locations); }}>Pick the location</button>
                      )}
                    </div>
                    {a.provider === 'gbp' && gbpLocations && (
                      <ul className="mt-2 space-y-1">
                        {gbpLocations.map((l) => (
                          <li key={l.name}><button type="button" className={BTN_GOLD} onClick={() => { void act({ action: 'gbp-location', location: l.name, title: l.title }); setGbpLocations(null); }}>{l.title}</button></li>
                        ))}
                        {gbpLocations.length === 0 && <li className="text-[12px] text-[#161616]/60">No locations on that Google account.</li>}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-5 border-t-2 border-[#161616]/10 pt-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60 mb-1">Facebook and Instagram by token</p>
                <p className="text-[12px] text-[#161616]/65 mb-2">Graph API Explorer, their Page under Page, permissions pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish, read_insights. Generate, extend, paste. Instagram comes with the Page.</p>
                <textarea value={fbToken} onChange={(e) => setFbToken(e.target.value)} rows={2} placeholder="EAAB..." className={INPUT} />
                <button type="button" className={`${BTN_GOLD} mt-2`} disabled={!fbToken.trim() || !!busy} onClick={() => void connectFb()}>Validate and connect</button>
                {fbChoices && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[12px]">That account manages more than one Page. Which one?</p>
                    {fbChoices.map((c) => <button key={c.id} type="button" className={BTN} onClick={() => void connectFb(c.id)}>{c.name}</button>)}
                  </div>
                )}
              </div>

              {!d.accounts.find((a) => a.provider === 'x')?.connected && (
                <div className="mt-5 border-t-2 border-[#161616]/10 pt-4">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60 mb-1">X by pasted tokens</p>
                  <p className="text-[12px] text-[#161616]/65 mb-2">From the X developer portal, an OAuth 2.0 user access token for their account (tweet.write, media.write, offline.access). The refresh token keeps it alive.</p>
                  <input value={xAccess} onChange={(e) => setXAccess(e.target.value)} placeholder="access token" className={INPUT} />
                  <input value={xRefresh} onChange={(e) => setXRefresh(e.target.value)} placeholder="refresh token (optional)" className={`${INPUT} mt-2`} />
                  <button type="button" className={`${BTN_GOLD} mt-2`} disabled={!xAccess.trim() || !!busy} onClick={async () => { const j = (await act({ action: 'x-tokens', access: xAccess, refresh: xRefresh || null })) as { username?: string }; if (j.username) { setXAccess(''); setXRefresh(''); onNotice(`X connected as @${j.username}`); } }}>Validate and connect</button>
                </div>
              )}
            </section>

            <section className={CARD}>
              <h3 className="font-display text-[18px] font-bold mb-1">Enter a post for them</h3>
              <p className="text-[12px] text-[#161616]/65 mb-2">Their words as they gave them: a text, a call, a note. Not ours.</p>
              <textarea value={theirText} onChange={(e) => setTheirText(e.target.value)} rows={4} placeholder="What they want said" className={`${INPUT} mb-2`} />
              {theirImage ? (
                <div className="flex items-center gap-2 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={theirImage.url} alt="" className="h-14 w-14 rounded-lg border-2 border-[#161616] object-cover" />
                  <button type="button" className={BTN} onClick={() => setTheirImage(null)}>Remove</button>
                </div>
              ) : (
                <PhotoDrop compact client={client} label="Their photo or graphic (optional)" onUploaded={async (files: Uploaded[]) => setTheirImage(files[0] ?? null)} />
              )}
              <button type="button" className={`${BTN_GOLD} mt-2`} disabled={theirText.trim().length < 3 || !!busy} onClick={async () => { await act({ action: 'post', text: theirText, url: theirImage?.url ?? null }); setTheirText(''); setTheirImage(null); }}>Queue it</button>
              {queue.length > 0 && (
                <div className="mt-3 border-t-2 border-[#161616]/10 pt-3">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60 mb-1">Waiting for a day ({queue.length})</p>
                  {queue.map((m) => <p key={m.id} className="text-[12px] text-[#161616]/75 truncate">· {m.text}</p>)}
                </div>
              )}
            </section>

            <section className={CARD}>
              <h3 className="font-display text-[18px] font-bold mb-2">The brief for the editor</h3>
              <Field label="Business name"><input defaultValue={s.business_name} onChange={(e) => setSettings((v) => ({ ...v, business_name: e.target.value }))} className={INPUT} /></Field>
              <Field label="Site"><input defaultValue={s.site_url ?? ''} onChange={(e) => setSettings((v) => ({ ...v, site_url: e.target.value || null }))} className={INPUT} /></Field>
              <Field label="Phone"><input defaultValue={s.phone ?? ''} onChange={(e) => setSettings((v) => ({ ...v, phone: e.target.value || null }))} className={INPUT} /></Field>
              <Field label="Towns, lead towns first (one per line)"><textarea defaultValue={s.towns.join('\n')} rows={3} onChange={(e) => setSettings((v) => ({ ...v, towns: e.target.value as unknown as string[] }))} className={INPUT} /></Field>
              <Field label="How they talk"><textarea defaultValue={s.tone ?? ''} rows={2} onChange={(e) => setSettings((v) => ({ ...v, tone: e.target.value || null }))} className={INPUT} /></Field>
              <Field label="Hard rules"><textarea defaultValue={s.hard_nos ?? ''} rows={3} onChange={(e) => setSettings((v) => ({ ...v, hard_nos: e.target.value || null }))} className={INPUT} /></Field>
              <Field label="Platforms">
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => {
                    const on = (settings.platforms ?? s.platforms).includes(p);
                    return (
                      <button key={p} type="button" onClick={() => setSettings((v) => { const cur = v.platforms ?? s.platforms; return { ...v, platforms: on ? cur.filter((x) => x !== p) : [...cur, p] }; })} className={on ? BTN_GOLD : BTN}>{PLATFORM_LABEL[p]}</button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Hour per platform, Mountain">
                <div className="grid grid-cols-2 gap-2">
                  {s.platforms.map((p) => (
                    <label key={p} className="flex items-center justify-between gap-2 text-[12px]">
                      <span>{PLATFORM_LABEL[p]}</span>
                      <select defaultValue={hourFor(s, p)} onChange={(e) => setSettings((v) => ({ ...v, platform_hours: { ...(v.platform_hours ?? s.platform_hours), [p]: Number(e.target.value) } }))} className="rounded border border-[#161616]/40 bg-white px-1 py-0.5 font-mono text-[11px]">
                        {Array.from({ length: 24 }, (_, h) => h).map((h) => <option key={h} value={h}>{prettyHour(h)}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </Field>
              <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" defaultChecked={s.approve_first} onChange={(e) => setSettings((v) => ({ ...v, approve_first: e.target.checked }))} /> Approve first: every day holds until they tap Approve</label>
              <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" defaultChecked={s.weekly_summary} onChange={(e) => setSettings((v) => ({ ...v, weekly_summary: e.target.checked }))} /> Monday note to the client</label>
              <Field label="Monday note to (one per line, blank = the client)"><textarea defaultValue={s.notify_emails.join('\n')} rows={2} onChange={(e) => setSettings((v) => ({ ...v, notify_emails: e.target.value as unknown as string[] }))} className={INPUT} /></Field>
              <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" defaultChecked={s.active} onChange={(e) => setSettings((v) => ({ ...v, active: e.target.checked }))} /> Active</label>
              <button type="button" className={BTN_GOLD} disabled={!Object.keys(settings).length || !!busy} onClick={() => void saveSettings()}>Save the brief</button>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}

function WordsPanel({ guide, clientGuide, business }: { guide: GuideSection[]; clientGuide: GuideSection[]; business: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className={CARD}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4160B] mb-1">For you</p>
        <h3 className="font-display text-[20px] font-bold mb-3">How to hold this across a table</h3>
        {guide.map((sec) => (
          <div key={sec.title} className="mb-4">
            <p className="font-sans text-[14px] font-bold mb-1">{sec.title}</p>
            <ul className="space-y-1.5">
              {sec.lines.map((l, i) => <li key={i} className="pl-3 border-l-2 border-[#F5B700] text-[13.5px] leading-snug text-[#161616]/80">{l}</li>)}
            </ul>
          </div>
        ))}
      </section>
      <section className={CARD}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#C4160B] mb-1">What {business} reads</p>
        <h3 className="font-display text-[20px] font-bold mb-3">The How it works card, word for word</h3>
        {clientGuide.map((sec) => (
          <div key={sec.title} className="mb-4">
            <p className="font-sans text-[14px] font-bold mb-1">{sec.title}</p>
            <ul className="space-y-1.5">
              {sec.lines.map((l, i) => <li key={i} className="pl-3 border-l-2 border-[#161616]/20 text-[13.5px] leading-snug text-[#161616]/80">{l}</li>)}
            </ul>
          </div>
        ))}
        <p className="mt-2 text-[12px] text-[#161616]/55">This copy lives in lib/posting/guide.ts and follows the brief: hours and approval mode change the lines on their own.</p>
      </section>
    </div>
  );
}

function GraphicRequest({ m, act, busy, client }: { m: MaterialRow; act: Act; busy: string | null; client: string }) {
  const [url, setUrl] = useState('');
  return (
    <div className="rounded-xl border-2 border-[#161616]/20 bg-[#FBF6EA] p-4">
      <p className="text-[14px] whitespace-pre-line">{m.text}</p>
      {m.graphic_brief && <p className="mt-2 text-[13px]"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#C4160B] font-bold">They pictured: </span>{m.graphic_brief}</p>}
      <p className="mt-1 font-mono text-[10px] text-[#161616]/50">asked {new Date(m.created_at).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <PhotoDrop compact client={client} label="Drop the finished graphic" onUploaded={async (files: Uploaded[]) => { if (files[0]) await act({ action: 'graphic', id: m.id, url: files[0].url }, 'graphic'); }} />
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="or paste a public image URL" className={INPUT} />
          <button type="button" className={BTN_GOLD} disabled={!/^https:\/\//.test(url) || !!busy} onClick={() => void act({ action: 'graphic', id: m.id, url }, 'graphic')}>Attach</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ st }: { st: PlatformStats | undefined }) {
  if (!st) return null;
  const bits = [st.reach != null ? `${st.reach} reached` : null, st.likes != null ? `${st.likes} likes` : null, st.comments ? `${st.comments} comments` : null, st.shares ? `${st.shares} shares` : null, st.saves ? `${st.saves} saves` : null].filter(Boolean);
  return bits.length ? <p className="mt-1 font-mono text-[10px] text-[#161616]/55">{bits.join(' · ')}</p> : null;
}

function AdminPost({ p, s, today, act, busy, material }: { p: PostRow; s: SettingsRow; today: string; act: Act; busy: string | null; material: MaterialRow | null }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'text' | 'preview'>('text');
  const [drafts, setDrafts] = useState<Partial<Record<Platform, string>>>({});
  const [links, setLinks] = useState<Partial<Record<Platform, string>>>({});
  const [date, setDate] = useState(p.scheduled_for);
  const locked = ['published', 'publishing'].includes(p.status);
  const platforms = (p.platforms?.length ? p.platforms : s.platforms).filter((pl) => s.platforms.includes(pl));
  const tone = p.status === 'published' ? 'bg-[#F5B700]' : p.status === 'failed' ? 'bg-[#E0301E]/10' : p.status === 'held' ? 'bg-[#E0301E]/10' : 'bg-white';
  const holdNote = p.status === 'held' ? ((p.results as { note?: string }).note ?? 'Held.') : null;
  const awaitingApproval = p.status === 'held' && !p.approved_at && s.approve_first;
  return (
    <div className={CARD}>
      <div className="flex gap-4">
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt="" className="h-20 w-20 shrink-0 rounded-lg border-2 border-[#161616] object-cover" />
        ) : <div className="h-20 w-20 shrink-0 rounded-lg border-2 border-dashed border-[#161616]/30 flex items-center justify-center text-center font-mono text-[9px] text-[#161616]/40 px-1">{p.status === 'held' && !p.approved_at ? 'held' : 'no image'}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]">{p.scheduled_for === today ? 'Today' : prettyDate(p.scheduled_for)}</span>
            <span className={`rounded-lg border-2 border-[#161616] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${tone}`}>{p.status}</span>
            <span className="font-mono text-[10px] text-[#161616]/50">{p.written_by ? `edit: ${p.written_by}` : 'not shaped yet'}{p.edited_by ? ' · hand-edited' : ''}{p.approved_at ? ' · approved' : ''}</span>
          </div>
          <input defaultValue={p.headline ?? ''} placeholder="Headline" onBlur={(e) => e.target.value !== (p.headline ?? '') && void act({ action: 'headline', id: p.id, text: e.target.value })} className="mt-1 w-full bg-transparent font-display text-[17px] font-bold outline-none" />
          {holdNote && <p className="text-[12px] font-semibold text-[#E0301E]">{holdNote}</p>}
          {material?.text && <p className="mt-1 text-[12px] text-[#161616]/60 line-clamp-2 whitespace-pre-line"><span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#C4160B] font-bold">Their words: </span>{material.text}</p>}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {platforms.map((pl) => {
              const r = p.results[pl] as { ok?: boolean; pending?: boolean; url?: string; error?: string } | undefined;
              const cls = r?.ok ? 'bg-[#F5B700] border-[#161616]' : r?.pending ? 'bg-white border-[#161616]/40 text-[#161616]/70' : r ? 'bg-[#E0301E]/10 border-[#E0301E]' : 'bg-white border-[#161616]/20 text-[#161616]/50';
              return (
                <span key={pl} title={r?.error ?? ''} className={`rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${cls}`}>
                  {r?.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{PLATFORM_LABEL[pl]} ↗</a> : PLATFORM_LABEL[pl]}{r?.ok ? ' ✓' : r?.pending ? ' · hand' : r ? ' · failed' : ` · ${prettyHour(hourFor(s, pl)).replace(':00', '')}`}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {awaitingApproval && <button type="button" className={BTN_GOLD} disabled={!!busy} onClick={() => void act({ action: 'approve', id: p.id })}>Approve for them</button>}
        <button type="button" className={BTN} onClick={() => setOpen((v) => !v)}>{open ? 'Close' : 'Open'}</button>
        {!locked && <button type="button" className={BTN_GOLD} disabled={!!busy} onClick={() => void act({ action: 'publish-now', id: p.id }, 'publish')}>Post now, every platform</button>}
        {!locked && p.status !== 'held' && p.status !== 'skipped' && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'hold', id: p.id })}>Hold</button>}
        {(p.status === 'held' || p.status === 'skipped') && !awaitingApproval && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'release', id: p.id })}>Release</button>}
        {!locked && p.status !== 'skipped' && <button type="button" className={BTN_RED} disabled={!!busy} onClick={() => void act({ action: 'skip', id: p.id })}>Skip</button>}
        {!p.captions.facebook && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'words-now', id: p.id }, 'words')}>Shape it now</button>}
        {!locked && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'rewrite', id: p.id })}>Ask Claude to re-edit</button>}
        {['published', 'partial'].includes(p.status) && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'stats', id: p.id })}>Pull the numbers</button>}
        {['published', 'partial'].includes(p.status) && p.scheduled_for < today && <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'repost', id: p.id })}>Say it again</button>}
        {!locked && (
          <span className="ml-auto flex items-center gap-1">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border-2 border-[#161616]/40 bg-white px-2 py-1 font-mono text-[11px]" />
            <button type="button" className={BTN} disabled={date === p.scheduled_for || !!busy} onClick={() => void act({ action: 'reschedule', id: p.id, date })}>Move</button>
          </span>
        )}
      </div>
      {open && (
        <div className="mt-4 border-t-2 border-[#161616]/10 pt-4">
          <div className="flex gap-2 mb-3">
            <button type="button" className={view === 'text' ? BTN_INK : BTN} onClick={() => setView('text')}>The words</button>
            <button type="button" className={view === 'preview' ? BTN_INK : BTN} onClick={() => setView('preview')}>As it will look</button>
          </div>
          <div className={view === 'preview' ? 'grid gap-4 md:grid-cols-2' : 'space-y-3'}>
            {platforms.map((pl) => {
              const r = p.results[pl] as { ok?: boolean; error?: string } | undefined;
              const text = drafts[pl] ?? p.captions[pl] ?? '';
              return (
                <div key={pl}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#C4160B]">{PLATFORM_LABEL[pl]} <span className="text-[#161616]/40">· {prettyHour(hourFor(s, pl))}</span></span>
                    <div className="flex items-center gap-2">
                      <button type="button" className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#1E50C8]" onClick={() => void navigator.clipboard.writeText(p.captions[pl] ?? '')}>Copy</button>
                      {!r?.ok && (
                        <>
                          <input value={links[pl] ?? ''} onChange={(e) => setLinks((v) => ({ ...v, [pl]: e.target.value }))} placeholder="live link (optional)" className="w-44 rounded border border-[#161616]/40 px-2 py-0.5 font-mono text-[10px]" />
                          <button type="button" className={BTN} disabled={!!busy} onClick={() => void act({ action: 'mark-manual', id: p.id, platform: pl, url: links[pl] || null })}>Posted by hand</button>
                        </>
                      )}
                    </div>
                  </div>
                  {view === 'preview' && text ? (
                    <div className="mt-1"><PlatformPreview platform={pl} business={s.business_name} text={text} imageUrl={p.image_url} link={p.link} /></div>
                  ) : (
                    <textarea
                      value={text}
                      onChange={(e) => setDrafts((v) => ({ ...v, [pl]: e.target.value }))}
                      onBlur={() => drafts[pl] != null && drafts[pl] !== (p.captions[pl] ?? '') && void act({ action: 'caption', id: p.id, platform: pl, text: drafts[pl] })}
                      rows={pl === 'x' ? 2 : 4}
                      disabled={locked}
                      className={`${INPUT} mt-1 font-body`}
                    />
                  )}
                  {p.notes?.[pl] && <p className="mt-1 text-[11px] italic text-[#161616]/55">{p.notes[pl]}</p>}
                  <Stat st={p.stats?.[pl]} />
                  {r?.error && !r.ok && <p className="mt-1 text-[12px] font-semibold text-[#E0301E]">{r.error}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#161616]/60">{label}</span>
      {children}
    </label>
  );
}

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'seed' | 'red' | 'ink' }) {
  return (
    <div className={`rounded-xl border-2 border-[#161616] p-3.5 ${tone === 'seed' ? 'bg-[#F5B700]' : 'bg-white'}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#161616]/60">{label}</p>
      <p className={`mt-1 font-display text-3xl font-extrabold leading-none ${tone === 'red' && value > 0 ? 'text-[#E0301E]' : ''}`}>{value}</p>
    </div>
  );
}
